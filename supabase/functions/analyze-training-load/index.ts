import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrainingSession {
  date: string;
  duration: number;
  intensity: number;
  rpe: number | null;
  sessionType: string;
  loadScore: number | null;
}

interface AthleteData {
  name: string;
  sport: string;
  fitnessLevel: string | null;
  trainingHoursTarget: number | null;
}

interface InjuryContext {
  hasActiveInjury: boolean;
  injuryType?: string;
  injuryLocation?: string;
  severity?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { athlete, trainingSessions, injuryContext } = await req.json() as {
      athlete: AthleteData;
      trainingSessions: TrainingSession[];
      injuryContext: InjuryContext;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    console.log("Analyzing training load for:", athlete.name);

    // Calculate some statistics
    const totalSessions = trainingSessions.length;
    const avgDuration = totalSessions > 0 
      ? trainingSessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions 
      : 0;
    const avgIntensity = totalSessions > 0 
      ? trainingSessions.reduce((sum, s) => sum + s.intensity, 0) / totalSessions 
      : 0;
    const avgRPE = trainingSessions.filter(s => s.rpe).length > 0
      ? trainingSessions.filter(s => s.rpe).reduce((sum, s) => sum + (s.rpe || 0), 0) / trainingSessions.filter(s => s.rpe).length
      : null;
    
    const sessionsByType: Record<string, number> = {};
    trainingSessions.forEach(s => {
      sessionsByType[s.sessionType] = (sessionsByType[s.sessionType] || 0) + 1;
    });

    const recentSessions = trainingSessions.slice(0, 7);
    const olderSessions = trainingSessions.slice(7, 28);
    
    const recentLoad = recentSessions.reduce((sum, s) => sum + (s.loadScore || s.duration * s.intensity / 10), 0);
    const olderAvgLoad = olderSessions.length > 0 
      ? olderSessions.reduce((sum, s) => sum + (s.loadScore || s.duration * s.intensity / 10), 0) / (olderSessions.length / 7)
      : recentLoad;
    
    const acuteChronicRatio = olderAvgLoad > 0 ? recentLoad / olderAvgLoad : 1;

    const systemPrompt = `You are a sports science AI analyzing training load data. You provide evidence-based recommendations for training optimization while considering injury prevention.
Base your analysis on sports science principles like acute:chronic workload ratio, RPE monitoring, and periodization.`;

    const userPrompt = `Analyze the following training data and provide optimization recommendations:

ATHLETE PROFILE:
- Name: ${athlete.name}
- Sport: ${athlete.sport}
- Fitness Level: ${athlete.fitnessLevel || "Unknown"}
- Target Training Hours/Week: ${athlete.trainingHoursTarget || "Not specified"}

TRAINING SUMMARY (Last 28 days):
- Total Sessions: ${totalSessions}
- Average Duration: ${Math.round(avgDuration)} minutes
- Average Intensity: ${Math.round(avgIntensity * 10) / 10}/10
- Average RPE: ${avgRPE ? Math.round(avgRPE * 10) / 10 : "Not tracked"}/10
- Session Types: ${Object.entries(sessionsByType).map(([type, count]) => `${type}: ${count}`).join(", ")}
- Acute:Chronic Ratio: ${Math.round(acuteChronicRatio * 100) / 100}

RECENT SESSIONS (Last 7 days):
${recentSessions.map(s => `- ${s.date}: ${s.sessionType}, ${s.duration}min, intensity ${s.intensity}/10${s.rpe ? `, RPE ${s.rpe}/10` : ""}`).join('\n')}

INJURY CONTEXT:
${injuryContext.hasActiveInjury 
  ? `Active injury: ${injuryContext.injuryType} (${injuryContext.injuryLocation}), Severity: ${injuryContext.severity}`
  : "No active injuries"}

Provide comprehensive training load analysis and recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "training_load_analysis",
              description: "Provide structured training load analysis and recommendations",
              parameters: {
                type: "object",
                properties: {
                  loadStatus: {
                    type: "string",
                    enum: ["undertraining", "optimal", "overreaching", "overtraining"],
                    description: "Current training load status",
                  },
                  injuryRiskLevel: {
                    type: "string",
                    enum: ["low", "moderate", "high", "very_high"],
                    description: "Injury risk based on current load patterns",
                  },
                  acuteChronicAssessment: {
                    type: "string",
                    description: "Assessment of the acute:chronic workload ratio",
                  },
                  weeklyLoadRecommendation: {
                    type: "object",
                    properties: {
                      targetHours: { type: "number" },
                      targetSessions: { type: "integer" },
                      intensityDistribution: { type: "string" },
                    },
                  },
                  immediateActions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Actions to take immediately",
                  },
                  weeklyPlanSuggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string" },
                        sessionType: { type: "string" },
                        duration: { type: "integer" },
                        intensity: { type: "string" },
                      },
                    },
                  },
                  recoveryRecommendations: {
                    type: "array",
                    items: { type: "string" },
                  },
                  overallSummary: {
                    type: "string",
                  },
                },
                required: ["loadStatus", "injuryRiskLevel", "acuteChronicAssessment", "immediateActions", "recoveryRecommendations", "overallSummary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "training_load_analysis" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "training_load_analysis") {
      console.error("Invalid tool call response:", aiResponse);
      throw new Error("Invalid AI response format");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    
    // Add computed metrics to response
    analysis.computedMetrics = {
      acuteChronicRatio,
      totalSessions,
      avgDuration: Math.round(avgDuration),
      avgIntensity: Math.round(avgIntensity * 10) / 10,
      avgRPE: avgRPE ? Math.round(avgRPE * 10) / 10 : null,
      sessionsByType,
    };

    console.log("Parsed analysis:", analysis);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-training-load function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
