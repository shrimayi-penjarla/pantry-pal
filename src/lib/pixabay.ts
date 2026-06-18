// Fast client-side food image lookup.
// Pixabay's key is a publishable read-only image-search token; safe to ship.
const PIXABAY_KEY =
  (import.meta.env.VITE_PIXABAY_API_KEY as string | undefined) ||
  "56337370-cc4fe7478bd03d0fe08a9b30a";

const cache = new Map<string, string>();

/** Instant Unsplash fallback so a relevant food photo always shows without lag. */
export function unsplashFallback(query: string, seed: string | number = 0): string {
  return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80&q=${encodeURIComponent(
    query,
  )}&sig=${encodeURIComponent(String(seed))}`;
}

/**
 * Returns a Pixabay food photo for the query; falls back to Unsplash on any
 * failure or empty result so callers always get a usable image URL.
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
