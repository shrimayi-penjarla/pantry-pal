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
  name: "save_recipe_to_cookbook",
  title: "Save recipe to cookbook",
  description: "Save a recipe to the family's cookbook for later.",
  inputSchema: {
    title: z.string().trim().min(1),
    description: z.string().optional(),
    prep_minutes: z.number().int().min(0).optional(),
    ingredients: z.array(z.string()).describe("Ingredient lines."),
    steps: z.array(z.string()).describe("Ordered preparation steps."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await userClient(ctx)
      .from("cookbook_recipes")
      .insert({
        user_id: ctx.getUserId(),
        title: input.title,
        description: input.description ?? null,
        prep_minutes: input.prep_minutes ?? null,
        ingredients: input.ingredients,
        steps: input.steps,
        source: "mcp",
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved "${data.title}" to cookbook.` }],
      structuredContent: { recipe: data },
    };
  },
});
