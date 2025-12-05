import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Activity, Calendar, Target, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface RehabPlan {
  id: string;
  plan_name: string;
  description: string;
  start_date: string;
  target_end_date: string;
  actual_end_date: string | null;
  status: string;
  exercises: any;
  athlete_id: string;
  athletes: {
    name: string;
  };
  injuries: {
    injury_type: string;
    body_location: string;
  };
}

interface RehabProgress {
  id: string;
  progress_date: string;
  completion_percentage: number;
  pain_level: number;
  notes: string;
}

export default function Rehabilitation() {
  const { user } = useAuth();
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<RehabPlan | null>(null);
  const [progress, setProgress] = useState<RehabProgress[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    athlete_id: "",
    injury_id: "",
    plan_name: "",
    description: "",
    start_date: "",
    target_end_date: "",
    exercises: "",
  });

  const [progressData, setProgressData] = useState({
    completion_percentage: "",
    pain_level: "",
    notes: "",
  });

  useEffect(() => {
    loadRehabPlans();
    loadAthletes();
    loadInjuries();
  }, []);

  const loadRehabPlans = async () => {
    const { data, error } = await supabase
      .from("rehab_plans")
      .select(`
        id,
        plan_name,
        description,
        start_date,
        target_end_date,
        actual_end_date,
        status,
        exercises,
        athlete_id,
        athletes(name),
        injuries(injury_type, body_location)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading rehab plans:", error);
      toast.error("Failed to load rehab plans");
    } else {
      setRehabPlans(data as any || []);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase
      .from("athletes")
      .select("id, name");
    setAthletes(data || []);
  };

  const loadInjuries = async () => {
    const { data } = await supabase
      .from("injuries")
      .select("id, injury_type, body_location, athlete_id")
      .eq("status", "active");
    setInjuries(data || []);
  };

  const loadProgress = async (planId: string, athleteId: string) => {
    const { data } = await supabase
      .from("rehab_progress")
      .select("*")
      .eq("rehab_plan_id", planId)
      .order("progress_date", { ascending: false });
    setProgress(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("You must be logged in to create a rehab plan");
      return;
    }

    let exercises = null;
    if (formData.exercises) {
      try {
        exercises = formData.exercises.split(",").map(ex => ({ name: ex.trim(), sets: 3, reps: 10 }));
      } catch {
        exercises = [{ name: formData.exercises, sets: 3, reps: 10 }];
      }
    }

    const { error } = await supabase.from("rehab_plans").insert({
      athlete_id: formData.athlete_id,
      injury_id: formData.injury_id,
      plan_name: formData.plan_name,
      description: formData.description,
      start_date: formData.start_date,
      target_end_date: formData.target_end_date,
      exercises: exercises,
      created_by: user.id,
      status: "planned",
    });

    if (error) {
      console.error("Insert error:", error);
      toast.error(`Failed to create rehab plan: ${error.message}`);
    } else {
      toast.success("Rehab plan created successfully");
      setIsOpen(false);
      loadRehabPlans();
      setFormData({
        athlete_id: "",
        injury_id: "",
        plan_name: "",
        description: "",
        start_date: "",
        target_end_date: "",
        exercises: "",
      });
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (!user?.id) {
      toast.error("You must be logged in to log progress");
      return;
    }

    // Get the athlete_id from the selected plan
    const planAthleteId = (selectedPlan as any).athlete_id;

    const { error } = await supabase.from("rehab_progress").insert({
      rehab_plan_id: selectedPlan.id,
      athlete_id: planAthleteId,
      progress_date: new Date().toISOString().split("T")[0],
      completion_percentage: parseFloat(progressData.completion_percentage),
      pain_level: parseInt(progressData.pain_level),
      notes: progressData.notes,
    });

    if (error) {
      console.error("Insert error:", error);
      toast.error(`Failed to log progress: ${error.message}`);
    } else {
      toast.success("Progress logged successfully");
      setIsProgressOpen(false);
      if (selectedPlan) {
        loadProgress(selectedPlan.id, "");
      }
      setProgressData({ completion_percentage: "", pain_level: "", notes: "" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned": return "bg-muted text-muted-foreground";
      case "in_progress": return "bg-primary text-primary-foreground";
      case "completed": return "bg-success text-success-foreground";
      case "paused": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filteredInjuries = injuries.filter(inj => inj.athlete_id === formData.athlete_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Rehabilitation</h1>
          <p className="text-muted-foreground">Manage rehabilitation plans and track progress</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Rehab Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Rehabilitation Plan</DialogTitle>
              <DialogDescription>Set up a new rehabilitation program for an athlete</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Athlete</Label>
                  <Select value={formData.athlete_id} onValueChange={(v) => setFormData({ ...formData, athlete_id: v, injury_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                    <SelectContent>
                      {athletes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name || "Unnamed Athlete"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Related Injury</Label>
                  <Select value={formData.injury_id} onValueChange={(v) => setFormData({ ...formData, injury_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select injury" /></SelectTrigger>
                    <SelectContent>
                      {filteredInjuries.map((inj) => (
                        <SelectItem key={inj.id} value={inj.id}>{inj.injury_type} - {inj.body_location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input value={formData.plan_name} onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Target End Date</Label>
                  <Input type="date" value={formData.target_end_date} onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Exercises (comma-separated)</Label>
                <Input value={formData.exercises} onChange={(e) => setFormData({ ...formData, exercises: e.target.value })} placeholder="e.g., Stretching, Squats, Leg Press" />
              </div>
              <Button type="submit" className="w-full">Create Plan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rehabPlans.map((plan) => (
          <Card key={plan.id} className="shadow-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedPlan(plan); loadProgress(plan.id, ""); }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                <Badge className={getStatusColor(plan.status)}>{plan.status}</Badge>
              </div>
              <CardDescription>{plan.athletes?.name || "Unknown Athlete"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>{plan.injuries?.injury_type} - {plan.injuries?.body_location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.target_end_date).toLocaleDateString()}</span>
              </div>
              {plan.exercises && (
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{Array.isArray(plan.exercises) ? plan.exercises.length : 0} exercises</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.plan_name}</DialogTitle>
            <DialogDescription>{selectedPlan?.description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Exercises */}
            {selectedPlan?.exercises && Array.isArray(selectedPlan.exercises) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exercises</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedPlan.exercises.map((ex: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span>{ex.name} - {ex.sets}x{ex.reps}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Progress History</CardTitle>
                <Button size="sm" onClick={() => setIsProgressOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Log Progress
                </Button>
              </CardHeader>
              <CardContent>
                {progress.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No progress logged yet</p>
                ) : (
                  <div className="space-y-4">
                    {progress.map((p) => (
                      <div key={p.id} className="border-b pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{new Date(p.progress_date).toLocaleDateString()}</span>
                          <span className="text-sm text-muted-foreground">Pain: {p.pain_level}/10</span>
                        </div>
                        <Progress value={p.completion_percentage} className="h-2" />
                        <p className="text-sm text-muted-foreground mt-2">{p.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Progress Dialog */}
      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Progress</DialogTitle>
            <DialogDescription>Record today's rehabilitation progress</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProgressSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Completion % (0-100)</Label>
              <Input type="number" min="0" max="100" value={progressData.completion_percentage} onChange={(e) => setProgressData({ ...progressData, completion_percentage: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Pain Level (0-10)</Label>
              <Input type="number" min="0" max="10" value={progressData.pain_level} onChange={(e) => setProgressData({ ...progressData, pain_level: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={progressData.notes} onChange={(e) => setProgressData({ ...progressData, notes: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">Save Progress</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
