// Fast client-side food image lookup.
// Pixabay's key is a publishable read-only image-search token; safe to ship.
const PIXABAY_KEY =
  (import.meta.env.VITE_PIXABAY_API_KEY as string | undefined) ||
  "56337370-cc4fe7478bd03d0fe08a9b30a";

const cache = new Map<string, string>();

// Distinct real Unsplash CDN food photos. `source.unsplash.com` was retired, so
// we hash the query into this pool instead — that keeps the instant placeholder
// unique per recipe rather than every card sharing one URL.
const UNSPLASH_POOL = [
  "photo-1546069901-ba9599a7e63c", // salad bowl
  "photo-1512621776951-a57141f2eefd", // veggie bowl
  "photo-1476224203421-9ac39bcb3327", // avocado toast
  "photo-1567620905732-2d1ec7ab7445", // pancakes
  "photo-1565299624946-b28f40a0ae38", // pizza
  "photo-1555939594-58d7cb561ad1", // roast plate
  "photo-1473093295043-cdd812d0e601", // pasta
  "photo-1490645935967-10de6ba17061", // healthy spread
  "photo-1504674900247-0877df9cc836", // steak dinner
  "photo-1482049016688-2d3e1b311543", // breakfast bowl
  "photo-1414235077428-338989a2e8c0", // restaurant dish
  "photo-1512058564366-18510be2db19", // smoothies
  "photo-1499636136210-6f4ee915583e", // soup
  "photo-1498837167922-ddd27525d352", // dessert table
  "photo-1467003909585-2f8a72700288", // fish dish
  "photo-1540189549336-e6e99c3679fe", // grain bowl
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Instant, query-specific Unsplash photo so a relevant image always shows without lag. */
export function unsplashFallback(query: string, seed: string | number = 0): string {
  const id =
    UNSPLASH_POOL[(hash(`${query}|${seed}`) % UNSPLASH_POOL.length + UNSPLASH_POOL.length) % UNSPLASH_POOL.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=600&q=80`;
}

/**
 * Returns a Pixabay food photo for the query; falls back to a query-specific
 * Unsplash photo on any failure or empty result.
 */
export async function fetchPixabayImage(
  query: string,
  seed: string | number = 0,
): Promise<string> {
  const key = query.trim().toLowerCase();
  if (!key) return unsplashFallback(query || "food", seed);
  const cached = cache.get(key);
  if (cached) return cached;

  const fallback = unsplashFallback(query, seed);
  if (!PIXABAY_KEY) {
    cache.set(key, fallback);
    return fallback;
  }
  try {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(
      query,
    )}&image_type=photo&category=food&per_page=3&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) {
      cache.set(key, fallback);
      return fallback;
    }
    const data = (await res.json()) as {
      hits?: { webformatURL?: string; largeImageURL?: string }[];
    };
    const hit = data.hits?.find((h) => h.webformatURL || h.largeImageURL);
    const img = hit?.webformatURL ?? hit?.largeImageURL ?? fallback;
    cache.set(key, img);
    return img;
  } catch (e) {
    console.warn("pixabay fetch failed, using Unsplash fallback", e);
    cache.set(key, fallback);
    return fallback;
  }
}
