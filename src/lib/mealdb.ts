// TheMealDB — free public recipe API with validated recipes + real photos.
const BASE = "https://www.themealdb.com/api/json/v1/1";

export interface MealDbRecipe {
  title: string;
  description: string;
  prep_minutes: number;
  uses_items: string[];
  ingredients: string[];
  steps: string[];
  image_url: string | null;
  category?: string;
  area?: string;
}

interface RawMeal {
  strMeal: string;
  strMealThumb?: string | null;
  strInstructions?: string | null;
  strCategory?: string | null;
  strArea?: string | null;
  [k: string]: unknown;
}

/** Collect strIngredient1..20 with their strMeasure1..20 into a clean array. */
function collectIngredients(meal: RawMeal): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = String(meal[`strIngredient${i}`] ?? "").trim();
    if (!ing) continue;
    const measure = String(meal[`strMeasure${i}`] ?? "").trim();
    out.push(measure ? `${measure} ${ing}` : ing);
  }
  return out;
}

/** Split TheMealDB's single instruction blob into readable steps. */
function collectSteps(meal: RawMeal): string[] {
  const raw = String(meal.strInstructions ?? "").replace(/\r/g, "");
  return raw
    .split(/\n+|(?<=\.)\s{2,}/g)
    .map((s) => s.replace(/^\s*(STEP\s*\d+[:.)]?)\s*/i, "").trim())
    .filter((s) => s.length > 2);
}

export function mapMeal(meal: RawMeal): MealDbRecipe {
  const steps = collectSteps(meal);
  const area = meal.strArea ? String(meal.strArea) : "";
  const category = meal.strCategory ? String(meal.strCategory) : "";
  return {
    title: String(meal.strMeal ?? "").trim(),
    description:
      [area, category].filter(Boolean).join(" · ") ||
      "A classic dish from TheMealDB",
    // TheMealDB has no prep time; estimate from step count so cards stay useful.
    prep_minutes: Math.max(15, Math.min(90, steps.length * 8)),
    uses_items: [],
    ingredients: collectIngredients(meal),
    steps,
    image_url: meal.strMealThumb ? String(meal.strMealThumb) : null,
    category,
    area,
  };
}

async function getJson(url: string): Promise<{ meals?: RawMeal[] | null } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as { meals?: RawMeal[] | null };
  } catch (e) {
    console.warn("TheMealDB request failed", e);
    return null;
  }
}

/** Search real recipes by name/keyword. Returns [] when nothing matches. */
export async function searchMeals(query: string): Promise<MealDbRecipe[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await getJson(`${BASE}/search.php?s=${encodeURIComponent(q)}`);
  return (data?.meals ?? []).map(mapMeal).filter((m) => m.title);
}

/** Search by a single main ingredient (filter endpoint returns thumbs only). */
export async function searchMealsByIngredient(ingredient: string): Promise<string[]> {
  const q = ingredient.trim();
  if (!q) return [];
  const data = await getJson(`${BASE}/filter.php?i=${encodeURIComponent(q)}`);
  return (data?.meals ?? []).map((m) => String(m.strMeal ?? "")).filter(Boolean);
}

/** Fetch a single verified recipe by exact-ish name. */
export async function lookupMealByName(name: string): Promise<MealDbRecipe | null> {
  const matches = await searchMeals(name);
  if (matches.length === 0) return null;
  const lower = name.trim().toLowerCase();
  return (
    matches.find((m) => m.title.toLowerCase() === lower) ??
    matches.find((m) => m.title.toLowerCase().includes(lower)) ??
    matches[0]
  );
}

/** N distinct random verified recipes. */
export async function fetchRandomMeals(count: number): Promise<MealDbRecipe[]> {
  const results: MealDbRecipe[] = [];
  const seen = new Set<string>();
  // random.php returns one meal per call.
  const batches = await Promise.all(
    Array.from({ length: count + 2 }, () => getJson(`${BASE}/random.php`)),
  );
  for (const b of batches) {
    const meal = b?.meals?.[0];
    if (!meal) continue;
    const mapped = mapMeal(meal);
    const key = mapped.title.toLowerCase();
    if (!mapped.title || seen.has(key)) continue;
    seen.add(key);
    results.push(mapped);
    if (results.length >= count) break;
  }
  return results;
}
