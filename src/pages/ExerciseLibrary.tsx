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
import { Plus, Dumbbell, Play, Clock, Target, Search, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  category: string;
  body_part: string;
  difficulty: string;
  video_url: string | null;
  image_url: string | null;
  instructions: string[] | null;
  sets_recommended: number | null;
  reps_recommended: number | null;
  duration_seconds: number | null;
  equipment: string[] | null;
}

export default function ExerciseLibrary() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    body_part: "",
    difficulty: "",
    video_url: "",
    instructions: "",
    sets_recommended: "",
    reps_recommended: "",
    duration_seconds: "",
    equipment: "",
  });

  const categories = [
    { value: "stretching", label: "Stretching", icon: "🧘" },
    { value: "strengthening", label: "Strengthening", icon: "💪" },
    { value: "cardio", label: "Cardio", icon: "🏃" },
    { value: "balance", label: "Balance", icon: "⚖️" },
    { value: "mobility", label: "Mobility", icon: "🔄" },
    { value: "plyometric", label: "Plyometric", icon: "🦘" },
  ];

  const difficulties = [
    { value: "beginner", label: "Beginner", color: "bg-success/20 text-success" },
    { value: "intermediate", label: "Intermediate", color: "bg-warning/20 text-warning" },
    { value: "advanced", label: "Advanced", color: "bg-destructive/20 text-destructive" },
  ];

  const bodyParts = [
    "Full Body", "Upper Body", "Lower Body", "Core", "Back", "Chest",
    "Shoulders", "Arms", "Legs", "Glutes", "Hip", "Knee", "Ankle", "Neck"
  ];

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    const { data, error } = await supabase
      .from("exercise_library")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading exercises:", error);
    } else {
      setExercises(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    const { error } = await supabase.from("exercise_library").insert({
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      body_part: formData.body_part,
      difficulty: formData.difficulty,
      video_url: formData.video_url || null,
      instructions: formData.instructions ? formData.instructions.split("\n").filter(Boolean) : null,
      sets_recommended: formData.sets_recommended ? parseInt(formData.sets_recommended) : null,
      reps_recommended: formData.reps_recommended ? parseInt(formData.reps_recommended) : null,
      duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : null,
      equipment: formData.equipment ? formData.equipment.split(",").map((e) => e.trim()) : null,
      created_by: user.id,
    });

    if (error) {
      toast.error(`Failed to add exercise: ${error.message}`);
    } else {
      toast.success("Exercise added to library");
      setIsOpen(false);
      loadExercises();
      setFormData({
        name: "",
        description: "",
        category: "",
        body_part: "",
        difficulty: "",
        video_url: "",
        instructions: "",
        sets_recommended: "",
        reps_recommended: "",
        duration_seconds: "",
        equipment: "",
      });
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.body_part.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || ex.category === categoryFilter;
    const matchesDifficulty = !difficultyFilter || ex.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getCategoryIcon = (category: string) => {
    return categories.find((c) => c.value === category)?.icon || "🏋️";
  };

  const getDifficultyColor = (difficulty: string) => {
    return difficulties.find((d) => d.value === difficulty)?.color || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Exercise Library</h1>
          <p className="text-muted-foreground">Browse and manage rehabilitation exercises</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
              <DialogDescription>Add a new exercise to the library</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exercise Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Body Part</Label>
                  <Select value={formData.body_part} onValueChange={(v) => setFormData({ ...formData, body_part: v })}>
                    <SelectTrigger><SelectValue placeholder="Select body part" /></SelectTrigger>
                    <SelectContent>
                      {bodyParts.map((bp) => (
                        <SelectItem key={bp} value={bp}>{bp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                    <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                    <SelectContent>
                      {difficulties.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Instructions (one per line)</Label>
                <Textarea rows={4} value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} placeholder="1. Start position...\n2. Movement...\n3. Return..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sets</Label>
                  <Input type="number" value={formData.sets_recommended} onChange={(e) => setFormData({ ...formData, sets_recommended: e.target.value })} placeholder="e.g., 3" />
                </div>
                <div className="space-y-2">
                  <Label>Reps</Label>
                  <Input type="number" value={formData.reps_recommended} onChange={(e) => setFormData({ ...formData, reps_recommended: e.target.value })} placeholder="e.g., 12" />
                </div>
                <div className="space-y-2">
                  <Label>Duration (sec)</Label>
                  <Input type="number" value={formData.duration_seconds} onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })} placeholder="e.g., 30" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Video URL (optional)</Label>
                <Input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Equipment (comma-separated)</Label>
                <Input value={formData.equipment} onChange={(e) => setFormData({ ...formData, equipment: e.target.value })} placeholder="e.g., Dumbbells, Resistance Band" />
              </div>
              <Button type="submit" className="w-full">Add Exercise</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter || "all"} onValueChange={(v) => setDifficultyFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {difficulties.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Exercise Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredExercises.map((exercise) => (
          <Card
            key={exercise.id}
            className="shadow-card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedExercise(exercise)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getCategoryIcon(exercise.category)}</span>
                  <div>
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    <CardDescription>{exercise.body_part}</CardDescription>
                  </div>
                </div>
                <Badge className={getDifficultyColor(exercise.difficulty)}>{exercise.difficulty}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {exercise.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                {exercise.sets_recommended && exercise.reps_recommended && (
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    {exercise.sets_recommended}x{exercise.reps_recommended}
                  </span>
                )}
                {exercise.duration_seconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {exercise.duration_seconds}s
                  </span>
                )}
                {exercise.video_url && (
                  <span className="flex items-center gap-1 text-primary">
                    <Play className="h-4 w-4" />
                    Video
                  </span>
                )}
              </div>
              {exercise.equipment && exercise.equipment.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {exercise.equipment.slice(0, 3).map((eq, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{eq}</Badge>
                  ))}
                  {exercise.equipment.length > 3 && (
                    <Badge variant="outline" className="text-xs">+{exercise.equipment.length - 3}</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No exercises found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new exercise</p>
        </div>
      )}

      {/* Exercise Detail Dialog */}
      <Dialog open={!!selectedExercise} onOpenChange={(open) => !open && setSelectedExercise(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedExercise && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getCategoryIcon(selectedExercise.category)}</span>
                  <div>
                    <DialogTitle className="text-xl">{selectedExercise.name}</DialogTitle>
                    <DialogDescription>{selectedExercise.body_part} • {selectedExercise.category}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getDifficultyColor(selectedExercise.difficulty)}>{selectedExercise.difficulty}</Badge>
                  {selectedExercise.sets_recommended && selectedExercise.reps_recommended && (
                    <Badge variant="outline">{selectedExercise.sets_recommended} sets × {selectedExercise.reps_recommended} reps</Badge>
                  )}
                  {selectedExercise.duration_seconds && (
                    <Badge variant="outline">{selectedExercise.duration_seconds} seconds</Badge>
                  )}
                </div>

                {selectedExercise.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-muted-foreground">{selectedExercise.description}</p>
                  </div>
                )}

                {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Instructions</h4>
                    <ol className="list-decimal list-inside space-y-2">
                      {selectedExercise.instructions.map((instruction, i) => (
                        <li key={i} className="text-muted-foreground">{instruction}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Equipment Needed</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedExercise.equipment.map((eq, i) => (
                        <Badge key={i} variant="secondary">{eq}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedExercise.video_url && (
                  <div>
                    <h4 className="font-medium mb-2">Video Guide</h4>
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={selectedExercise.video_url} target="_blank" rel="noopener noreferrer">
                        <Play className="h-4 w-4" />
                        Watch Video
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}