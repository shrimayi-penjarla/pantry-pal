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
  name: "add_shopping_list_item",
  title: "Add shopping list item",
  description: "Add an item to the family's shopping list.",
  inputSchema: {
    name: z.string().trim().min(1),
    quantity: z.string().trim().optional(),
    reason: z.string().trim().optional().describe("Optional note, e.g. 'for tonight's dinner'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, quantity, reason }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await userClient(ctx)
      .from("shopping_list_items")
      .insert({
        user_id: ctx.getUserId(),
        name,
        quantity: quantity ?? null,
        reason: reason ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Added ${data.name} to shopping list.` }],
      structuredContent: { item: data },
    };
  },
});
