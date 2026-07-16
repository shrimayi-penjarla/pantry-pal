import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPantryItems from "./tools/list-pantry-items";
import addPantryItem from "./tools/add-pantry-item";
import listCookbook from "./tools/list-cookbook";
import saveRecipe from "./tools/save-recipe";
import listShoppingList from "./tools/list-shopping-list";
import addShoppingItem from "./tools/add-shopping-item";

// Construct the OAuth issuer from the project ref, which Vite inlines at build
// time. Never derive it from SUPABASE_URL (that can be a proxy host that mcp-js
// rejects at token verification).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "freshtrack-mcp",
  title: "FreshTrack",
  version: "0.1.0",
  instructions:
    "Tools for FreshTrack, a family pantry & cookbook app. Read and update the signed-in family's pantry, saved cookbook recipes, and shopping list.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPantryItems, addPantryItem, listCookbook, saveRecipe, listShoppingList, addShoppingItem],
});
