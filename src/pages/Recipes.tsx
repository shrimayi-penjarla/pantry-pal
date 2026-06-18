import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat, Loader2, Sparkles, Clock, Refrigerator, Star, BookOpen, MessageCircle, Send, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { daysUntil, expiryLabel, expiryStatus, statusClasses } from "@/lib/expiry";
import RecipeImage from "@/components/RecipeImage";
import RecipeDetailDialog from "@/components/RecipeDetailDialog";
import { useAuth } from "@/hooks/useAuth";
import { fetchPixabayImage, unsplashFallback } from "@/lib/pixabay";

interface Recipe {
  title: string;
  description: string;
  prep_minutes: number;
  uses_items: string[];
  ingredients: string[];
  steps: string[];
  image_url?: string | null;
  source?: "ai" | "cookbook";
  cookbook_id?: string;
}

interface PantrySlim {
  id: string;
  name: string;
  expiry_date: string;
}

interface CookbookRow {
  id: string;
  title: string;
  description: string | null;
  ingredients: unknown;
  steps: unknown;
  uses_items: unknown;
  prep_minutes: number | null;
  image_url: string | null;
}

const toStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)) : [];

const Recipes = () => {
  const { user } = useAuth();
  const [pantry, setPantry] = useState<PantrySlim[]>([]);
  const [cookbook, setCookbook] = useState<CookbookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiRecipes, setAiRecipes] = useState<Recipe[]>([]);
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});

  const refreshCookbook = async () => {
    const { data } = await supabase
      .from("cookbook_recipes")
      .select("id, title, description, ingredients, steps, uses_items, prep_minutes, image_url");
    setCookbook((data ?? []) as CookbookRow[]);
    setSavedTitles(new Set((data ?? []).map((r) => r.title.toLowerCase())));
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("pantry_items")
        .select("id, name, expiry_date")
        .order("expiry_date", { ascending: true });
      setPantry(data ?? []);
    })();
    refreshCookbook();
  }, [user]);

  // Match cookbook recipes that use pantry items (prioritize those using soon-to-expire)
  const cookbookMatches: Recipe[] = useMemo(() => {
    if (cookbook.length === 0 || pantry.length === 0) return [];
    const pantryLower = pantry.map((p) => ({
      name: p.name.toLowerCase(),
      days: daysUntil(p.expiry_date),
    }));
    return cookbook
      .map((c) => {
        const haystack = [
          ...toStrArr(c.uses_items),
          ...toStrArr(c.ingredients),
        ].join(" ").toLowerCase();
        const matched: string[] = [];
        let urgencyScore = 0;
        for (const p of pantryLower) {
          if (p.name && haystack.includes(p.name)) {
            matched.push(p.name);
            // Lower days = higher priority (negative days = expired, big bonus)
            urgencyScore += Math.max(0, 14 - p.days);
          }
        }
        return { c, matched, urgencyScore };
      })
      .filter((x) => x.matched.length > 0)
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 4)
      .map(({ c, matched }) => ({
        title: c.title,
        description: c.description ?? "From your cookbook",
        prep_minutes: c.prep_minutes ?? 0,
        uses_items: matched,
        ingredients: toStrArr(c.ingredients),
        steps: toStrArr(c.steps),
        image_url: c.image_url,
        source: "cookbook" as const,
        cookbook_id: c.id,
      }));
  }, [cookbook, pantry]);

  const generate = async () => {
    if (pantry.length === 0) {
      toast.error("Add items to your pantry first");
      return;
    }
    setLoading(true);
    try {
      const items = pantry
        .map((p) => ({ name: p.name, daysUntilExpiry: daysUntil(p.expiry_date) }))
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 20);
      const { data, error } = await supabase.functions.invoke("suggest-recipes", {
        body: { items },
      });
      if (error) throw error;
      setAiRecipes(((data?.recipes ?? []) as Recipe[]).map((r) => ({ ...r, source: "ai" })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate recipes";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const favorite = async (r: Recipe) => {
    if (!user) return;
    const { error } = await supabase.from("cookbook_recipes").insert({
      user_id: user.id,
      title: r.title,
      description: r.description,
      ingredients: r.ingredients,
      steps: r.steps,
      uses_items: r.uses_items,
      prep_minutes: r.prep_minutes,
      source: "ai",
      is_favorite: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`"${r.title}" added to your cookbook`);
    refreshCookbook();
  };

  const expiringSoon = pantry
    .map((p) => ({ ...p, d: daysUntil(p.expiry_date) }))
    .filter((p) => p.d <= 5)
    .slice(0, 6);

  // Cookbook matches first, then AI recipes — dedupe by lower-case title
  const combined: Recipe[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Recipe[] = [];
    for (const r of [...cookbookMatches, ...aiRecipes]) {
      const key = r.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }, [cookbookMatches, aiRecipes]);

  // Show an instant Unsplash fallback for every AI recipe, then upgrade to
  // a Pixabay food photo in the background — never block the UI on the network.
  useEffect(() => {
    aiRecipes.forEach((r, idx) => {
      const key = r.title.toLowerCase();
      if (r.image_url || generatedImages[key]) return;
      // Instant fallback so the card never shows a loading state.
      setGeneratedImages((prev) =>
        prev[key] ? prev : { ...prev, [key]: unsplashFallback(r.title, idx) },
      );
      // Async upgrade — replaces with a real food photo if Pixabay returns one.
      fetchPixabayImage(r.title, idx).then((img) => {
        if (img) setGeneratedImages((prev) => ({ ...prev, [key]: img }));
      });
    });
  }, [aiRecipes, generatedImages]);

  // --- Chatbot recipe-card builder ---
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatRecipe, setChatRecipe] = useState<Recipe | null>(null);
  const [chatImage, setChatImage] = useState<string | null>(null);

  const askChat = async () => {
    const p = chatPrompt.trim();
    if (!p || chatBusy) return;
    setChatBusy(true);
    setChatRecipe(null);
    setChatImage(null);
    try {
      const items = pantry
        .map((x) => ({ name: x.name, daysUntilExpiry: daysUntil(x.expiry_date) }))
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 20);
      const { data, error } = await supabase.functions.invoke("recipe-from-prompt", {
        body: { prompt: p, pantry: items },
      });
      if (error) throw error;
      const rec = (data as { recipe?: Recipe })?.recipe;
      if (!rec) throw new Error("No recipe returned");
      setChatRecipe({ ...rec, source: "ai" });
      fetchPixabayImage(rec.title).then((img) => img && setChatImage(img));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build a recipe");
    } finally {
      setChatBusy(false);
    }
  };

  const saveChatRecipe = async () => {
    if (!chatRecipe || !user) return;
    const { error } = await supabase.from("cookbook_recipes").insert({
      user_id: user.id,
      title: chatRecipe.title,
      description: chatRecipe.description,
      ingredients: chatRecipe.ingredients,
      steps: chatRecipe.steps,
      uses_items: chatRecipe.uses_items,
      prep_minutes: chatRecipe.prep_minutes,
      image_url: chatImage,
      source: "ai",
      is_favorite: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`"${chatRecipe.title}" saved to your cookbook`);
    refreshCookbook();
  };



  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-hand text-2xl text-accent leading-none">Fresh from the kitchen</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl tracking-tight flex items-center gap-3">
              <ChefHat className="h-7 w-7 text-primary" /> Recipe ideas
            </h1>
            <p className="text-sm text-muted-foreground italic mt-1">
              Suggestions for what's expiring soonest — favorites from your cookbook first.
            </p>
          </div>
          <Button onClick={generate} disabled={loading || pantry.length === 0} variant="hero" size="lg">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {aiRecipes.length === 0 ? "Suggest recipes" : "Refresh suggestions"}
          </Button>
        </div>
        <hr className="rule-divider" />
      </header>

      {pantry.length === 0 && (
        <Card className="paper-card p-8 text-center relative">
          <span className="tape" />
          <Refrigerator className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="font-display text-xl">Your pantry is empty</p>
          <p className="text-sm text-muted-foreground italic mt-1 mb-4">
            Add items first so we know what to cook with.
          </p>
          <Button asChild variant="accent">
            <Link to="/scan">Scan a receipt or fridge</Link>
          </Button>
        </Card>
      )}

      {expiringSoon.length > 0 && (
        <Card className="paper-card p-4">
          <p className="font-hand text-xl text-primary mb-2">Cooking with…</p>
          <div className="flex flex-wrap gap-2">
            {expiringSoon.map((p) => (
              <span
                key={p.id}
                className={`text-xs px-2 py-1 rounded-full border ${statusClasses(expiryStatus(p.expiry_date))}`}
              >
                {p.name} · {expiryLabel(p.expiry_date)}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Recipe chatbot — design-a-card */}
      <Card className="paper-card p-5 relative">
        <span className="tape" />
        <div className="flex items-start gap-3 mb-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent border border-border/60">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-display text-xl leading-tight">Design a recipe card</p>
            <p className="text-sm text-muted-foreground italic">
              Tell me what you're craving — diet, cuisine, meal type — and I'll draft a card you can save to your cookbook.
            </p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            askChat();
          }}
          className="flex gap-2 items-end"
        >
          <Textarea
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                askChat();
              }
            }}
            rows={1}
            placeholder="e.g. gluten-free Thai lunch in 25 min"
            className="resize-none min-h-[44px] max-h-32"
            disabled={chatBusy}
          />
          <Button type="submit" size="icon" disabled={chatBusy || !chatPrompt.trim()}>
            {chatBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {chatRecipe && (
          <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr] items-start animate-fade-in">
            <div className="aspect-[4/3] sm:aspect-square overflow-hidden rounded-md border border-border bg-secondary">
              <RecipeImage src={chatImage} alt={chatRecipe.title} rounded="" />
            </div>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl leading-tight">{chatRecipe.title}</h3>
                {chatRecipe.prep_minutes > 0 && (
                  <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{chatRecipe.prep_minutes}m</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground italic">{chatRecipe.description}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="hero" onClick={saveChatRecipe}>
                  <Save className="h-4 w-4" /> Save to cookbook
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewing({ ...chatRecipe, image_url: chatImage })}>
                  View full recipe
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="paper-card h-72 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && combined.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {combined.map((r, i) => {
            const saved = savedTitles.has(r.title.toLowerCase());
            const fromCookbook = r.source === "cookbook";
            return (
              <Card
                key={i}
                className="paper-card overflow-hidden flex flex-col cursor-pointer hover:-translate-y-0.5 transition-transform"
                onClick={() => setViewing(r)}
              >
                <div className="aspect-[4/3] overflow-hidden relative bg-secondary">
                  <RecipeImage
                    src={r.image_url ?? generatedImages[r.title.toLowerCase()] ?? null}
                    alt={r.title}
                    rounded=""
                  />
                  {fromCookbook ? (
                    <span className="absolute top-2 left-2 flex items-center gap-1 font-hand text-base px-2 py-0.5 bg-card/95 border border-border rounded-sm rotate-[-3deg]">
                      <BookOpen className="h-3.5 w-3.5 text-primary" /> from cookbook
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={saved ? "Already in cookbook" : "Save to cookbook"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!saved) favorite(r);
                      }}
                      className="absolute top-2 right-2 h-9 w-9 rounded-full bg-card/95 border border-border flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          saved ? "fill-accent text-accent" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-display text-xl leading-tight">{r.title}</h3>
                    {r.prep_minutes > 0 && (
                      <Badge variant="secondary" className="shrink-0 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {r.prep_minutes}m
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground italic line-clamp-2">
                    {r.description}
                  </p>
                  {r.uses_items?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {r.uses_items.slice(0, 4).map((u, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/30"
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RecipeDetailDialog
        open={!!viewing}
        recipe={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
};

export default Recipes;
