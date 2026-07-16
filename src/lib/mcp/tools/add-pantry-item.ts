import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "add_pantry_item",
  title: "Add pantry item",
  description: "Add an item to the signed-in family's pantry with a name, expiry date, and optional quantity.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Item name, e.g. 'Milk'."),
    expiry_date: z.string().describe("ISO date the item expires (YYYY-MM-DD)."),
    quantity: z.string().trim().optional().describe("Optional quantity, e.g. '1 gallon'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, expiry_date, quantity }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await userClient(ctx)
      .from("pantry_items")
      .insert({ user_id: ctx.getUserId(), name, expiry_date, quantity: quantity ?? null, source: "mcp" })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Added ${data.name} (expires ${data.expiry_date}).` }],
      structuredContent: { item: data },
    };
  },
});
