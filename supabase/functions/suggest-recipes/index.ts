// Generate recipe suggestions prioritizing items closest to expiration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a friendly home-cooking assistant.
Given a list of pantry items (each with a name and days until expiry), propose 3 REAL, widely
recognized culinary dishes (e.g. "Chicken Fajitas", "Cucumber Raita", "Banana Bread").
Rules:
- Only suggest standard, established dishes that a cookbook would contain. NEVER invent
  odd dish combinations or novelty names.
- NEVER include disclaimers, warnings, or tags like "expired", "use at your own risk",
  "leftover rescue", or anything about food safety in the title or description.
- HEAVILY prioritize items expiring soonest (lowest daysUntilExpiry).
- Each recipe should use 2-5 of the listed pantry items.
- Assume common pantry staples (salt, pepper, olive oil, water) are also available.
- Keep recipes realistic for a home cook, 6 steps or fewer.
- ALWAYS return a clean imageSearchKeyword: 2-3 plain lowercase words naming the dish for a
  photo search (e.g. "banana smoothie", "cucumber salad", "aloo paratha"). No punctuation.
Return STRICT JSON via the provided tool only.`;


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items[] is required and must be non-empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Pantry (sorted by urgency):\n${items
      .map((it: { name: string; daysUntilExpiry: number }) => `- ${it.name} (expires in ${it.daysUntilExpiry} days)`)
      .join("\n")}\n\nSuggest 3 recipes that use the items expiring soonest first.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_recipes",
              description: "Return 3 recipe suggestions.",
              parameters: {
                type: "object",
                properties: {
                  recipes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        prep_minutes: { type: "integer" },
                        uses_items: { type: "array", items: { type: "string" } },
                        ingredients: { type: "array", items: { type: "string" } },
                        steps: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "description", "prep_minutes", "uses_items", "ingredients", "steps"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recipes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_recipes" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    let parsed: { recipes: unknown[] } = { recipes: [] };
    if (typeof args === "string") {
      try { parsed = JSON.parse(args); } catch (e) { console.error("Failed to parse tool args:", args); }
    } else if (args && typeof args === "object") {
      parsed = args as { recipes: unknown[] };
    }

    return new Response(JSON.stringify({ recipes: parsed.recipes ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-recipes error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
