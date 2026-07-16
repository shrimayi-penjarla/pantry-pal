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
  name: "list_cookbook_recipes",
  title: "List saved recipes",
  description: "List the family's saved cookbook recipes (title, description, prep time, ingredients, steps).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max recipes to return (default 25)."),
    favorites_only: z.boolean().optional().describe("If true, return only favorited recipes."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, favorites_only }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = userClient(ctx)
      .from("cookbook_recipes")
      .select("id, title, description, prep_minutes, ingredients, steps, is_favorite, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (favorites_only) q = q.eq("is_favorite", true);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { recipes: data ?? [] },
    };
  },
});
