import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, AlertTriangle, Clock, TrendingUp, Activity, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMLPrediction } from "@/hooks/useMLPrediction";

interface Prediction {
  id: string;
  prediction_date: string;
  risk_level: string;
  predicted_recovery_days: number;
  setback_probability: number;
  confidence_score: number;
  input_features: any;
  athletes: {
    profiles: { full_name: string };
    sport: string;
  };
  injuries: {
    injury_type: string;
    body_location: string;
    severity: string;
  };
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedInjury, setSelectedInjury] = useState("");
  
  const { predict, isLoading, result } = useMLPrediction();

  useEffect(() => {
    loadPredictions();
    loadAthletes();
    loadInjuries();
  }, []);

  useEffect(() => {
    if (result) {
      savePrediction(result);
    }
  }, [result]);

  const loadPredictions = async () => {
    const { data, error } = await supabase
      .from("predictions")
      .select(`
        *,
        athletes!inner(profiles!athletes_user_id_fkey(full_name), sport),
        injuries!inner(injury_type, body_location, severity)
      `)
      .order("prediction_date", { ascending: false });

    if (error) {
      console.error("Error loading predictions:", error);
    } else {
      setPredictions(data as any || []);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase
      .from("athletes")
      .select("id, user_id, profiles!athletes_user_id_fkey(full_name), sport, fitness_level, training_hours_per_week, weight_kg, height_cm");
    setAthletes(data || []);
  };

  const loadInjuries = async () => {
    const { data } = await supabase
      .from("injuries")
      .select("*")
      .eq("status", "active");
    setInjuries(data || []);
  };

  const savePrediction = async (predictionResult: any) => {
    if (!selectedAthlete || !selectedInjury) return;

    const { error } = await supabase.from("predictions").insert({
      athlete_id: selectedAthlete,
      injury_id: selectedInjury,
      risk_level: predictionResult.riskLevel,
      predicted_recovery_days: predictionResult.recoveryDays,
      setback_probability: predictionResult.setbackProbability,
      confidence_score: predictionResult.confidence,
      input_features: predictionResult.features,
      model_version: "browser-ml-v1",
    });

    if (error) {
      console.error("Error saving prediction:", error);
    } else {
      toast.success("Prediction saved successfully");
      loadPredictions();
    }
  };

  const handlePredict = async () => {
    if (!selectedAthlete || !selectedInjury) {
      toast.error("Please select an athlete and injury");
      return;
    }

    const athlete = athletes.find(a => a.id === selectedAthlete);
    const injury = injuries.find(i => i.id === selectedInjury);

    if (!athlete || !injury) return;

    await predict({
      athlete: {
        sport: athlete.sport,
        fitnessLevel: athlete.fitness_level,
        trainingHours: athlete.training_hours_per_week,
        weight: athlete.weight_kg,
        height: athlete.height_cm,
      },
      injury: {
        type: injury.injury_type,
        location: injury.body_location,
        severity: injury.severity,
        daysSinceInjury: Math.floor((Date.now() - new Date(injury.injury_date).getTime()) / (1000 * 60 * 60 * 24)),
      },
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-success text-success-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "high": return "bg-danger text-danger-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filteredInjuries = injuries.filter(inj => {
    const athlete = athletes.find(a => a.id === selectedAthlete);
    return athlete && inj.athlete_id === selectedAthlete;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ML Predictions</h1>
        <p className="text-muted-foreground">AI-powered injury risk and recovery predictions</p>
      </div>

      {/* Prediction Generator */}
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Generate Prediction</CardTitle>
          </div>
          <CardDescription>Use browser-based ML to predict recovery time and setback risk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Athlete</label>
              <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.profiles?.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Active Injury</label>
              <Select value={selectedInjury} onValueChange={setSelectedInjury}>
                <SelectTrigger><SelectValue placeholder="Select injury" /></SelectTrigger>
                <SelectContent>
                  {filteredInjuries.map((inj) => (
                    <SelectItem key={inj.id} value={inj.id}>{inj.injury_type} - {inj.body_location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handlePredict} disabled={isLoading || !selectedAthlete || !selectedInjury} className="w-full gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Run Prediction
                  </>
                )}
              </Button>
            </div>
          </div>

          {result && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Risk Level</p>
                <Badge className={`mt-1 ${getRiskColor(result.riskLevel)}`}>{result.riskLevel.toUpperCase()}</Badge>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Recovery Days</p>
                <p className="text-2xl font-bold text-primary">{result.recoveryDays}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Setback Risk</p>
                <p className="text-2xl font-bold text-warning">{Math.round(result.setbackProbability * 100)}%</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold text-success">{Math.round(result.confidence * 100)}%</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Prediction History</h2>
        <div className="grid gap-4">
          {predictions.map((pred) => (
            <Card key={pred.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{pred.athletes?.profiles?.full_name}</CardTitle>
                    <CardDescription>
                      {pred.injuries?.injury_type} - {pred.injuries?.body_location}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskColor(pred.risk_level)}>{pred.risk_level} risk</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(pred.prediction_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Recovery</p>
                      <p className="font-medium">{pred.predicted_recovery_days} days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Setback Risk</p>
                      <p className="font-medium">{Math.round((pred.setback_probability || 0) * 100)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="font-medium">{Math.round((pred.confidence_score || 0) * 100)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Severity</p>
                      <p className="font-medium capitalize">{pred.injuries?.severity}</p>
                    </div>
                  </div>
                </div>
                {pred.confidence_score && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Model Confidence</span>
                      <span>{Math.round(pred.confidence_score * 100)}%</span>
                    </div>
                    <Progress value={pred.confidence_score * 100} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
