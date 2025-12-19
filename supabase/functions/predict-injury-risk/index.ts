import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AthleteData {
  name: string;
  sport: string;
  fitnessLevel: string | null;
  trainingHours: number | null;
  weight: number | null;
  height: number | null;
  age: number | null;
}

interface InjuryData {
  type: string;
  location: string;
  severity: string;
  daysSinceInjury: number;
  diagnosis: string | null;
}

interface InjuryHistory {
  totalInjuries: number;
  recentInjuries: number;
  commonLocations: string[];
  commonTypes: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { athlete, injury, injuryHistory } = await req.json() as {
      athlete: AthleteData;
      injury: InjuryData;
      injuryHistory: InjuryHistory;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    console.log("Generating AI prediction for:", athlete.name, injury.type);

    const systemPrompt = `You are a sports medicine AI assistant specialized in injury risk assessment and recovery prediction. 
You analyze athlete data, injury details, and injury history to provide evidence-based predictions.
Always respond with a valid JSON object containing your analysis.`;

    const userPrompt = `Analyze the following athlete and injury data to predict injury risk and recovery:

ATHLETE PROFILE:
- Name: ${athlete.name}
- Sport: ${athlete.sport}
- Fitness Level: ${athlete.fitnessLevel || "Unknown"}
- Training Hours/Week: ${athlete.trainingHours || "Unknown"}
- Weight: ${athlete.weight ? `${athlete.weight} kg` : "Unknown"}
- Height: ${athlete.height ? `${athlete.height} cm` : "Unknown"}
- Age: ${athlete.age ? `${athlete.age} years` : "Unknown"}

CURRENT INJURY:
- Type: ${injury.type}
- Location: ${injury.location}
- Severity: ${injury.severity}
- Days Since Injury: ${injury.daysSinceInjury}
- Diagnosis: ${injury.diagnosis || "Not specified"}

INJURY HISTORY:
- Total Past Injuries: ${injuryHistory.totalInjuries}
- Injuries in Last 6 Months: ${injuryHistory.recentInjuries}
- Common Injury Locations: ${injuryHistory.commonLocations.join(", ") || "None"}
- Common Injury Types: ${injuryHistory.commonTypes.join(", ") || "None"}

Based on this data, provide a comprehensive injury risk assessment.`;

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
              name: "injury_risk_assessment",
              description: "Provide structured injury risk assessment and recovery prediction",
              parameters: {
                type: "object",
                properties: {
                  riskLevel: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Overall risk level for re-injury or complications",
                  },
                  predictedRecoveryDays: {
                    type: "integer",
                    description: "Estimated days until full recovery",
                  },
                  setbackProbability: {
                    type: "number",
                    description: "Probability of setback during recovery (0-1)",
                  },
                  confidenceScore: {
                    type: "number",
                    description: "Confidence in this prediction (0-1)",
                  },
                  riskFactors: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key risk factors identified",
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific recommendations for recovery",
                  },
                  analysisNotes: {
                    type: "string",
                    description: "Brief explanation of the analysis",
                  },
                },
                required: [
                  "riskLevel",
                  "predictedRecoveryDays",
                  "setbackProbability",
                  "confidenceScore",
                  "riskFactors",
                  "recommendations",
                  "analysisNotes",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "injury_risk_assessment" } },
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
    console.log("AI response received:", JSON.stringify(aiResponse));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "injury_risk_assessment") {
      console.error("Invalid tool call response:", aiResponse);
      throw new Error("Invalid AI response format");
    }

    const prediction = JSON.parse(toolCall.function.arguments);
    console.log("Parsed prediction:", prediction);

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in predict-injury-risk function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
