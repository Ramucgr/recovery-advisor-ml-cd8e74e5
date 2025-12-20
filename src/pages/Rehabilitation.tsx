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
import { Plus, Activity, Calendar, Target, CheckCircle2, Dumbbell, Clock, X, Search } from "lucide-react";
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

export default function Rehabilitation() {
  const { user } = useAuth();
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
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
    const { data } = await supabase.from("athletes").select("id, name");
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
    loadProgress(plan.id);
    loadPlanExercises(plan.id);
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Prescribed Exercises
                </CardTitle>
                <Button size="sm" onClick={() => { setIsAddExerciseOpen(true); setSelectedExercises([]); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Exercises
                </Button>
              </CardHeader>
              <CardContent>
                {planExercises.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No exercises assigned yet. Add exercises from the library.</p>
                ) : (
                  <div className="space-y-3">
                    {planExercises.map((pe) => (
                      <div key={pe.id} className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{pe.exercise_library.name}</p>
                            <Badge className={getDifficultyColor(pe.exercise_library.difficulty)} variant="outline">
                              {pe.exercise_library.difficulty}
                            </Badge>
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
                            <details className="mt-2">
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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