import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, AlertCircle, Pencil, Trash2, Activity, AlertTriangle, CheckCircle, XCircle, Search, X, TrendingUp, User, Download, FileText } from "lucide-react";
import { useExportInjuries } from "@/hooks/useExportInjuries";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import BodyHeatmap from "@/components/BodyHeatmap";

interface Injury {
  id: string;
  athlete_id: string;
  injury_type: string;
  body_location: string;
  severity: string;
  injury_date: string;
  diagnosis: string;
  status: string;
  notes: string;
  athletes: {
    name: string;
  };
}

const initialFormData = {
  athlete_id: "",
  injury_type: "",
  body_location: "",
  severity: "moderate",
  injury_date: "",
  diagnosis: "",
  notes: "",
};

export default function Injuries() {
  const { user } = useAuth();
  const { exportToCSV, exportToPDF } = useExportInjuries();
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingInjury, setEditingInjury] = useState<Injury | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAthlete, setFilterAthlete] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadInjuries();
    loadAthletes();
  }, []);

  const loadInjuries = async () => {
    const { data, error } = await supabase
      .from("injuries")
      .select("*, athletes(name)")
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
      .select("id, name")
      .order("created_at", { ascending: false });

    setAthletes(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("You must be logged in to record an injury");
      return;
    }

    const { error } = await supabase.from("injuries").insert([{
      athlete_id: formData.athlete_id,
      injury_type: formData.injury_type,
      body_location: formData.body_location,
      severity: formData.severity as any,
      injury_date: formData.injury_date,
      diagnosis: formData.diagnosis,
      notes: formData.notes,
      created_by: user.id,
    }]);

    if (error) {
      console.error("Insert error:", error);
      toast.error(`Failed to record injury: ${error.message}`);
    } else {
      toast.success("Injury recorded successfully");
      setIsOpen(false);
      loadInjuries();
      setFormData(initialFormData);
    }
  };

  const handleEdit = (injury: Injury) => {
    setEditingInjury(injury);
    setFormData({
      athlete_id: injury.athlete_id,
      injury_type: injury.injury_type,
      body_location: injury.body_location,
      severity: injury.severity,
      injury_date: injury.injury_date,
      diagnosis: injury.diagnosis || "",
      notes: injury.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingInjury) return;

    const { error } = await supabase
      .from("injuries")
      .update({
        athlete_id: formData.athlete_id,
        injury_type: formData.injury_type,
        body_location: formData.body_location,
        severity: formData.severity as any,
        injury_date: formData.injury_date,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
      })
      .eq("id", editingInjury.id);

    if (error) {
      toast.error(`Failed to update injury: ${error.message}`);
    } else {
      toast.success("Injury updated successfully");
      setIsEditOpen(false);
      setEditingInjury(null);
      loadInjuries();
      setFormData(initialFormData);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("injuries")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error(`Failed to delete injury: ${error.message}`);
    } else {
      toast.success("Injury deleted successfully");
      loadInjuries();
    }
    setDeleteId(null);
  };

  const handleStatusUpdate = async (injuryId: string, newStatus: string) => {
    const { error } = await supabase
      .from("injuries")
      .update({ status: newStatus })
      .eq("id", injuryId);

    if (error) {
      toast.error(`Failed to update status: ${error.message}`);
    } else {
      toast.success("Status updated successfully");
      loadInjuries();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "in_treatment":
        return "bg-warning/20 text-warning-foreground border-warning/30";
      case "recovered":
        return "bg-success/20 text-success-foreground border-success/30";
      case "closed":
        return "bg-muted text-muted-foreground border-muted-foreground/30";
      default:
        return "bg-muted text-muted-foreground border-muted-foreground/30";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "in_treatment": return "In Treatment";
      case "recovered": return "Recovered";
      case "closed": return "Closed";
      default: return status;
    }
  };

  const InjuryForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="athlete">Athlete</Label>
        <Select value={formData.athlete_id} onValueChange={(value) => setFormData({ ...formData, athlete_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select athlete" />
          </SelectTrigger>
          <SelectContent>
            {athletes.map((athlete) => (
              <SelectItem key={athlete.id} value={athlete.id}>
                {athlete.name || "Unnamed Athlete"}
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
        {submitLabel}
      </Button>
    </form>
  );

  const stats = useMemo(() => {
    const severityCounts = {
      minor: injuries.filter(i => i.severity === "minor").length,
      moderate: injuries.filter(i => i.severity === "moderate").length,
      severe: injuries.filter(i => i.severity === "severe").length,
      critical: injuries.filter(i => i.severity === "critical").length,
    };
    const statusCounts = {
      active: injuries.filter(i => i.status === "active" || !i.status).length,
      in_treatment: injuries.filter(i => i.status === "in_treatment").length,
      recovered: injuries.filter(i => i.status === "recovered").length,
      closed: injuries.filter(i => i.status === "closed").length,
    };
    return { severityCounts, statusCounts, total: injuries.length };
  }, [injuries]);

  // Filtered injuries
  const filteredInjuries = useMemo(() => {
    return injuries.filter((injury) => {
      // Search query filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === "" || 
        injury.athletes?.name?.toLowerCase().includes(searchLower) ||
        injury.injury_type.toLowerCase().includes(searchLower) ||
        injury.body_location.toLowerCase().includes(searchLower) ||
        injury.diagnosis?.toLowerCase().includes(searchLower);

      // Athlete filter
      const matchesAthlete = filterAthlete === "all" || injury.athlete_id === filterAthlete;

      // Severity filter
      const matchesSeverity = filterSeverity === "all" || injury.severity === filterSeverity;

      // Status filter
      const injuryStatus = injury.status || "active";
      const matchesStatus = filterStatus === "all" || injuryStatus === filterStatus;

      return matchesSearch && matchesAthlete && matchesSeverity && matchesStatus;
    });
  }, [injuries, searchQuery, filterAthlete, filterSeverity, filterStatus]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAthlete("all");
    setFilterSeverity("all");
    setFilterStatus("all");
  };

  const hasActiveFilters = searchQuery !== "" || filterAthlete !== "all" || filterSeverity !== "all" || filterStatus !== "all";

  // Injury trends data for chart (last 6 months)
  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthInjuries = injuries.filter(injury => {
        const injuryDate = parseISO(injury.injury_date);
        return isWithinInterval(injuryDate, { start: monthStart, end: monthEnd });
      });
      
      months.push({
        month: format(monthDate, "MMM yyyy"),
        total: monthInjuries.length,
        minor: monthInjuries.filter(i => i.severity === "minor").length,
        moderate: monthInjuries.filter(i => i.severity === "moderate").length,
        severe: monthInjuries.filter(i => i.severity === "severe").length,
        critical: monthInjuries.filter(i => i.severity === "critical").length,
      });
    }
    
    return months;
  }, [injuries]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Injuries</h1>
          <p className="text-muted-foreground">Track and manage athlete injuries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredInjuries)} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToPDF(filteredInjuries)} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setFormData(initialFormData);
          }}>
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
              <InjuryForm onSubmit={handleSubmit} submitLabel="Record Injury" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by athlete, injury type, location, or diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Athlete Filter */}
            <Select value={filterAthlete} onValueChange={setFilterAthlete}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Athletes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Athletes</SelectItem>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.name || "Unnamed Athlete"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="minor">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Minor
                  </span>
                </SelectItem>
                <SelectItem value="moderate">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    Moderate
                  </span>
                </SelectItem>
                <SelectItem value="severe">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-danger" />
                    Severe
                  </span>
                </SelectItem>
                <SelectItem value="critical">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    Critical
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    Active
                  </span>
                </SelectItem>
                <SelectItem value="in_treatment">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    In Treatment
                  </span>
                </SelectItem>
                <SelectItem value="recovered">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Recovered
                  </span>
                </SelectItem>
                <SelectItem value="closed">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Closed
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
          
          {/* Results count */}
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mt-3">
              Showing {filteredInjuries.length} of {injuries.length} injuries
            </p>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {/* Severity Stats */}
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Minor</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.severityCounts.minor}</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/10 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground">Moderate</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.severityCounts.moderate}</p>
          </CardContent>
        </Card>
        <Card className="bg-danger/10 border-danger/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-danger" />
              <span className="text-xs font-medium text-muted-foreground">Severe</span>
            </div>
            <p className="text-2xl font-bold text-danger">{stats.severityCounts.severe}</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground">Critical</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.severityCounts.critical}</p>
          </CardContent>
        </Card>

        {/* Status Stats */}
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-xs font-medium text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.statusCounts.active}</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/10 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-xs font-medium text-muted-foreground">Treatment</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.statusCounts.in_treatment}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Recovered</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.statusCounts.recovered}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted border-muted-foreground/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Closed</span>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{stats.statusCounts.closed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Injury Trends Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Injury Trends</CardTitle>
            </div>
            <CardDescription>Total injuries over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    strokeWidth={2}
                    name="Total Injuries"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle>Severity Breakdown</CardTitle>
            </div>
            <CardDescription>Injuries by severity over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="minor" stackId="a" fill="hsl(var(--success))" name="Minor" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="moderate" stackId="a" fill="hsl(var(--warning))" name="Moderate" />
                  <Bar dataKey="severe" stackId="a" fill="hsl(var(--danger))" name="Severe" />
                  <Bar dataKey="critical" stackId="a" fill="hsl(var(--destructive))" name="Critical" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Body Location Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Body Location Heatmap</CardTitle>
          </div>
          <CardDescription>Visual representation of injury locations across all athletes</CardDescription>
        </CardHeader>
        <CardContent>
          <BodyHeatmap injuries={injuries} />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setEditingInjury(null);
          setFormData(initialFormData);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Injury</DialogTitle>
            <DialogDescription>Update the injury details</DialogDescription>
          </DialogHeader>
          <InjuryForm onSubmit={handleEditSubmit} submitLabel="Update Injury" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Injury Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this injury record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4">
        {filteredInjuries.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No injuries found</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters 
                  ? "Try adjusting your search or filter criteria" 
                  : "No injury records have been created yet"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredInjuries.map((injury) => (
          <Card key={injury.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{injury.athletes?.name || "Unknown Athlete"}</CardTitle>
                  <CardDescription>
                    {injury.injury_type} - {injury.body_location}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(injury.severity)}>
                    {injury.severity}
                  </Badge>
                  <Select value={injury.status || "active"} onValueChange={(value) => handleStatusUpdate(injury.id, value)}>
                    <SelectTrigger className={`w-[140px] h-8 border ${getStatusColor(injury.status || "active")}`}>
                      <SelectValue>{getStatusLabel(injury.status || "active")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-destructive" />
                          Active
                        </span>
                      </SelectItem>
                      <SelectItem value="in_treatment">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-warning" />
                          In Treatment
                        </span>
                      </SelectItem>
                      <SelectItem value="recovered">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-success" />
                          Recovered
                        </span>
                      </SelectItem>
                      <SelectItem value="closed">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                          Closed
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(injury)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(injury.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
        ))
        )}
      </div>
    </div>
  );
}
