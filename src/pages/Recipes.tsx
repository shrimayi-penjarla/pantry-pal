import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat, Loader2, Sparkles, Clock, Refrigerator, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { daysUntil, expiryLabel, expiryStatus, statusClasses } from "@/lib/expiry";
import RecipeImage from "@/components/RecipeImage";
import RecipeDetailDialog from "@/components/RecipeDetailDialog";

interface Recipe {
  title: string;
  description: string;
  prep_minutes: number;
  uses_items: string[];
  ingredients: string[];
  steps: string[];
}

interface PantrySlim {
  id: string;
  name: string;
  expiry_date: string;
}

const Recipes = () => {
  const [pantry, setPantry] = useState<PantrySlim[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<Recipe | null>(null);

  const refreshSaved = async () => {
    const { data } = await supabase.from("cookbook_recipes").select("title");
    setSavedTitles(new Set((data ?? []).map((r) => r.title.toLowerCase())));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pantry_items")
        .select("id, name, expiry_date")
        .order("expiry_date", { ascending: true });
      setPantry(data ?? []);
    })();
    refreshSaved();
  }, []);

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
      setRecipes((data?.recipes ?? []) as Recipe[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate recipes";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const favorite = async (r: Recipe) => {
    const { error } = await supabase.from("cookbook_recipes").insert({
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
    refreshSaved();
  };

  const expiringSoon = pantry
    .map((p) => ({ ...p, d: daysUntil(p.expiry_date) }))
    .filter((p) => p.d <= 5)
    .slice(0, 6);

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
              Suggestions for what's expiring soonest in your pantry.
            </p>
          </div>
          <Button onClick={generate} disabled={loading || pantry.length === 0} variant="hero" size="lg">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {recipes.length === 0 ? "Suggest recipes" : "Refresh suggestions"}
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

      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="paper-card h-72 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {recipes.map((r, i) => {
            const saved = savedTitles.has(r.title.toLowerCase());
            return (
              <Card
                key={i}
                className="paper-card overflow-hidden flex flex-col cursor-pointer hover:-translate-y-0.5 transition-transform"
                onClick={() => setViewing(r)}
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <RecipeImage alt={r.title} rounded="" />
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
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-display text-xl leading-tight">{r.title}</h3>
                    <Badge variant="secondary" className="shrink-0 mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {r.prep_minutes}m
                    </Badge>
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
