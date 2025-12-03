import { useState, useCallback } from "react";

interface AthleteData {
  sport: string;
  fitnessLevel: string;
  trainingHours: number;
  weight: number;
  height: number;
}

interface InjuryData {
  type: string;
  location: string;
  severity: string;
  daysSinceInjury: number;
}

interface PredictionInput {
  athlete: AthleteData;
  injury: InjuryData;
}

interface PredictionResult {
  riskLevel: "low" | "medium" | "high";
  recoveryDays: number;
  setbackProbability: number;
  confidence: number;
  features: Record<string, any>;
}

// Severity weights for recovery calculation
const SEVERITY_WEIGHTS: Record<string, number> = {
  minor: 1,
  moderate: 2,
  severe: 3.5,
  critical: 5,
};

// Base recovery days by injury type
const BASE_RECOVERY: Record<string, number> = {
  sprain: 14,
  strain: 21,
  fracture: 56,
  tear: 42,
  contusion: 7,
  dislocation: 28,
  tendinitis: 21,
  default: 21,
};

// Fitness level impact
const FITNESS_MULTIPLIER: Record<string, number> = {
  excellent: 0.7,
  good: 0.85,
  average: 1.0,
  poor: 1.3,
  default: 1.0,
};

export function useMLPrediction() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(async (input: PredictionInput): Promise<PredictionResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate features
      const severityWeight = SEVERITY_WEIGHTS[input.injury.severity.toLowerCase()] || 2;
      const baseRecovery = BASE_RECOVERY[input.injury.type.toLowerCase()] || BASE_RECOVERY.default;
      const fitnessMultiplier = FITNESS_MULTIPLIER[input.athlete.fitnessLevel?.toLowerCase()] || 1.0;

      // BMI calculation for health factor
      const heightM = (input.athlete.height || 170) / 100;
      const bmi = (input.athlete.weight || 70) / (heightM * heightM);
      const bmiImpact = bmi > 30 ? 1.2 : bmi < 18.5 ? 1.15 : 1.0;

      // Training hours impact (more training = faster recovery, but overtrained = slower)
      const trainingImpact = input.athlete.trainingHours > 30 ? 1.1 : 
                           input.athlete.trainingHours > 15 ? 0.9 : 1.0;

      // Calculate recovery days
      const recoveryDays = Math.round(
        baseRecovery * severityWeight * fitnessMultiplier * bmiImpact * trainingImpact
      );

      // Calculate setback probability based on severity and fitness
      const setbackBase = severityWeight * 0.1;
      const setbackFitness = (1 - (fitnessMultiplier - 0.7) / 0.6) * 0.15;
      const setbackProbability = Math.min(0.9, Math.max(0.05, setbackBase + setbackFitness + (input.injury.daysSinceInjury < 7 ? 0.1 : 0)));

      // Determine risk level
      let riskLevel: "low" | "medium" | "high";
      const riskScore = (severityWeight / 5) * 0.4 + setbackProbability * 0.3 + (bmiImpact > 1 ? 0.2 : 0) + (trainingImpact > 1 ? 0.1 : 0);
      
      if (riskScore < 0.3) {
        riskLevel = "low";
      } else if (riskScore < 0.6) {
        riskLevel = "medium";
      } else {
        riskLevel = "high";
      }

      // Confidence based on data completeness
      const dataPoints = [
        input.athlete.sport,
        input.athlete.fitnessLevel,
        input.athlete.trainingHours,
        input.athlete.weight,
        input.athlete.height,
        input.injury.type,
        input.injury.severity,
      ].filter(Boolean).length;
      const confidence = Math.min(0.95, 0.6 + (dataPoints / 7) * 0.35);

      // Note: Browser-based ML uses rule-based prediction for reliability
      // The @huggingface/transformers models can be slow to load in browser
      // This implementation prioritizes speed and reliability

      const prediction: PredictionResult = {
        riskLevel,
        recoveryDays,
        setbackProbability,
        confidence,
        features: {
          severityWeight,
          baseRecovery,
          fitnessMultiplier,
          bmiImpact,
          trainingImpact,
          bmi: Math.round(bmi * 10) / 10,
          riskScore: Math.round(riskScore * 100) / 100,
        },
      };

      setResult(prediction);
      return prediction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Prediction failed";
      setError(errorMessage);
      console.error("ML Prediction error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    predict,
    isLoading,
    result,
    error,
    reset: () => setResult(null),
  };
}
