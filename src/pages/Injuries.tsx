import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Injury {
  id: string;
  injury_type: string;
  body_location: string;
  severity: string;
  injury_date: string;
  diagnosis: string;
  status: string;
  athletes: {
    profiles: { full_name: string };
  };
}

export default function Injuries() {
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    athlete_id: "",
    injury_type: "",
    body_location: "",
    severity: "moderate",
    injury_date: "",
    diagnosis: "",
    notes: "",
  });

  useEffect(() => {
    loadInjuries();
    loadAthletes();
  }, []);

  const loadInjuries = async () => {
    const { data, error } = await supabase
      .from("injuries")
      .select("*, athletes!inner(profiles!athletes_user_id_fkey(full_name))")
      .order("injury_date", { ascending: false });

    if (error) {
      toast.error("Failed to load injuries");
    } else {
      setInjuries(data as any || []);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase
      .from("athletes")
      .select("id, profiles!athletes_user_id_fkey(full_name)")
      .order("created_at", { ascending: false });

    setAthletes(data as any || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("injuries").insert([{
      athlete_id: formData.athlete_id,
      injury_type: formData.injury_type,
      body_location: formData.body_location,
      severity: formData.severity as any,
      injury_date: formData.injury_date,
      diagnosis: formData.diagnosis,
      notes: formData.notes,
    }]);

    if (error) {
      toast.error("Failed to record injury");
    } else {
      toast.success("Injury recorded successfully");
      setIsOpen(false);
      loadInjuries();
      setFormData({
        athlete_id: "",
        injury_type: "",
        body_location: "",
        severity: "moderate",
        injury_date: "",
        diagnosis: "",
        notes: "",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "minor":
        return "bg-success text-success-foreground";
      case "moderate":
        return "bg-warning text-warning-foreground";
      case "severe":
        return "bg-danger text-danger-foreground";
      case "critical":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Injuries</h1>
          <p className="text-muted-foreground">Track and manage athlete injuries</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Record Injury
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Injury</DialogTitle>
              <DialogDescription>Document an athlete's injury details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="athlete">Athlete</Label>
                <Select value={formData.athlete_id} onValueChange={(value) => setFormData({ ...formData, athlete_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select athlete" />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes.map((athlete) => (
                      <SelectItem key={athlete.id} value={athlete.id}>
                        {athlete.profiles?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="injury_type">Injury Type</Label>
                  <Input
                    id="injury_type"
                    value={formData.injury_type}
                    onChange={(e) => setFormData({ ...formData, injury_type: e.target.value })}
                    placeholder="e.g., Sprain, Fracture, Strain"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body_location">Body Location</Label>
                  <Input
                    id="body_location"
                    value={formData.body_location}
                    onChange={(e) => setFormData({ ...formData, body_location: e.target.value })}
                    placeholder="e.g., Left Ankle, Right Knee"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="injury_date">Injury Date</Label>
                  <Input
                    id="injury_date"
                    type="date"
                    value={formData.injury_date}
                    onChange={(e) => setFormData({ ...formData, injury_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Detailed diagnosis..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information..."
                />
              </div>
              <Button type="submit" className="w-full">
                Record Injury
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {injuries.map((injury) => (
          <Card key={injury.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{injury.athletes?.profiles?.full_name}</CardTitle>
                  <CardDescription>
                    {injury.injury_type} - {injury.body_location}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={getSeverityColor(injury.severity)}>
                    {injury.severity}
                  </Badge>
                  <Badge variant="outline">{injury.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Diagnosis</p>
                    <p className="text-sm text-muted-foreground">{injury.diagnosis || "No diagnosis provided"}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Injury Date: {new Date(injury.injury_date).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
