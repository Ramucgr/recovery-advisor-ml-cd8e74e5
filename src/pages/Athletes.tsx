import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, User, Pencil, Trash2, Search, X, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Athlete {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  height_cm: number;
  weight_kg: number;
  sport: string;
  position: string;
  training_hours_per_week: number;
  fitness_level: string;
}

export default function Athletes() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [fitnessFilter, setFitnessFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [formData, setFormData] = useState({
    name: "",
    date_of_birth: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    sport: "",
    position: "",
    training_hours_per_week: "",
    fitness_level: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      date_of_birth: "",
      gender: "",
      height_cm: "",
      weight_kg: "",
      sport: "",
      position: "",
      training_hours_per_week: "",
      fitness_level: "",
    });
    setEditingAthlete(null);
  };

  const openEditDialog = (athlete: Athlete) => {
    setEditingAthlete(athlete);
    setFormData({
      name: athlete.name || "",
      date_of_birth: athlete.date_of_birth || "",
      gender: athlete.gender || "",
      height_cm: athlete.height_cm?.toString() || "",
      weight_kg: athlete.weight_kg?.toString() || "",
      sport: athlete.sport || "",
      position: athlete.position || "",
      training_hours_per_week: athlete.training_hours_per_week?.toString() || "",
      fitness_level: athlete.fitness_level || "",
    });
    setIsOpen(true);
  };

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load athletes");
    } else {
      setAthletes(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("You must be logged in to manage athletes");
      return;
    }

    const athleteData = {
      name: formData.name,
      date_of_birth: formData.date_of_birth,
      gender: formData.gender,
      height_cm: parseFloat(formData.height_cm) || null,
      weight_kg: parseFloat(formData.weight_kg) || null,
      sport: formData.sport,
      position: formData.position || null,
      training_hours_per_week: parseFloat(formData.training_hours_per_week) || null,
      fitness_level: formData.fitness_level || null,
    };

    if (editingAthlete) {
      const { error } = await supabase
        .from("athletes")
        .update(athleteData)
        .eq("id", editingAthlete.id);

      if (error) {
        toast.error(`Failed to update athlete: ${error.message}`);
      } else {
        toast.success("Athlete updated successfully");
        setIsOpen(false);
        loadAthletes();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("athletes").insert({
        user_id: user.id,
        ...athleteData,
      });

      if (error) {
        toast.error(`Failed to add athlete: ${error.message}`);
      } else {
        toast.success("Athlete added successfully");
        setIsOpen(false);
        loadAthletes();
        resetForm();
      }
    }
  };

  const handleDelete = async (athleteId: string) => {
    const { error } = await supabase.from("athletes").delete().eq("id", athleteId);
    
    if (error) {
      toast.error(`Failed to delete athlete: ${error.message}`);
    } else {
      toast.success("Athlete deleted successfully");
      loadAthletes();
    }
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const uniqueSports = useMemo(() => 
    [...new Set(athletes.map(a => a.sport).filter(Boolean))].sort(),
    [athletes]
  );

  const uniqueFitnessLevels = useMemo(() => 
    [...new Set(athletes.map(a => a.fitness_level).filter(Boolean))].sort(),
    [athletes]
  );

  const filteredAndSortedAthletes = useMemo(() => {
    const filtered = athletes.filter(athlete => {
      const matchesSearch = searchQuery === "" || 
        (athlete.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (athlete.sport?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSport = sportFilter === "all" || athlete.sport === sportFilter;
      const matchesFitness = fitnessFilter === "all" || athlete.fitness_level === fitnessFilter;
      
      return matchesSearch && matchesSport && matchesFitness;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "");
        case "age_asc":
          return new Date(b.date_of_birth).getTime() - new Date(a.date_of_birth).getTime();
        case "age_desc":
          return new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime();
        case "sport_asc":
          return (a.sport || "").localeCompare(b.sport || "");
        case "sport_desc":
          return (b.sport || "").localeCompare(a.sport || "");
        case "date_asc":
          return new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime();
        case "date_desc":
        default:
          return new Date(b.date_of_birth).getTime() - new Date(a.date_of_birth).getTime();
      }
    });
  }, [athletes, searchQuery, sportFilter, fitnessFilter, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setSportFilter("all");
    setFitnessFilter("all");
    setSortBy("date_desc");
  };

  const hasActiveFilters = searchQuery !== "" || sportFilter !== "all" || fitnessFilter !== "all" || sortBy !== "date_desc";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Athletes</h1>
          <p className="text-muted-foreground">Manage athlete profiles and information</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Athlete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAthlete ? "Edit Athlete" : "Add New Athlete"}</DialogTitle>
              <DialogDescription>Enter the athlete's profile information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Athlete Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter athlete's full name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport</Label>
                  <Input
                    id="sport"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="training">Training Hours/Week</Label>
                  <Input
                    id="training"
                    type="number"
                    step="0.1"
                    value={formData.training_hours_per_week}
                    onChange={(e) =>
                      setFormData({ ...formData, training_hours_per_week: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fitness">Fitness Level</Label>
                  <Input
                    id="fitness"
                    value={formData.fitness_level}
                    onChange={(e) => setFormData({ ...formData, fitness_level: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingAthlete ? "Update Athlete" : "Add Athlete"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or sport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {uniqueSports.map(sport => (
              <SelectItem key={sport} value={sport}>{sport}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fitnessFilter} onValueChange={setFitnessFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by fitness" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fitness Levels</SelectItem>
            {uniqueFitnessLevels.map(level => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Newest First</SelectItem>
            <SelectItem value="date_asc">Oldest First</SelectItem>
            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            <SelectItem value="age_asc">Age (Youngest)</SelectItem>
            <SelectItem value="age_desc">Age (Oldest)</SelectItem>
            <SelectItem value="sport_asc">Sport (A-Z)</SelectItem>
            <SelectItem value="sport_desc">Sport (Z-A)</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedAthletes.length} of {athletes.length} athletes
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedAthletes.map((athlete) => (
          <Card key={athlete.id} className="shadow-card hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{athlete.name || "Unnamed Athlete"}</CardTitle>
                    <CardDescription>{athlete.sport}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(athlete)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Athlete</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {athlete.name || "this athlete"}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(athlete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span className="font-medium">{calculateAge(athlete.date_of_birth)} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="font-medium">{athlete.gender || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height:</span>
                  <span className="font-medium">{athlete.height_cm ? `${athlete.height_cm} cm` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weight:</span>
                  <span className="font-medium">{athlete.weight_kg ? `${athlete.weight_kg} kg` : "N/A"}</span>
                </div>
                {athlete.position && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="font-medium">{athlete.position}</span>
                  </div>
                )}
                {athlete.fitness_level && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fitness Level:</span>
                    <span className="font-medium">{athlete.fitness_level}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
