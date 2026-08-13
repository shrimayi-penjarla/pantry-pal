import { lookupMealByName } from "@/lib/mealdb";
import { fetchPixabayImage, unsplashFallback } from "@/lib/pixabay";

const cache = new Map<string, string>();

/**
 * Resolve a unique, relevant photo for one recipe:
 * 1. TheMealDB verified photo for the dish/keyword
 * 2. Pixabay food search on the keyword
 * 3. Query-specific Unsplash photo (never the same URL for two recipes)
 */
export async function resolveRecipeImage(
  title: string,
  keyword?: string | null,
  seed: string | number = 0,
): Promise<string> {
  const query = (keyword?.trim() || title.trim()).toLowerCase();
  const cacheKey = `${title.toLowerCase()}|${query}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let img: string | null = null;
  try {
    const meal = (await lookupMealByName(title)) ?? (keyword ? await lookupMealByName(keyword) : null);
    img = meal?.image_url ?? null;
  } catch {
    img = null;
  }
  if (!img) img = await fetchPixabayImage(query, seed);
  if (!img) img = unsplashFallback(query, seed);
  cache.set(cacheKey, img);
  return img;
}
