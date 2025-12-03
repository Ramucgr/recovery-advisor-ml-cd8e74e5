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
import { Plus, FileText, Upload, Download, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface MedicalRecord {
  id: string;
  record_date: string;
  diagnosis: string;
  treatment_plan: string;
  notes: string;
  file_url: string | null;
  athletes: {
    profiles: { full_name: string };
  };
  injuries?: {
    injury_type: string;
    body_location: string;
  };
}

export default function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    athlete_id: "",
    injury_id: "",
    record_date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    treatment_plan: "",
    notes: "",
  });

  useEffect(() => {
    loadRecords();
    loadAthletes();
    loadInjuries();
  }, []);

  const loadRecords = async () => {
    const { data, error } = await supabase
      .from("medical_records")
      .select(`
        *,
        athletes!inner(profiles!athletes_user_id_fkey(full_name)),
        injuries(injury_type, body_location)
      `)
      .order("record_date", { ascending: false });

    if (error) {
      console.error("Error loading medical records:", error);
    } else {
      setRecords(data as any || []);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase
      .from("athletes")
      .select("id, profiles!athletes_user_id_fkey(full_name)");
    setAthletes(data || []);
  };

  const loadInjuries = async () => {
    const { data } = await supabase
      .from("injuries")
      .select("id, injury_type, body_location, athlete_id");
    setInjuries(data || []);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("medical-files")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("medical-files")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let fileUrl = null;
    if (selectedFile) {
      fileUrl = await uploadFile(selectedFile);
      if (!fileUrl) {
        toast.error("Failed to upload file");
        setUploading(false);
        return;
      }
    }

    const { error } = await supabase.from("medical_records").insert({
      athlete_id: formData.athlete_id,
      injury_id: formData.injury_id || null,
      record_date: formData.record_date,
      diagnosis: formData.diagnosis,
      treatment_plan: formData.treatment_plan,
      notes: formData.notes,
      file_url: fileUrl,
      doctor_id: user?.id,
    });

    setUploading(false);

    if (error) {
      toast.error("Failed to create medical record");
      console.error(error);
    } else {
      toast.success("Medical record created successfully");
      setIsOpen(false);
      loadRecords();
      setFormData({
        athlete_id: "",
        injury_id: "",
        record_date: new Date().toISOString().split("T")[0],
        diagnosis: "",
        treatment_plan: "",
        notes: "",
      });
      setSelectedFile(null);
    }
  };

  const downloadFile = (url: string) => {
    window.open(url, "_blank");
  };

  const filteredInjuries = injuries.filter(inj => inj.athlete_id === formData.athlete_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Medical Records</h1>
          <p className="text-muted-foreground">Manage athlete medical documentation</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Medical Record</DialogTitle>
              <DialogDescription>Document medical findings and treatment plans</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Athlete</Label>
                  <Select value={formData.athlete_id} onValueChange={(v) => setFormData({ ...formData, athlete_id: v, injury_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                    <SelectContent>
                      {athletes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.profiles?.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Related Injury (optional)</Label>
                  <Select value={formData.injury_id} onValueChange={(v) => setFormData({ ...formData, injury_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select injury" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {filteredInjuries.map((inj) => (
                        <SelectItem key={inj.id} value={inj.id}>{inj.injury_type} - {inj.body_location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Record Date</Label>
                <Input type="date" value={formData.record_date} onChange={(e) => setFormData({ ...formData, record_date: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label>Diagnosis</Label>
                <Textarea value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })} required placeholder="Enter diagnosis details..." />
              </div>

              <div className="space-y-2">
                <Label>Treatment Plan</Label>
                <Textarea value={formData.treatment_plan} onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })} placeholder="Enter treatment plan..." />
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any additional observations..." />
              </div>

              <div className="space-y-2">
                <Label>Attach File (PDF, Images)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {selectedFile && (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" />
                      {selectedFile.name}
                    </Badge>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Create Record"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {records.map((record) => (
          <Card key={record.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{record.athletes?.profiles?.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(record.record_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                {record.injuries && (
                  <Badge variant="outline">
                    {record.injuries.injury_type} - {record.injuries.body_location}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">Diagnosis</h4>
                <p className="text-sm text-muted-foreground">{record.diagnosis}</p>
              </div>
              
              {record.treatment_plan && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Treatment Plan</h4>
                  <p className="text-sm text-muted-foreground">{record.treatment_plan}</p>
                </div>
              )}

              {record.notes && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{record.notes}</p>
                </div>
              )}

              {record.file_url && (
                <Button variant="outline" size="sm" onClick={() => downloadFile(record.file_url!)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Attachment
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
