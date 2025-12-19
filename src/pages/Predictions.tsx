import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, AlertTriangle, Clock, TrendingUp, Activity, Loader2, Sparkles, ShieldAlert, CheckCircle2 } from "lucide-react";
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
    name: string;
    sport: string;
  };
  injuries: {
    injury_type: string;
    body_location: string;
    severity: string;
  };
}

interface AIPredictionResult {
  riskLevel: string;
  predictedRecoveryDays: number;
  setbackProbability: number;
  confidenceScore: number;
  riskFactors: string[];
  recommendations: string[];
  analysisNotes: string;
  error?: string;
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [allInjuries, setAllInjuries] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedInjury, setSelectedInjury] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIPredictionResult | null>(null);
  
  const { predict, isLoading, result } = useMLPrediction();

  useEffect(() => {
    loadPredictions();
    loadAthletes();
    loadInjuries();
    loadAllInjuries();
  }, []);

  useEffect(() => {
    if (result) {
      savePrediction(result, "browser-ml-v1");
    }
  }, [result]);

  const loadPredictions = async () => {
    const { data, error } = await supabase
      .from("predictions")
      .select(`
        *,
        athletes(name, sport),
        injuries(injury_type, body_location, severity)
      `)
      .order("prediction_date", { ascending: false });

    if (error) {
      console.error("Error loading predictions:", error);
      toast.error("Failed to load predictions");
    } else {
      setPredictions(data as any || []);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase
      .from("athletes")
      .select("id, user_id, name, sport, fitness_level, training_hours_per_week, weight_kg, height_cm, date_of_birth");
    setAthletes(data || []);
  };

  const loadInjuries = async () => {
    const { data } = await supabase
      .from("injuries")
      .select("*")
      .eq("status", "active");
    setInjuries(data || []);
  };

  const loadAllInjuries = async () => {
    const { data } = await supabase
      .from("injuries")
      .select("*")
      .order("injury_date", { ascending: false });
    setAllInjuries(data || []);
  };

  const savePrediction = async (predictionResult: any, modelVersion: string) => {
    if (!selectedAthlete || !selectedInjury) return;

    const { error } = await supabase.from("predictions").insert({
      athlete_id: selectedAthlete,
      injury_id: selectedInjury,
      risk_level: predictionResult.riskLevel as any,
      predicted_recovery_days: predictionResult.recoveryDays || predictionResult.predictedRecoveryDays,
      setback_probability: predictionResult.setbackProbability,
      confidence_score: predictionResult.confidence || predictionResult.confidenceScore,
      input_features: predictionResult.features || {
        riskFactors: predictionResult.riskFactors,
        recommendations: predictionResult.recommendations,
        analysisNotes: predictionResult.analysisNotes,
      },
      model_version: modelVersion,
    });

    if (error) {
      console.error("Error saving prediction:", error);
      toast.error(`Failed to save prediction: ${error.message}`);
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

  const handleAIPredict = async () => {
    if (!selectedAthlete || !selectedInjury) {
      toast.error("Please select an athlete and injury");
      return;
    }

    const athlete = athletes.find(a => a.id === selectedAthlete);
    const injury = injuries.find(i => i.id === selectedInjury);

    if (!athlete || !injury) return;

    setIsAILoading(true);
    setAiResult(null);

    try {
      // Calculate athlete age
      const birthDate = new Date(athlete.date_of_birth);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365));

      // Get injury history for this athlete
      const athleteInjuries = allInjuries.filter(i => i.athlete_id === selectedAthlete);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const recentInjuries = athleteInjuries.filter(i => new Date(i.injury_date) > sixMonthsAgo);
      
      const locationCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      athleteInjuries.forEach(i => {
        locationCounts[i.body_location] = (locationCounts[i.body_location] || 0) + 1;
        typeCounts[i.injury_type] = (typeCounts[i.injury_type] || 0) + 1;
      });

      const commonLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([loc]) => loc);
      
      const commonTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);

      const response = await supabase.functions.invoke("predict-injury-risk", {
        body: {
          athlete: {
            name: athlete.name || "Unknown",
            sport: athlete.sport,
            fitnessLevel: athlete.fitness_level,
            trainingHours: athlete.training_hours_per_week,
            weight: athlete.weight_kg,
            height: athlete.height_cm,
            age: age,
          },
          injury: {
            type: injury.injury_type,
            location: injury.body_location,
            severity: injury.severity,
            daysSinceInjury: Math.floor((Date.now() - new Date(injury.injury_date).getTime()) / (1000 * 60 * 60 * 24)),
            diagnosis: injury.diagnosis,
          },
          injuryHistory: {
            totalInjuries: athleteInjuries.length,
            recentInjuries: recentInjuries.length,
            commonLocations,
            commonTypes,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "AI prediction failed");
      }

      const prediction = response.data as AIPredictionResult;
      
      if (prediction.error) {
        throw new Error(prediction.error);
      }

      setAiResult(prediction);
      
      // Save the AI prediction
      await savePrediction(prediction, "ai-gemini-v1");
      
      toast.success("AI prediction generated successfully");
    } catch (error) {
      console.error("AI prediction error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate AI prediction");
    } finally {
      setIsAILoading(false);
    }
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
          <CardDescription>Choose between browser-based ML or AI-powered predictions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Athlete</label>
              <Select value={selectedAthlete} onValueChange={(v) => { setSelectedAthlete(v); setSelectedInjury(""); setAiResult(null); }}>
                <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name || "Unnamed Athlete"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Active Injury</label>
              <Select value={selectedInjury} onValueChange={(v) => { setSelectedInjury(v); setAiResult(null); }}>
                <SelectTrigger><SelectValue placeholder="Select injury" /></SelectTrigger>
                <SelectContent>
                  {filteredInjuries.map((inj) => (
                    <SelectItem key={inj.id} value={inj.id}>{inj.injury_type} - {inj.body_location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handlePredict} 
              disabled={isLoading || isAILoading || !selectedAthlete || !selectedInjury} 
              variant="outline"
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Browser ML Prediction
                </>
              )}
            </Button>
            <Button 
              onClick={handleAIPredict} 
              disabled={isLoading || isAILoading || !selectedAthlete || !selectedInjury} 
              className="w-full gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              {isAILoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI-Powered Prediction
                </>
              )}
            </Button>
          </div>

          {/* Browser ML Result */}
          {result && !aiResult && (
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

          {/* AI Result */}
          {aiResult && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Analysis Results</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-muted/50 to-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <Badge className={`mt-1 ${getRiskColor(aiResult.riskLevel)}`}>{aiResult.riskLevel.toUpperCase()}</Badge>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-muted/50 to-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Recovery Days</p>
                  <p className="text-2xl font-bold text-primary">{aiResult.predictedRecoveryDays}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-muted/50 to-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Setback Risk</p>
                  <p className="text-2xl font-bold text-warning">{Math.round(aiResult.setbackProbability * 100)}%</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-muted/50 to-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold text-success">{Math.round(aiResult.confidenceScore * 100)}%</p>
                </div>
              </div>

              {/* Risk Factors */}
              {aiResult.riskFactors && aiResult.riskFactors.length > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-sm">Risk Factors</span>
                  </div>
                  <ul className="space-y-1">
                    {aiResult.riskFactors.map((factor, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-destructive">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="font-medium text-sm">Recommendations</span>
                  </div>
                  <ul className="space-y-1">
                    {aiResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-success">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Analysis Notes */}
              {aiResult.analysisNotes && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Analysis Summary</p>
                  <p className="text-sm text-muted-foreground">{aiResult.analysisNotes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Prediction History</h2>
        <div className="grid gap-4">
          {predictions.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No predictions yet</p>
                <p className="text-sm text-muted-foreground">Select an athlete and injury above to generate a prediction</p>
              </CardContent>
            </Card>
          ) : (
            predictions.map((pred) => (
              <Card key={pred.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{pred.athletes?.name || "Unknown Athlete"}</CardTitle>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
