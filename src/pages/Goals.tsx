import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Target, Calendar, Trophy, Flag, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, differenceInDays } from "date-fns";

interface Goal {
  id: string;
  athlete_id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  target_date: string | null;
  status: string;
  athletes: { name: string } | null;
}

interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  target_value: number | null;
  achieved_at: string | null;
  notes: string | null;
}

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [formData, setFormData] = useState({
    athlete_id: "",
    title: "",
    description: "",
    goal_type: "",
    target_value: "",
    unit: "",
    target_date: "",
  });

  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    target_value: "",
    notes: "",
  });

  const goalTypes = [
    { value: "recovery", label: "Recovery", icon: "💚" },
    { value: "performance", label: "Performance", icon: "🏆" },
    { value: "prevention", label: "Prevention", icon: "🛡️" },
    { value: "strength", label: "Strength", icon: "💪" },
    { value: "flexibility", label: "Flexibility", icon: "🧘" },
  ];

  useEffect(() => {
    loadGoals();
    loadAthletes();
  }, []);

  const loadGoals = async () => {
    const { data, error } = await supabase
      .from("goals")
      .select(`*, athletes(name)`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading goals:", error);
    } else {
      setGoals(data || []);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase.from("athletes").select("id, name");
    setAthletes(data || []);
  };

  const loadMilestones = async (goalId: string) => {
    const { data } = await supabase
      .from("goal_milestones")
      .select("*")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: true });
    setMilestones(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    const { error } = await supabase.from("goals").insert({
      athlete_id: formData.athlete_id,
      title: formData.title,
      description: formData.description || null,
      goal_type: formData.goal_type,
      target_value: formData.target_value ? parseFloat(formData.target_value) : null,
      unit: formData.unit || null,
      target_date: formData.target_date || null,
      created_by: user.id,
    });

    if (error) {
      toast.error(`Failed to create goal: ${error.message}`);
    } else {
      toast.success("Goal created");
      setIsOpen(false);
      loadGoals();
      setFormData({
        athlete_id: "",
        title: "",
        description: "",
        goal_type: "",
        target_value: "",
        unit: "",
        target_date: "",
      });
    }
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    const { error } = await supabase.from("goal_milestones").insert({
      goal_id: selectedGoal.id,
      title: milestoneForm.title,
      target_value: milestoneForm.target_value ? parseFloat(milestoneForm.target_value) : null,
      notes: milestoneForm.notes || null,
    });

    if (error) {
      toast.error(`Failed to add milestone: ${error.message}`);
    } else {
      toast.success("Milestone added");
      setIsMilestoneOpen(false);
      loadMilestones(selectedGoal.id);
      setMilestoneForm({ title: "", target_value: "", notes: "" });
    }
  };

  const updateProgress = async (goalId: string, newValue: number) => {
    const { error } = await supabase
      .from("goals")
      .update({ current_value: newValue })
      .eq("id", goalId);

    if (error) {
      toast.error("Failed to update progress");
    } else {
      toast.success("Progress updated");
      loadGoals();
    }
  };

  const markMilestoneAchieved = async (milestoneId: string) => {
    const { error } = await supabase
      .from("goal_milestones")
      .update({ achieved_at: new Date().toISOString() })
      .eq("id", milestoneId);

    if (error) {
      toast.error("Failed to update milestone");
    } else {
      toast.success("Milestone achieved!");
      if (selectedGoal) loadMilestones(selectedGoal.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-primary/20 text-primary";
      case "completed": return "bg-success/20 text-success";
      case "paused": return "bg-warning/20 text-warning";
      case "abandoned": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getProgress = (goal: Goal) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min(100, ((goal.current_value || 0) / goal.target_value) * 100);
  };

  const getDaysRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    const days = differenceInDays(parseISO(targetDate), new Date());
    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Goals & Milestones</h1>
          <p className="text-muted-foreground">Set and track athlete recovery and performance goals</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Goal</DialogTitle>
              <DialogDescription>Set a new goal for an athlete</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label>Goal Type</Label>
                <Select value={formData.goal_type} onValueChange={(v) => setFormData({ ...formData, goal_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {goalTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input type="number" value={formData.target_value} onChange={(e) => setFormData({ ...formData, target_value: e.target.value })} placeholder="e.g., 100" />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="e.g., kg, reps, %"  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input type="date" value={formData.target_date} onChange={(e) => setFormData({ ...formData, target_date: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Create Goal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = getProgress(goal);
          const daysRemaining = getDaysRemaining(goal.target_date);
          const goalType = goalTypes.find((t) => t.value === goal.goal_type);

          return (
            <Card
              key={goal.id}
              className="shadow-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setSelectedGoal(goal); loadMilestones(goal.id); }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{goalType?.icon}</span>
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(goal.status)}>{goal.status}</Badge>
                </div>
                <CardDescription>{goal.athletes?.name || "Unknown Athlete"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {goal.target_value && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-medium">{goal.current_value || 0} / {goal.target_value} {goal.unit}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
                {daysRemaining !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className={daysRemaining < 0 ? "text-warning" : ""}>
                      {daysRemaining < 0
                        ? `${Math.abs(daysRemaining)} days overdue`
                        : `${daysRemaining} days remaining`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Goal Detail Dialog */}
      <Dialog open={!!selectedGoal} onOpenChange={(open) => !open && setSelectedGoal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedGoal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {selectedGoal.title}
                </DialogTitle>
                <DialogDescription>{selectedGoal.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Progress Update */}
                {selectedGoal.target_value && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Update Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          placeholder="Enter new value"
                          className="max-w-[150px]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateProgress(selectedGoal.id, parseFloat((e.target as HTMLInputElement).value));
                            }
                          }}
                        />
                        <span className="text-muted-foreground">/ {selectedGoal.target_value} {selectedGoal.unit}</span>
                      </div>
                      <Progress value={getProgress(selectedGoal)} className="h-3 mt-4" />
                    </CardContent>
                  </Card>
                )}

                {/* Milestones */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      Milestones
                    </CardTitle>
                    <Button size="sm" onClick={() => setIsMilestoneOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Milestone
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {milestones.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No milestones yet</p>
                    ) : (
                      <div className="space-y-3">
                        {milestones.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={() => !m.achieved_at && markMilestoneAchieved(m.id)}
                            >
                              {m.achieved_at ? (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              ) : (
                                <Trophy className="h-5 w-5 text-muted-foreground" />
                              )}
                            </Button>
                            <div className="flex-1">
                              <p className={`font-medium ${m.achieved_at ? "line-through text-muted-foreground" : ""}`}>
                                {m.title}
                              </p>
                              {m.target_value && (
                                <p className="text-sm text-muted-foreground">Target: {m.target_value}</p>
                              )}
                            </div>
                            {m.achieved_at && (
                              <span className="text-xs text-success">
                                {format(parseISO(m.achieved_at), "MMM d")}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog open={isMilestoneOpen} onOpenChange={setIsMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>Add a milestone to track progress</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMilestoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Milestone Title</Label>
              <Input value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Target Value (optional)</Label>
              <Input type="number" value={milestoneForm.target_value} onChange={(e) => setMilestoneForm({ ...milestoneForm, target_value: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={milestoneForm.notes} onChange={(e) => setMilestoneForm({ ...milestoneForm, notes: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">Add Milestone</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}