import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Dumbbell, Clock, Flame, TrendingUp, Calendar, Sparkles, Loader2, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface TrainingLoadEntry {
  id: string;
  athlete_id: string;
  log_date: string;
  session_type: string;
  duration_minutes: number;
  intensity: number;
  rpe: number | null;
  load_score: number;
  notes: string | null;
  athletes?: { name: string } | null;
}

interface TrainingAnalysis {
  loadStatus: string;
  injuryRiskLevel: string;
  acuteChronicAssessment: string;
  immediateActions: string[];
  recoveryRecommendations: string[];
  overallSummary: string;
  weeklyPlanSuggestions?: Array<{
    day: string;
    sessionType: string;
    duration: number;
    intensity: string;
  }>;
  computedMetrics?: {
    acuteChronicRatio: number;
    totalSessions: number;
    avgDuration: number;
    avgIntensity: number;
  };
}

export default function TrainingLoad() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TrainingLoadEntry[]>([]);
  const [athletes, setAthletes] = useState<{ id: string; name: string; sport: string; fitness_level: string | null; training_hours_per_week: number | null }[]>([]);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TrainingAnalysis | null>(null);

  const [formData, setFormData] = useState({
    athlete_id: "",
    log_date: format(new Date(), "yyyy-MM-dd"),
    session_type: "",
    duration_minutes: "",
    intensity: "",
    rpe: "",
    notes: "",
  });

  const sessionTypes = [
    "Strength Training",
    "Cardio",
    "Sport-Specific",
    "Recovery Session",
    "Practice/Game",
    "Rehabilitation",
    "Flexibility/Mobility",
  ];

  useEffect(() => {
    loadEntries();
    loadAthletes();
    loadInjuries();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("training_load")
      .select(`*, athletes(name)`)
      .order("log_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error loading training load:", error);
    } else {
      setEntries(data || []);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase.from("athletes").select("id, name, sport, fitness_level, training_hours_per_week");
    setAthletes(data || []);
  };

  const loadInjuries = async () => {
    const { data } = await supabase
      .from("injuries")
      .select("*")
      .eq("status", "active");
    setInjuries(data || []);
  };

  const handleAIAnalysis = async () => {
    if (!selectedAthlete) {
      toast.error("Please select an athlete first");
      return;
    }

    const athlete = athletes.find(a => a.id === selectedAthlete);
    if (!athlete) return;

    const athleteEntries = entries.filter(e => e.athlete_id === selectedAthlete);
    if (athleteEntries.length < 3) {
      toast.error("Need at least 3 training sessions for analysis");
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const activeInjury = injuries.find(i => i.athlete_id === selectedAthlete);

      const response = await supabase.functions.invoke("analyze-training-load", {
        body: {
          athlete: {
            name: athlete.name || "Athlete",
            sport: athlete.sport,
            fitnessLevel: athlete.fitness_level,
            trainingHoursTarget: athlete.training_hours_per_week,
          },
          trainingSessions: athleteEntries.slice(0, 28).map(e => ({
            date: e.log_date,
            duration: e.duration_minutes,
            intensity: e.intensity,
            rpe: e.rpe,
            sessionType: e.session_type,
            loadScore: e.load_score,
          })),
          injuryContext: {
            hasActiveInjury: !!activeInjury,
            injuryType: activeInjury?.injury_type,
            injuryLocation: activeInjury?.body_location,
            severity: activeInjury?.severity,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Analysis failed");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setAnalysis(response.data as TrainingAnalysis);
      toast.success("AI analysis complete");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getLoadStatusColor = (status: string) => {
    switch (status) {
      case "undertraining": return "bg-blue-500/20 text-blue-500";
      case "optimal": return "bg-success/20 text-success";
      case "overreaching": return "bg-warning/20 text-warning";
      case "overtraining": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-success/20 text-success";
      case "moderate": return "bg-warning/20 text-warning";
      case "high": return "bg-destructive/20 text-destructive";
      case "very_high": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    const { error } = await supabase.from("training_load").insert({
      athlete_id: formData.athlete_id,
      log_date: formData.log_date,
      session_type: formData.session_type,
      duration_minutes: parseInt(formData.duration_minutes),
      intensity: parseInt(formData.intensity),
      rpe: formData.rpe ? parseInt(formData.rpe) : null,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error(`Failed to log training: ${error.message}`);
    } else {
      toast.success("Training logged");
      setIsOpen(false);
      loadEntries();
      setFormData({
        athlete_id: "",
        log_date: format(new Date(), "yyyy-MM-dd"),
        session_type: "",
        duration_minutes: "",
        intensity: "",
        rpe: "",
        notes: "",
      });
    }
  };

  const getChartData = () => {
    const last14Days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date(),
    });

    const filteredEntries = selectedAthlete
      ? entries.filter((e) => e.athlete_id === selectedAthlete)
      : entries;

    return last14Days.map((date) => {
      const dayEntries = filteredEntries.filter(
        (e) => format(parseISO(e.log_date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      );
      const totalLoad = dayEntries.reduce((sum, e) => sum + e.load_score, 0);
      const totalDuration = dayEntries.reduce((sum, e) => sum + e.duration_minutes, 0);

      return {
        date: format(date, "MMM d"),
        load: totalLoad,
        duration: totalDuration,
      };
    });
  };

  const getWeeklyStats = () => {
    const last7Days = entries.filter((e) => {
      const date = parseISO(e.log_date);
      return date >= subDays(new Date(), 7);
    });

    const filteredEntries = selectedAthlete
      ? last7Days.filter((e) => e.athlete_id === selectedAthlete)
      : last7Days;

    const totalLoad = filteredEntries.reduce((sum, e) => sum + e.load_score, 0);
    const totalDuration = filteredEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
    const avgIntensity = filteredEntries.length
      ? filteredEntries.reduce((sum, e) => sum + e.intensity, 0) / filteredEntries.length
      : 0;

    return {
      totalLoad,
      totalDuration,
      avgIntensity: avgIntensity.toFixed(1),
      sessions: filteredEntries.length,
    };
  };

  const stats = getWeeklyStats();
  const chartData = getChartData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Training Load</h1>
          <p className="text-muted-foreground">Track and monitor athlete training intensity</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Log Training
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Training Session</DialogTitle>
              <DialogDescription>Record a training session for an athlete</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Athlete</Label>
                  <Select value={formData.athlete_id} onValueChange={(v) => setFormData({ ...formData, athlete_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                    <SelectContent>
                      {athletes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name || "Unnamed Athlete"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formData.log_date} onChange={(e) => setFormData({ ...formData, log_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Session Type</Label>
                <Select value={formData.session_type} onValueChange={(v) => setFormData({ ...formData, session_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {sessionTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" min="1" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Intensity (1-10)</Label>
                  <Input type="number" min="1" max="10" value={formData.intensity} onChange={(e) => setFormData({ ...formData, intensity: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>RPE (1-10)</Label>
                  <Input type="number" min="1" max="10" value={formData.rpe} onChange={(e) => setFormData({ ...formData, rpe: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Log Training</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Athlete Filter + AI Analysis */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <Label>Filter by Athlete:</Label>
          <Select value={selectedAthlete || "all"} onValueChange={(v) => { setSelectedAthlete(v === "all" ? "" : v); setAnalysis(null); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Athletes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Athletes</SelectItem>
              {athletes.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name || "Unnamed Athlete"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedAthlete && (
          <Button 
            onClick={handleAIAnalysis} 
            disabled={isAnalyzing}
            className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI Training Analysis
              </>
            )}
          </Button>
        )}
      </div>

      {/* AI Analysis Results */}
      {analysis && (
        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Training Analysis</CardTitle>
            </div>
            <CardDescription>ML-powered insights based on your training data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Load Status:</span>
                <Badge className={getLoadStatusColor(analysis.loadStatus)}>{analysis.loadStatus.replace("_", " ")}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Injury Risk:</span>
                <Badge className={getRiskColor(analysis.injuryRiskLevel)}>{analysis.injuryRiskLevel.replace("_", " ")}</Badge>
              </div>
              {analysis.computedMetrics && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">A:C Ratio:</span>
                  <Badge variant="outline">{analysis.computedMetrics.acuteChronicRatio.toFixed(2)}</Badge>
                </div>
              )}
            </div>

            {/* Acute:Chronic Assessment */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Workload Assessment</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.acuteChronicAssessment}</p>
            </div>

            {/* Immediate Actions */}
            {analysis.immediateActions && analysis.immediateActions.length > 0 && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="font-medium text-sm">Immediate Actions</span>
                </div>
                <ul className="space-y-1">
                  {analysis.immediateActions.map((action, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-warning">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recovery Recommendations */}
            {analysis.recoveryRecommendations && analysis.recoveryRecommendations.length > 0 && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium text-sm">Recovery Recommendations</span>
                </div>
                <ul className="space-y-1">
                  {analysis.recoveryRecommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-success">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weekly Plan Suggestions */}
            {analysis.weeklyPlanSuggestions && analysis.weeklyPlanSuggestions.length > 0 && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Suggested Weekly Plan</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {analysis.weeklyPlanSuggestions.map((day, idx) => (
                    <div key={idx} className="p-2 bg-background rounded border text-center">
                      <p className="text-xs font-medium">{day.day}</p>
                      <p className="text-xs text-muted-foreground">{day.sessionType}</p>
                      <p className="text-xs text-primary">{day.duration}min • {day.intensity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Summary</p>
              <p className="text-sm text-muted-foreground">{analysis.overallSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Load</CardTitle>
            <Flame className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLoad}</div>
            <p className="text-xs text-muted-foreground">Intensity × Duration</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDuration} min</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Intensity</CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgIntensity}/10</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Dumbbell className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessions}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Training Load (14 Days)</CardTitle>
            <CardDescription>Daily training load score</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="load" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Training Duration (14 Days)</CardTitle>
            <CardDescription>Daily training minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="duration" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Latest training log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{entry.athletes?.name || "Unknown Athlete"}</p>
                  <p className="text-sm text-muted-foreground">{entry.session_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{entry.load_score} load</p>
                  <p className="text-xs text-muted-foreground">{entry.duration_minutes} min @ {entry.intensity}/10</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(entry.log_date), "MMM d")}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}