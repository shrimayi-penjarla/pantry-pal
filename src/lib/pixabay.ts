// Pixabay image search — returns a usable image URL for a query, or null.
// API key is a public/publishable key (Pixabay tokens are scoped to read-only image search).
const PIXABAY_KEY = "56337370-cc4fe7478bd03d0fe08a9b30a";

const cache = new Map<string, string | null>();

export async function fetchPixabayImage(query: string): Promise<string | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(
      query + " food",
    )}&image_type=photo&category=food&safesearch=true&per_page=5&orientation=horizontal`;
    const res = await fetch(url);
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await res.json()) as { hits?: { webformatURL?: string; largeImageURL?: string }[] };
    const hit = data.hits?.[0];
    const img = hit?.largeImageURL ?? hit?.webformatURL ?? null;
    cache.set(key, img);
    return img;
  } catch (e) {
    console.error("pixabay error", e);
    cache.set(key, null);
    return null;
  }
}
