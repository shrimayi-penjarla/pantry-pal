import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, ScanLine, ChefHat, Refrigerator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { daysUntil, expiryLabel, expiryStatus, statusClasses } from "@/lib/expiry";
import heroImage from "@/assets/hero-groceries.jpg";

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
    urgent: "Use today / tomorrow",
    soon: "Use this week",
    fresh: "Plenty of time",
  };

  return (
    <div className="space-y-8">
      {items.length === 0 && !loading && (
        <Card className="overflow-hidden border-0 shadow-lifted">
          <div className="grid sm:grid-cols-2">
            <div className="p-8 sm:p-10 flex flex-col justify-center gap-4">
              <Badge className="w-fit bg-primary-soft text-primary hover:bg-primary-soft border-0">
                Welcome
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Your pantry, but smarter.
              </h1>
              <p className="text-muted-foreground">
                Snap a grocery receipt and we'll add every item with an estimated
                expiry date — then suggest recipes for what needs to be used first.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="hero" size="lg">
                  <Link to="/scan">
                    <ScanLine /> Scan a receipt
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/recipes">
                    <ChefHat /> See recipes
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden sm:block bg-gradient-warm">
              <img
                src={heroImage}
                alt="Fresh groceries arranged on a warm cream surface"
                width={1536}
                height={896}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </Card>
      )}

      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Refrigerator className="h-6 w-6 text-primary" /> Your pantry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} item{items.length === 1 ? "" : "s"} tracked
          </p>
        </div>
        <Button asChild variant="hero">
          <Link to="/scan">
            <Plus /> Add via receipt
          </Link>
        </Button>
      </section>

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading &&
        (["expired", "urgent", "soon", "fresh"] as const).map((bucket) => {
          const list = grouped[bucket];
          if (list.length === 0) return null;
          return (
            <section key={bucket} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {sectionTitles[bucket]} · {list.length}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((it) => {
                  const status = expiryStatus(it.expiry_date);
                  return (
                    <Card
                      key={it.id}
                      className="p-4 flex items-start justify-between gap-3 shadow-soft hover:shadow-lifted transition-shadow"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{it.name}</p>
                        {it.quantity && (
                          <p className="text-xs text-muted-foreground mt-0.5">{it.quantity}</p>
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
