// Conversational recipe assistant. Takes a chat history + optional pantry items
// and returns the next assistant message. Non-streaming for simplicity.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, pantry } = (await req.json()) as {
      messages: ChatMessage[];
      pantry?: { name: string; daysUntilExpiry: number }[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pantryLine =
      pantry && pantry.length
        ? `The user's current pantry (sorted by urgency):\n${pantry
            .map((p) => `- ${p.name} (expires in ${p.daysUntilExpiry} days)`)
            .join("\n")}\n\nWhen suggesting recipes, lean on these items when possible — especially the ones expiring soonest.`
        : "The user has no pantry items listed; suggest recipes freely based on their request.";

    const system = `You are a warm, encouraging home-cooking assistant inside a cozy cookbook app called FreshTrack.
Help the user find recipes that match their needs — dietary restrictions (vegan, gluten-free, dairy-free, halal, kosher, nut allergies, etc.), meal type (breakfast, lunch, dinner, snack, dessert), cuisine (Italian, Japanese, Mexican, Indian, Thai, Mediterranean, etc.), prep time, skill level, or mood.

${pantryLine}

When you suggest a recipe, format it clearly with:
**Recipe name**
A one-line description.
Ingredients: short bullet list.
Steps: numbered, concise (≤ 6 steps).

Keep replies friendly and concise. Ask one clarifying question if their request is vague.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
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
    const reply = data?.choices?.[0]?.message?.content ?? "Sorry, I didn't catch that.";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recipe-chat error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
