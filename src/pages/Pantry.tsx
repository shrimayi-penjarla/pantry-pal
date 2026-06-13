import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, ScanLine, ChefHat, Refrigerator, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { daysUntil, expiryLabel, expiryStatus, statusClasses } from "@/lib/expiry";
import { useAuth } from "@/hooks/useAuth";

interface PantryItem {
  id: string;
  name: string;
  quantity: string | null;
  expiry_date: string;
  added_on: string;
}

const Pantry = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pantry_items")
      .select("id, name, quantity, expiry_date, added_on")
      .order("expiry_date", { ascending: true });
    if (error) toast.error("Failed to load pantry");
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const suggestForShopping = async (item: PantryItem) => {
    if (!user) return;
    const reason = daysUntil(item.expiry_date) < 0 ? "expired" : "removed";
    await supabase.from("shopping_list_items").insert({
      user_id: user.id,
      name: item.name,
      quantity: item.quantity,
      status: "suggested",
      reason,
      suggested_from_pantry_id: item.id,
    });
  };

  const handleDelete = async (item: PantryItem) => {
    const prev = items;
    setItems((x) => x.filter((i) => i.id !== item.id));
    const { error } = await supabase.from("pantry_items").delete().eq("id", item.id);
    if (error) {
      setItems(prev);
      toast.error("Could not remove item");
      return;
    }
    await suggestForShopping(item);
    toast.success(`Removed — added "${item.name}" to shopping suggestions`);
  };

  const startEdit = (it: PantryItem) => {
    setEditingId(it.id);
    setEditName(it.name);
    setEditDate(it.expiry_date);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId) return;
    const updates = { name: editName.trim() || "Item", expiry_date: editDate };
    setItems((x) => x.map((i) => (i.id === editingId ? { ...i, ...updates } : i)));
    const { error } = await supabase.from("pantry_items").update(updates).eq("id", editingId);
    if (error) toast.error(error.message);
    setEditingId(null);
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
                <Link to="/scan"><ScanLine /> Start scanning</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/recipes"><ChefHat /> See recipes</Link>
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
            <Link to="/scan"><Plus /> Add items</Link>
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
                  const editing = editingId === it.id;
                  return (
                    <Card key={it.id} className="paper-card p-4 flex items-start justify-between gap-3 hover:-translate-y-0.5 transition-transform">
                      <div className="min-w-0 flex-1">
                        {editing ? (
                          <div className="space-y-2">
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                            <div className="flex gap-2">
                              <Button size="sm" variant="hero" onClick={saveEdit}>
                                <Check className="h-4 w-4" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="h-4 w-4" /> Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-display text-lg leading-tight truncate">{it.name}</p>
                            {it.quantity && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">{it.quantity}</p>
                            )}
                            <span className={`inline-flex items-center mt-2 text-xs px-2 py-0.5 rounded-full border ${statusClasses(status)}`}>
                              {expiryLabel(it.expiry_date)}
                            </span>
                          </>
                        )}
                      </div>
                      {!editing && (
                        <div className="flex flex-col gap-1">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(it)} aria-label={`Edit ${it.name}`}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(it)} aria-label={`Remove ${it.name}`}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
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
