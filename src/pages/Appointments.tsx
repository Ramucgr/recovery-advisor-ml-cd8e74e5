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
import { Plus, Calendar, Clock, MapPin, User, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";

interface Appointment {
  id: string;
  athlete_id: string;
  title: string;
  description: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  location: string | null;
  notes: string | null;
  athletes: { name: string } | null;
}

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "list">("week");

  const [formData, setFormData] = useState({
    athlete_id: "",
    title: "",
    description: "",
    appointment_date: "",
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    loadAppointments();
    loadAthletes();
  }, []);

  const loadAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select(`*, athletes(name)`)
      .order("appointment_date", { ascending: true });

    if (error) {
      console.error("Error loading appointments:", error);
      toast.error("Failed to load appointments");
    } else {
      setAppointments(data || []);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase.from("athletes").select("id, name");
    setAthletes(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    const { error } = await supabase.from("appointments").insert({
      ...formData,
      created_by: user.id,
    });

    if (error) {
      toast.error(`Failed to create appointment: ${error.message}`);
    } else {
      toast.success("Appointment scheduled");
      setIsOpen(false);
      loadAppointments();
      setFormData({
        athlete_id: "",
        title: "",
        description: "",
        appointment_date: "",
        start_time: "",
        end_time: "",
        location: "",
        notes: "",
      });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      loadAppointments();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-primary/20 text-primary";
      case "completed": return "bg-success/20 text-success";
      case "cancelled": return "bg-muted text-muted-foreground";
      case "no_show": return "bg-warning/20 text-warning";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) => 
      isSameDay(parseISO(apt.appointment_date), date)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Appointments</h1>
          <p className="text-muted-foreground">Schedule and manage appointments with athletes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week View
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List View
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
                <DialogDescription>Create a new appointment with an athlete</DialogDescription>
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
                  <Label>Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={formData.appointment_date} onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Room 101" />
                </div>
                <Button type="submit" className="w-full">Schedule Appointment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "week" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Week of {format(weekStart, "MMM d, yyyy")}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>Next</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="min-h-[200px] border rounded-lg p-2">
                  <div className={`text-sm font-medium mb-2 ${isSameDay(day, new Date()) ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE d")}
                  </div>
                  <div className="space-y-1">
                    {getAppointmentsForDay(day).map((apt) => (
                      <div key={apt.id} className="text-xs p-2 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer">
                        <div className="font-medium truncate">{apt.title}</div>
                        <div className="text-muted-foreground">{apt.start_time.slice(0, 5)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appointments.map((apt) => (
            <Card key={apt.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{apt.title}</CardTitle>
                  <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {apt.athletes?.name || "Unknown Athlete"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(parseISO(apt.appointment_date), "PPP")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}</span>
                </div>
                {apt.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{apt.location}</span>
                  </div>
                )}
                {apt.status === "scheduled" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => updateStatus(apt.id, "completed")}>
                      <Check className="h-4 w-4 mr-1" /> Complete
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => updateStatus(apt.id, "cancelled")}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}