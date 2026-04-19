import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat, Loader2, Sparkles, Clock, Refrigerator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { daysUntil, expiryLabel, expiryStatus, statusClasses } from "@/lib/expiry";

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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pantry_items")
        .select("id, name, expiry_date")
        .order("expiry_date", { ascending: true });
      setPantry(data ?? []);
    })();
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

  const expiringSoon = pantry
    .map((p) => ({ ...p, d: daysUntil(p.expiry_date) }))
    .filter((p) => p.d <= 5)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" /> Recipe ideas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI suggestions that prioritize what's expiring soonest in your pantry.
          </p>
        </div>
        <Button onClick={generate} disabled={loading || pantry.length === 0} variant="hero" size="lg">
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {recipes.length === 0 ? "Suggest recipes" : "Refresh suggestions"}
        </Button>
      </header>

      {pantry.length === 0 && (
        <Card className="p-8 text-center bg-gradient-warm border-0 shadow-soft">
          <Refrigerator className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="font-medium">Your pantry is empty</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add items first so we know what to cook with.
          </p>
          <Button asChild variant="accent">
            <Link to="/scan">Scan a receipt</Link>
          </Button>
        </Card>
      )}

      {expiringSoon.length > 0 && (
        <Card className="p-4 shadow-soft">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Cooking with
          </p>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5 h-56 bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {recipes.map((r, i) => (
            <Card key={i} className="p-5 shadow-soft hover:shadow-lifted transition-shadow flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold leading-tight">{r.title}</h3>
                <Badge variant="secondary" className="shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  {r.prep_minutes}m
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{r.description}</p>

              {r.uses_items?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {r.uses_items.map((u, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              )}

              <details className="text-sm mt-auto group">
                <summary className="cursor-pointer text-primary font-medium select-none">
                  View recipe
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      Ingredients
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {r.ingredients.map((ing, idx) => (
                        <li key={idx}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      Steps
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                      {r.steps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recipes;
