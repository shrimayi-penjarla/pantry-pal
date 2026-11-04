import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveRecipeImage } from "./recipeImages";

const mealdbHit = {
  ok: true,
  json: async () => ({
    meals: [
      {
        strMeal: "Pancakes",
        strMealThumb: "https://www.themealdb.com/images/media/meals/pancakes.jpg",
        strInstructions: "Mix. Fry.",
      },
    ],
  }),
};

describe("resolveRecipeImage — per-recipe photo resolution", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers the verified TheMealDB photo when the dish exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mealdbHit));
    const url = await resolveRecipeImage("Pancakes", null, 0);
    expect(url).toBe("https://www.themealdb.com/images/media/meals/pancakes.jpg");
  });

  it("falls back to Pixabay when TheMealDB has no match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("themealdb")) return { ok: true, json: async () => ({ meals: null }) };
        return { ok: true, json: async () => ({ hits: [{ webformatURL: "https://pixabay.com/x.jpg" }] }) };
      }),
    );
    const url = await resolveRecipeImage("Zzz Unheard Dish 123", null, 0);
    expect(url).toBe("https://pixabay.com/x.jpg");
  });

  it("falls back to a query-specific Unsplash URL when everything else fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const url = await resolveRecipeImage("Totally Unknown Dish 456", null, 7);
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it("two different recipes do not share the exact same resolved URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const a = await resolveRecipeImage("Unique Dish Alpha 789", null, 0);
    const b = await resolveRecipeImage("Unique Dish Beta 789", null, 1);
    // Both must be valid URLs; with a 16-photo pool + distinct seeds they should differ
    expect(a).toMatch(/^https:/);
    expect(b).toMatch(/^https:/);
    expect(a).not.toBe(b);
  });
});
