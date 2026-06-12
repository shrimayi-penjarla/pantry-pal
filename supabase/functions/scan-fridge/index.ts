// Fridge photo → identify food items + estimated remaining freshness via Lovable AI (Gemini Vision)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You look at a photo of the inside of a fridge (or food on a counter) and identify every distinct food / drink item visible.
For EACH item:
- name: clean, human-friendly name in Title Case (e.g. "Carrots", "Cheddar Cheese", "Leftover Pasta")
- quantity: short string like "1 carton", "half a loaf", "small bunch", or null
- estimated_shelf_life_days: integer typical remaining shelf life ASSUMING the item is already in a home fridge and looks fresh in the photo (e.g. leafy greens ~4, milk in carton ~7, eggs ~21, hard cheese ~21, cooked leftovers ~3, fresh meat ~2, condiments ~120). Be conservative.

Group obvious multiples (e.g. several apples) as ONE item with an appropriate quantity.
Skip the fridge itself, shelves, containers without identifiable food.
If the image clearly has no food, return an empty array.
Return STRICT JSON only via the provided tool.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

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
          {
            role: "user",
            content: [
              { type: "text", text: "Identify the food items visible in this fridge photo." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_items",
              description: "Return the identified fridge items.",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        quantity: { type: ["string", "null"] },
                        estimated_shelf_life_days: { type: "integer" },
                      },
                      required: ["name", "estimated_shelf_life_days"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_items" } },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
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
    let parsed: { items: Array<{ name: string; quantity: string | null; estimated_shelf_life_days: number }> } = { items: [] };
    if (typeof args === "string") {
      try { parsed = JSON.parse(args); } catch (e) { console.error("Failed to parse tool args:", args); }
    } else if (args && typeof args === "object") {
      parsed = args;
    }

    return new Response(JSON.stringify({ items: parsed.items ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-fridge error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
