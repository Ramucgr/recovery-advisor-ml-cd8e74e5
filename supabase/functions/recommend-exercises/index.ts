import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InjuryData {
  type: string;
  location: string;
  severity: string;
  daysSinceInjury: number;
  currentPhase: string;
}

interface AthleteData {
  sport: string;
  fitnessLevel: string | null;
  age: number | null;
}

interface ExerciseLibrary {
  id: string;
  name: string;
  body_part: string;
  category: string;
  difficulty: string;
  description: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { injury, athlete, availableExercises } = await req.json() as {
      injury: InjuryData;
      athlete: AthleteData;
      availableExercises: ExerciseLibrary[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    console.log("Generating exercise recommendations for:", injury.type, injury.location);

    const exerciseList = availableExercises.map(e => 
      `- ${e.name} (${e.body_part}, ${e.category}, ${e.difficulty}): ${e.description || 'No description'}`
    ).join('\n');

    const systemPrompt = `You are a sports rehabilitation AI specialist. You recommend appropriate exercises from a given library based on injury type, recovery phase, and athlete profile. 
Always prioritize safety and progressive rehabilitation.`;

    const userPrompt = `Based on the following injury and athlete profile, recommend the most suitable exercises from the available library.

INJURY DETAILS:
- Type: ${injury.type}
- Body Location: ${injury.location}
- Severity: ${injury.severity}
- Days Since Injury: ${injury.daysSinceInjury}
- Current Rehab Phase: ${injury.currentPhase}

ATHLETE PROFILE:
- Sport: ${athlete.sport}
- Fitness Level: ${athlete.fitnessLevel || "Unknown"}
- Age: ${athlete.age ? `${athlete.age} years` : "Unknown"}

AVAILABLE EXERCISES:
${exerciseList}

Select the most appropriate exercises for this rehabilitation stage and provide guidance.`;

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
              name: "exercise_recommendations",
              description: "Provide structured exercise recommendations for rehabilitation",
              parameters: {
                type: "object",
                properties: {
                  recommendedExercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exerciseName: { type: "string" },
                        priority: { type: "string", enum: ["essential", "recommended", "optional"] },
                        setsRecommended: { type: "integer" },
                        repsRecommended: { type: "integer" },
                        frequency: { type: "string" },
                        notes: { type: "string" },
                      },
                      required: ["exerciseName", "priority", "notes"],
                    },
                  },
                  exercisesToAvoid: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exercises that should be avoided at this stage",
                  },
                  progressionPlan: {
                    type: "string",
                    description: "Brief description of how to progress exercises over time",
                  },
                  warningsSigns: {
                    type: "array",
                    items: { type: "string" },
                    description: "Signs to stop or modify exercises",
                  },
                  overallGuidance: {
                    type: "string",
                    description: "General rehabilitation guidance",
                  },
                },
                required: ["recommendedExercises", "exercisesToAvoid", "progressionPlan", "warningsSigns", "overallGuidance"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "exercise_recommendations" } },
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
    if (!toolCall || toolCall.function.name !== "exercise_recommendations") {
      console.error("Invalid tool call response:", aiResponse);
      throw new Error("Invalid AI response format");
    }

    const recommendations = JSON.parse(toolCall.function.arguments);
    console.log("Parsed recommendations:", recommendations);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in recommend-exercises function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
