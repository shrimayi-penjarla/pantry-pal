import { describe, it, expect, vi, afterEach } from "vitest";
import { unsplashFallback, fetchPixabayImage } from "./pixabay";

describe("recipe image fallbacks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unsplashFallback returns a valid Unsplash CDN URL", () => {
    const url = unsplashFallback("banana smoothie", 0);
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
    expect(url).toContain("w=800");
  });

  it("different recipes never share the exact same hardcoded URL pool entry blindly — query+seed decide", () => {
    const a = unsplashFallback("banana smoothie", 0);
    const b = unsplashFallback("banana smoothie", 1);
    const c = unsplashFallback("cucumber salad", 0);
    // Same query+seed is deterministic…
    expect(unsplashFallback("banana smoothie", 0)).toBe(a);
    // …and the pool is large enough that distinct queries/seeds can differ
    const all = new Set([a, b, c, unsplashFallback("paratha", 2), unsplashFallback("soup", 3)]);
    expect(all.size).toBeGreaterThan(1);
  });

  it("fetchPixabayImage returns Pixabay hit URL when the API responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ hits: [{ webformatURL: "https://pixabay.com/get/tomato.jpg" }] }),
      })),
    );
    const url = await fetchPixabayImage("tomato soup test-1");
    expect(url).toBe("https://pixabay.com/get/tomato.jpg");
  });

  it("fetchPixabayImage falls back to a query-specific Unsplash URL on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    const url = await fetchPixabayImage("tomato soup test-2");
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it("fetchPixabayImage falls back on empty hits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ hits: [] }) })),
    );
    const url = await fetchPixabayImage("tomato soup test-3");
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });
});
