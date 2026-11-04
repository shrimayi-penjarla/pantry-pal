import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mapMeal, searchMeals, fetchRandomMeals, lookupMealByName } from "./mealdb";

const rawMeal = {
  strMeal: "Chickpea Curry",
  strMealThumb: "https://www.themealdb.com/images/media/meals/curry.jpg",
  strInstructions: "STEP 1\r\nChop onions.\r\n\r\nSTEP 2\r\nSimmer everything.",
  strCategory: "Vegetarian",
  strArea: "Indian",
  strIngredient1: "Chickpeas",
  strMeasure1: "1 can",
  strIngredient2: "Onion",
  strMeasure2: "1",
  strIngredient3: "",
  strMeasure3: "",
  strIngredient4: null,
  strMeasure4: null,
};

describe("TheMealDB mapping", () => {
  it("maps title, image, category and area", () => {
    const m = mapMeal(rawMeal);
    expect(m.title).toBe("Chickpea Curry");
    expect(m.image_url).toBe("https://www.themealdb.com/images/media/meals/curry.jpg");
    expect(m.category).toBe("Vegetarian");
    expect(m.area).toBe("Indian");
    expect(m.description).toBe("Indian · Vegetarian");
  });

  it("collects only non-empty ingredients with their measures", () => {
    const m = mapMeal(rawMeal);
    expect(m.ingredients).toEqual(["1 can Chickpeas", "1 Onion"]);
  });

  it("splits instruction blob into clean steps without STEP prefixes", () => {
    const m = mapMeal(rawMeal);
    expect(m.steps).toEqual(["Chop onions.", "Simmer everything."]);
  });

  it("estimates prep_minutes within 15–90 based on step count", () => {
    const m = mapMeal(rawMeal);
    expect(m.prep_minutes).toBeGreaterThanOrEqual(15);
    expect(m.prep_minutes).toBeLessThanOrEqual(90);
  });

  it("handles a meal with no thumb or instructions", () => {
    const m = mapMeal({ strMeal: "Mystery Dish" });
    expect(m.image_url).toBeNull();
    expect(m.steps).toEqual([]);
    expect(m.title).toBe("Mystery Dish");
  });
});

describe("TheMealDB fetching (mocked network)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("searchMeals returns mapped recipes and [] on no match", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("s=nothinghere") ? { meals: null } : { meals: [rawMeal] },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const hits = await searchMeals("curry");
    expect(hits).toHaveLength(1);
    expect(hits[0].title).toBe("Chickpea Curry");

    const none = await searchMeals("nothinghere");
    expect(none).toEqual([]);
  });

  it("searchMeals returns [] for blank queries without hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchMeals("   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lookupMealByName prefers exact title match", async () => {
    const other = { ...rawMeal, strMeal: "Chickpea Curry Deluxe" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ meals: [other, rawMeal] }) })),
    );
    const m = await lookupMealByName("Chickpea Curry");
    expect(m?.title).toBe("Chickpea Curry");
  });

  it("fetchRandomMeals dedupes by title and respects count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ meals: [rawMeal] }) })),
    );
    const meals = await fetchRandomMeals(3);
    // Every call returns the same meal → dedupe leaves exactly 1
    expect(meals).toHaveLength(1);
  });

  it("network failure resolves to [] instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(searchMeals("curry")).resolves.toEqual([]);
  });
});
