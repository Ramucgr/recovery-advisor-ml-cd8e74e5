import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Activity, Calendar, Target, CheckCircle2, Dumbbell, Clock, X, Search, Circle, Check, History, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { CompletionHistory } from "@/components/CompletionHistory";
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
  athletes: { name: string } | null;
  injuries: { injury_type: string; body_location: string } | null;
}

interface RehabProgress {
  id: string;
  progress_date: string;
  completion_percentage: number;
  pain_level: number;
  notes: string;
}

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  category: string;
  body_part: string;
  difficulty: string;
  sets_recommended: number | null;
  reps_recommended: number | null;
  duration_seconds: number | null;
  instructions: string[] | null;
}

interface PlanExercise {
  id: string;
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  notes: string | null;
  exercise_library: Exercise;
}

interface ExerciseCompletion {
  id: string;
  plan_exercise_id: string;
  session_date: string;
  completed_at: string;
  sets_completed: number | null;
  reps_completed: number | null;
  pain_level: number | null;
  notes: string | null;
}

interface AIExerciseRecommendation {
  recommendedExercises: Array<{
    exerciseName: string;
    priority: string;
    setsRecommended?: number;
    repsRecommended?: number;
    frequency?: string;
    notes: string;
  }>;
  exercisesToAvoid: string[];
  progressionPlan: string;
  warningsSigns: string[];
  overallGuidance: string;
}
export default function Rehabilitation() {
  const { user } = useAuth();
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [athletes, setAthletes] = useState<{ id: string; name: string; sport?: string; fitness_level?: string | null }[]>([]);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<RehabPlan | null>(null);
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);
  const [progress, setProgress] = useState<RehabProgress[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<ExerciseCompletion[]>([]);
  const [allCompletions, setAllCompletions] = useState<ExerciseCompletion[]>([]);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIExerciseRecommendation | null>(null);

  const [formData, setFormData] = useState({
    athlete_id: "",
    injury_id: "",
    plan_name: "",
    description: "",
    start_date: "",
    target_end_date: "",
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
    loadExerciseLibrary();
  }, []);

  const loadRehabPlans = async () => {
    const { data, error } = await supabase
      .from("rehab_plans")
      .select(`
        id, plan_name, description, start_date, target_end_date,
        actual_end_date, status, exercises, athlete_id,
        athletes(name), injuries(injury_type, body_location)
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
    const { data } = await supabase.from("athletes").select("id, name, sport, fitness_level");
    setAthletes(data || []);
  };

  const loadInjuries = async () => {
    const { data } = await supabase
      .from("injuries")
      .select("id, injury_type, body_location, athlete_id")
      .eq("status", "active");
    setInjuries(data || []);
  };

  const loadExerciseLibrary = async () => {
    const { data } = await supabase
      .from("exercise_library")
      .select("id, name, description, category, body_part, difficulty, sets_recommended, reps_recommended, duration_seconds, instructions")
      .order("name");
    setExerciseLibrary(data || []);
  };

  const loadPlanExercises = useCallback(async (planId: string) => {
    const { data, error } = await supabase
      .from("rehab_plan_exercises")
      .select(`
        id, exercise_id, sets, reps, duration_seconds, notes,
        exercise_library(id, name, description, category, body_part, difficulty, sets_recommended, reps_recommended, duration_seconds, instructions)
      `)
      .eq("rehab_plan_id", planId)
      .order("order_index");

    if (!error) {
      setPlanExercises(data as any || []);
    }
  }, []);

  const loadProgress = async (planId: string) => {
    const { data } = await supabase
      .from("rehab_progress")
      .select("*")
      .eq("rehab_plan_id", planId)
      .order("progress_date", { ascending: false });
    setProgress(data || []);
  };

  const loadTodayCompletions = useCallback(async (planId: string, date: string) => {
    const { data } = await supabase
      .from("exercise_completions")
      .select("*")
      .eq("rehab_plan_id", planId)
      .eq("session_date", date);
    setTodayCompletions(data || []);
  }, []);

  const loadAllCompletions = useCallback(async (planId: string) => {
    const { data } = await supabase
      .from("exercise_completions")
      .select("*")
      .eq("rehab_plan_id", planId)
      .order("session_date", { ascending: false });
    setAllCompletions(data || []);
  }, []);

  const toggleExerciseCompletion = async (planExercise: PlanExercise) => {
    if (!selectedPlan) return;

    const existingCompletion = todayCompletions.find(
      (c) => c.plan_exercise_id === planExercise.id
    );

    if (existingCompletion) {
      // Remove completion
      const { error } = await supabase
        .from("exercise_completions")
        .delete()
        .eq("id", existingCompletion.id);

      if (error) {
        toast.error("Failed to update completion");
      } else {
        setTodayCompletions((prev) =>
          prev.filter((c) => c.id !== existingCompletion.id)
        );
        setAllCompletions((prev) =>
          prev.filter((c) => c.id !== existingCompletion.id)
        );
        toast.success("Exercise marked as incomplete");
      }
    } else {
      // Add completion
      const { data, error } = await supabase
        .from("exercise_completions")
        .insert({
          rehab_plan_id: selectedPlan.id,
          plan_exercise_id: planExercise.id,
          session_date: sessionDate,
          sets_completed: planExercise.sets,
          reps_completed: planExercise.reps,
        })
        .select()
        .single();

      if (error) {
        toast.error(`Failed to mark complete: ${error.message}`);
      } else {
        const newCompletion = data as ExerciseCompletion;
        setTodayCompletions((prev) => [...prev, newCompletion]);
        setAllCompletions((prev) => [newCompletion, ...prev]);
        toast.success("Exercise completed!");
      }
    }
  };

  const isExerciseCompleted = (planExerciseId: string) => {
    return todayCompletions.some((c) => c.plan_exercise_id === planExerciseId);
  };

  const getCompletionStats = () => {
    if (planExercises.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = planExercises.filter((pe) => isExerciseCompleted(pe.id)).length;
    return {
      completed,
      total: planExercises.length,
      percentage: Math.round((completed / planExercises.length) * 100),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("You must be logged in to create a rehab plan");
      return;
    }

    const { data, error } = await supabase.from("rehab_plans").insert({
      athlete_id: formData.athlete_id,
      injury_id: formData.injury_id,
      plan_name: formData.plan_name,
      description: formData.description,
      start_date: formData.start_date,
      target_end_date: formData.target_end_date,
      created_by: user.id,
      status: "planned",
    }).select().single();

    if (error) {
      console.error("Insert error:", error);
      toast.error(`Failed to create rehab plan: ${error.message}`);
    } else {
      // Add selected exercises to the plan
      if (selectedExercises.length > 0 && data) {
        const exerciseInserts = selectedExercises.map((exerciseId, index) => {
          const exercise = exerciseLibrary.find(e => e.id === exerciseId);
          return {
            rehab_plan_id: data.id,
            exercise_id: exerciseId,
            sets: exercise?.sets_recommended || 3,
            reps: exercise?.reps_recommended || 10,
            duration_seconds: exercise?.duration_seconds || null,
            order_index: index,
          };
        });

        await supabase.from("rehab_plan_exercises").insert(exerciseInserts);
      }

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
      });
      setSelectedExercises([]);
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !user?.id) return;

    const { error } = await supabase.from("rehab_progress").insert({
      rehab_plan_id: selectedPlan.id,
      athlete_id: selectedPlan.athlete_id,
      progress_date: new Date().toISOString().split("T")[0],
      completion_percentage: parseFloat(progressData.completion_percentage),
      pain_level: parseInt(progressData.pain_level),
      notes: progressData.notes,
    });

    if (error) {
      toast.error(`Failed to log progress: ${error.message}`);
    } else {
      toast.success("Progress logged successfully");
      setIsProgressOpen(false);
      loadProgress(selectedPlan.id);
      setProgressData({ completion_percentage: "", pain_level: "", notes: "" });
    }
  };

  const addExercisesToPlan = async () => {
    if (!selectedPlan || selectedExercises.length === 0) return;

    const existingIds = planExercises.map(pe => pe.exercise_id);
    const newExercises = selectedExercises.filter(id => !existingIds.includes(id));

    if (newExercises.length === 0) {
      toast.info("All selected exercises are already in the plan");
      return;
    }

    const exerciseInserts = newExercises.map((exerciseId, index) => {
      const exercise = exerciseLibrary.find(e => e.id === exerciseId);
      return {
        rehab_plan_id: selectedPlan.id,
        exercise_id: exerciseId,
        sets: exercise?.sets_recommended || 3,
        reps: exercise?.reps_recommended || 10,
        duration_seconds: exercise?.duration_seconds || null,
        order_index: planExercises.length + index,
      };
    });

    const { error } = await supabase.from("rehab_plan_exercises").insert(exerciseInserts);

    if (error) {
      toast.error(`Failed to add exercises: ${error.message}`);
    } else {
      toast.success(`Added ${newExercises.length} exercise(s)`);
      setIsAddExerciseOpen(false);
      setSelectedExercises([]);
      loadPlanExercises(selectedPlan.id);
    }
  };

  const removeExerciseFromPlan = async (planExerciseId: string) => {
    const { error } = await supabase
      .from("rehab_plan_exercises")
      .delete()
      .eq("id", planExerciseId);

    if (error) {
      toast.error("Failed to remove exercise");
    } else {
      toast.success("Exercise removed");
      if (selectedPlan) loadPlanExercises(selectedPlan.id);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-success/20 text-success";
      case "intermediate": return "bg-warning/20 text-warning";
      case "advanced": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filteredInjuries = injuries.filter(inj => inj.athlete_id === formData.athlete_id);
  const filteredExercises = exerciseLibrary.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.body_part.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.category.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handlePlanClick = (plan: RehabPlan) => {
    setSelectedPlan(plan);
    setSessionDate(new Date().toISOString().split("T")[0]);
    setAiRecommendations(null);
    loadProgress(plan.id);
    loadPlanExercises(plan.id);
    loadTodayCompletions(plan.id, new Date().toISOString().split("T")[0]);
    loadAllCompletions(plan.id);
  };

  const handleSessionDateChange = (newDate: string) => {
    setSessionDate(newDate);
    if (selectedPlan) {
      loadTodayCompletions(selectedPlan.id, newDate);
    }
  };

  const handleAIRecommend = async () => {
    if (!selectedPlan) return;

    const injury = injuries.find(i => i.athlete_id === selectedPlan.athlete_id);
    if (!injury) {
      toast.error("No active injury found for this athlete");
      return;
    }

    const athlete = athletes.find(a => a.id === selectedPlan.athlete_id);
    
    setIsAILoading(true);
    setAiRecommendations(null);

    try {
      const daysSinceInjury = Math.floor(
        (Date.now() - new Date(injury.injury_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine rehab phase
      let currentPhase = "early";
      if (daysSinceInjury > 21) currentPhase = "late";
      else if (daysSinceInjury > 7) currentPhase = "intermediate";

      const response = await supabase.functions.invoke("recommend-exercises", {
        body: {
          injury: {
            type: injury.injury_type,
            location: injury.body_location,
            severity: injury.severity,
            daysSinceInjury,
            currentPhase,
          },
          athlete: {
            sport: athlete?.sport || "General",
            fitnessLevel: athlete?.fitness_level,
            age: null,
          },
          availableExercises: exerciseLibrary.slice(0, 30).map(e => ({
            id: e.id,
            name: e.name,
            body_part: e.body_part,
            category: e.category,
            difficulty: e.difficulty,
            description: e.description,
          })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Recommendation failed");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setAiRecommendations(response.data as AIExerciseRecommendation);
      toast.success("AI recommendations generated");
    } catch (error) {
      console.error("AI recommendation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get recommendations");
    } finally {
      setIsAILoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "essential": return "bg-destructive/20 text-destructive";
      case "recommended": return "bg-primary/20 text-primary";
      case "optional": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

              {/* Exercise Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Select Exercises from Library
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises..."
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-2">
                    {filteredExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 cursor-pointer"
                        onClick={() => toggleExercise(exercise.id)}
                      >
                        <Checkbox checked={selectedExercises.includes(exercise.id)} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{exercise.name}</p>
                          <p className="text-xs text-muted-foreground">{exercise.body_part} • {exercise.category}</p>
                        </div>
                        <Badge className={getDifficultyColor(exercise.difficulty)} variant="outline">
                          {exercise.difficulty}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedExercises.length > 0 && (
                  <p className="text-sm text-muted-foreground">{selectedExercises.length} exercise(s) selected</p>
                )}
              </div>

              <Button type="submit" className="w-full">Create Plan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rehabPlans.map((plan) => (
          <Card key={plan.id} className="shadow-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => handlePlanClick(plan)}>
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
              <div className="flex items-center gap-2 text-sm">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <span>Click to view exercises</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Detail Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.plan_name}</DialogTitle>
            <DialogDescription>{selectedPlan?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Exercises from Library */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    Today's Exercises
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-sm">Session Date:</Label>
                    <Input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => handleSessionDateChange(e.target.value)}
                      className="w-auto h-8"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {planExercises.length > 0 && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{getCompletionStats().completed}/{getCompletionStats().total}</p>
                      <p className="text-xs text-muted-foreground">{getCompletionStats().percentage}% complete</p>
                    </div>
                  )}
                  <Button size="sm" onClick={() => { setIsAddExerciseOpen(true); setSelectedExercises([]); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {planExercises.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No exercises assigned yet. Add exercises from the library.</p>
                ) : (
                  <div className="space-y-3">
                    {planExercises.length > 0 && (
                      <Progress value={getCompletionStats().percentage} className="h-2 mb-4" />
                    )}
                    {planExercises.map((pe) => {
                      const completed = isExerciseCompleted(pe.id);
                      return (
                        <div
                          key={pe.id}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            completed ? "bg-success/10 border border-success/30" : "bg-accent/30 hover:bg-accent/50"
                          }`}
                          onClick={() => toggleExerciseCompletion(pe)}
                        >
                          <div className="mt-0.5">
                            {completed ? (
                              <div className="h-6 w-6 rounded-full bg-success flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/50 flex items-center justify-center">
                                <Circle className="h-4 w-4 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${completed ? "line-through text-muted-foreground" : ""}`}>
                                {pe.exercise_library.name}
                              </p>
                              <Badge className={getDifficultyColor(pe.exercise_library.difficulty)} variant="outline">
                                {pe.exercise_library.difficulty}
                              </Badge>
                              {completed && (
                                <Badge className="bg-success/20 text-success">Done</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{pe.exercise_library.body_part} • {pe.exercise_library.category}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              {pe.sets && pe.reps && (
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" /> {pe.sets} sets × {pe.reps} reps
                                </span>
                              )}
                              {pe.duration_seconds && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {pe.duration_seconds}s
                                </span>
                              )}
                            </div>
                            {pe.exercise_library.instructions && pe.exercise_library.instructions.length > 0 && (
                              <details className="mt-2" onClick={(e) => e.stopPropagation()}>
                                <summary className="text-sm text-primary cursor-pointer">View Instructions</summary>
                                <ol className="list-decimal list-inside text-sm text-muted-foreground mt-1 space-y-1">
                                  {pe.exercise_library.instructions.map((inst, i) => (
                                    <li key={i}>{inst}</li>
                                  ))}
                                </ol>
                              </details>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); removeExerciseFromPlan(pe.id); }}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion History */}
            <CompletionHistory completions={allCompletions} planExercises={planExercises} />
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

      {/* Add Exercise Dialog */}
      <Dialog open={isAddExerciseOpen} onOpenChange={setIsAddExerciseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Exercises to Plan</DialogTitle>
            <DialogDescription>Select exercises from the library to add to this rehabilitation plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              <div className="space-y-2">
                {filteredExercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 cursor-pointer"
                    onClick={() => toggleExercise(exercise.id)}
                  >
                    <Checkbox checked={selectedExercises.includes(exercise.id)} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">{exercise.body_part} • {exercise.category}</p>
                    </div>
                    <Badge className={getDifficultyColor(exercise.difficulty)} variant="outline">
                      {exercise.difficulty}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{selectedExercises.length} exercise(s) selected</p>
              <Button onClick={addExercisesToPlan} disabled={selectedExercises.length === 0}>
                Add to Plan
              </Button>
            </div>
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