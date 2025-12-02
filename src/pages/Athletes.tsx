import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Athlete {
  id: string;
  date_of_birth: string;
  gender: string;
  height_cm: number;
  weight_kg: number;
  sport: string;
  position: string;
  training_hours_per_week: number;
  fitness_level: string;
  profiles: { full_name: string };
}

export default function Athletes() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    date_of_birth: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    sport: "",
    position: "",
    training_hours_per_week: "",
    fitness_level: "",
  });

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    const { data, error } = await supabase
      .from("athletes")
      .select("*, profiles!athletes_user_id_fkey(full_name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load athletes");
    } else {
      setAthletes(data as any || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("athletes").insert({
      user_id: user?.id,
      date_of_birth: formData.date_of_birth,
      gender: formData.gender,
      height_cm: parseFloat(formData.height_cm),
      weight_kg: parseFloat(formData.weight_kg),
      sport: formData.sport,
      position: formData.position,
      training_hours_per_week: parseFloat(formData.training_hours_per_week),
      fitness_level: formData.fitness_level,
    });

    if (error) {
      toast.error("Failed to add athlete");
    } else {
      toast.success("Athlete added successfully");
      setIsOpen(false);
      loadAthletes();
      setFormData({
        date_of_birth: "",
        gender: "",
        height_cm: "",
        weight_kg: "",
        sport: "",
        position: "",
        training_hours_per_week: "",
        fitness_level: "",
      });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Athletes</h1>
          <p className="text-muted-foreground">Manage athlete profiles and information</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Athlete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Athlete</DialogTitle>
              <DialogDescription>Enter the athlete's profile information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                Add Athlete
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {athletes.map((athlete) => (
          <Card key={athlete.id} className="shadow-card hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{athlete.profiles?.full_name}</CardTitle>
                  <CardDescription>{athlete.sport}</CardDescription>
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
                  <span className="text-muted-foreground">Height:</span>
                  <span className="font-medium">{athlete.height_cm} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weight:</span>
                  <span className="font-medium">{athlete.weight_kg} kg</span>
                </div>
                {athlete.position && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="font-medium">{athlete.position}</span>
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
