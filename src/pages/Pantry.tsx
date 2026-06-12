import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, ScanLine, ChefHat, Refrigerator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { daysUntil, expiryLabel, expiryStatus, statusClasses } from "@/lib/expiry";

interface PantryItem {
  id: string;
  name: string;
  quantity: string | null;
  expiry_date: string;
  added_on: string;
}

const Pantry = () => {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pantry_items")
      .select("id, name, quantity, expiry_date, added_on")
      .order("expiry_date", { ascending: true });
    if (error) {
      toast.error("Failed to load pantry");
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    const prev = items;
    setItems((x) => x.filter((i) => i.id !== id));
    const { error } = await supabase.from("pantry_items").delete().eq("id", id);
    if (error) {
      setItems(prev);
      toast.error("Could not remove item");
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, PantryItem[]> = { expired: [], urgent: [], soon: [], fresh: [] };
    for (const it of items) g[expiryStatus(it.expiry_date)].push(it);
    return g;
  }, [items]);

  const sectionTitles: Record<string, string> = {
    expired: "Already expired",
    urgent: "Use today or tomorrow",
    soon: "Use this week",
    fresh: "Plenty of time",
  };

  return (
    <div className="space-y-8">
      {items.length === 0 && !loading && (
        <Card className="paper-card overflow-hidden relative">
          <span className="tape" />
          <div className="p-8 sm:p-10 flex flex-col gap-4 text-center max-w-xl mx-auto">
            <Badge className="w-fit mx-auto bg-primary-soft text-primary hover:bg-primary-soft border border-primary/30">
              Welcome to the kitchen
            </Badge>
            <p className="font-hand text-3xl text-accent leading-none">a fresh start</p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Your pantry, kept like a recipe book.
            </h1>
            <p className="text-muted-foreground italic">
              Scan a grocery receipt or snap a photo inside your fridge — we'll add every
              item with an estimated expiry date and suggest what to cook first.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 justify-center">
              <Button asChild variant="hero" size="lg">
                <Link to="/scan">
                  <ScanLine /> Start scanning
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/recipes">
                  <ChefHat /> See recipes
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <section className="space-y-2">
        <p className="font-hand text-2xl text-accent leading-none">What's in the kitchen</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl tracking-tight flex items-center gap-3">
              <Refrigerator className="h-7 w-7 text-primary" /> Pantry
            </h1>
            <p className="text-sm text-muted-foreground italic mt-1">
              {items.length} item{items.length === 1 ? "" : "s"} tracked.
            </p>
          </div>
          <Button asChild variant="hero">
            <Link to="/scan">
              <Plus /> Add items
            </Link>
          </Button>
        </div>
        <hr className="rule-divider" />
      </section>

      {loading && <p className="text-muted-foreground italic">Opening the larder…</p>}

      {!loading &&
        (["expired", "urgent", "soon", "fresh"] as const).map((bucket) => {
          const list = grouped[bucket];
          if (list.length === 0) return null;
          return (
            <section key={bucket} className="space-y-3">
              <h2 className="font-display text-xl text-foreground/90 flex items-center gap-2">
                <span>{sectionTitles[bucket]}</span>
                <span className="font-hand text-2xl text-accent leading-none">· {list.length}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((it) => {
                  const status = expiryStatus(it.expiry_date);
                  return (
                    <Card
                      key={it.id}
                      className="paper-card p-4 flex items-start justify-between gap-3 hover:-translate-y-0.5 transition-transform"
                    >
                      <div className="min-w-0">
                        <p className="font-display text-lg leading-tight truncate">{it.name}</p>
                        {it.quantity && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">
                            {it.quantity}
                          </p>
                        )}
                        <span
                          className={`inline-flex items-center mt-2 text-xs px-2 py-0.5 rounded-full border ${statusClasses(status)}`}
                        >
                          {expiryLabel(it.expiry_date)}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(it.id)}
                        aria-label={`Remove ${it.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
    </div>
  );
};

export default Pantry;
