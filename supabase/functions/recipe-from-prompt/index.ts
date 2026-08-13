// Generate a single recipe card from a user's natural-language prompt.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a friendly home-cooking assistant. Create ONE complete recipe
matching the user's request (cuisine, diet, meal type, prep time, mood, etc.). If pantry items
are provided, try to use them when they fit. Keep it realistic for a home cook, max 8 steps.
Return STRICT JSON via the provided tool only.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { prompt, pantry } = (await req.json()) as {
      prompt: string;
      pantry?: { name: string; daysUntilExpiry: number }[];
    };
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pantryLine =
      pantry && pantry.length
        ? `Available pantry items (lean on the ones expiring soonest when they fit):\n${pantry
            .map((p) => `- ${p.name} (expires in ${p.daysUntilExpiry} days)`)
            .join("\n")}`
        : "No pantry items provided — pick reasonable ingredients freely.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${pantryLine}\n\nUser request: ${prompt}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_recipe",
              description: "Return one recipe matching the user's request.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  prep_minutes: { type: "integer" },
                  imageSearchKeyword: { type: "string" },
                  uses_items: { type: "array", items: { type: "string" } },
                  ingredients: { type: "array", items: { type: "string" } },
                  steps: { type: "array", items: { type: "string" } },
                },
                required: ["title", "description", "prep_minutes", "imageSearchKeyword", "uses_items", "ingredients", "steps"],
                additionalProperties: false,
              },

            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_recipe" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      const status = response.status === 429 || response.status === 402 ? response.status : 500;
      const msg =
        response.status === 429
          ? "Rate limit exceeded. Please try again in a moment."
          : response.status === 402
            ? "AI credits exhausted. Add credits in Settings → Workspace → Usage."
            : "AI gateway error";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    let recipe: unknown = null;
    if (typeof args === "string") {
      try { recipe = JSON.parse(args); } catch (e) { console.error("parse fail", args); }
    } else if (args && typeof args === "object") {
      recipe = args;
    }
    if (!recipe) {
      return new Response(JSON.stringify({ error: "Could not build a recipe — try rewording." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recipe-from-prompt error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
