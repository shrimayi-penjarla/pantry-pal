import { useEffect, useState } from "react";
import { ListChecks, Plus, Check, X, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Row {
  id: string;
  name: string;
  quantity: string | null;
  status: string;
  reason: string | null;
}

const ShoppingList = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shopping_list_items")
      .select("id, name, quantity, status, reason")
      .neq("status", "rejected")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const accept = async (id: string) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "active" } : x)));
    await supabase.from("shopping_list_items").update({ status: "active" }).eq("id", id);
  };

  const reject = async (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id));
    await supabase.from("shopping_list_items").update({ status: "rejected" }).eq("id", id);
  };

  const remove = async (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id));
    await supabase.from("shopping_list_items").delete().eq("id", id);
  };

  const add = async () => {
    if (!user) return;
    const name = newName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert({ user_id: user.id, name, quantity: newQty.trim() || null, status: "active", reason: "manual" })
      .select("id, name, quantity, status, reason")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((r) => [data as Row, ...r]);
    setNewName("");
    setNewQty("");
  };

  const startEdit = (r: Row) => {
    setEditingId(r.id);
    setEditName(r.name);
    setEditQty(r.quantity ?? "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updates = { name: editName.trim() || "Item", quantity: editQty.trim() || null };
    setRows((r) => r.map((x) => (x.id === editingId ? { ...x, ...updates } : x)));
    await supabase.from("shopping_list_items").update(updates).eq("id", editingId);
    setEditingId(null);
  };

  const suggested = rows.filter((r) => r.status === "suggested");
  const active = rows.filter((r) => r.status === "active");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-hand text-2xl text-accent leading-none">Don't forget</p>
        <h1 className="font-display text-4xl tracking-tight flex items-center gap-3">
          <ListChecks className="h-7 w-7 text-primary" /> Shopping list
        </h1>
        <p className="text-sm text-muted-foreground italic">
          Things you've used up or that expired — keep or skip.
        </p>
        <hr className="rule-divider" />
      </header>

      <Card className="paper-card p-4">
        <p className="font-hand text-xl text-primary mb-2">Add something</p>
        <div className="flex gap-2 flex-wrap">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="e.g. Whole milk"
            className="flex-1 min-w-[160px]"
          />
          <Input
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="qty (optional)"
            className="w-32"
          />
          <Button variant="hero" onClick={add}>
            <Plus /> Add
          </Button>
        </div>
      </Card>

      {loading && <p className="text-muted-foreground italic">Loading…</p>}

      {suggested.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-foreground/90">
            Suggested for you{" "}
            <span className="font-hand text-2xl text-accent">· {suggested.length}</span>
          </h2>
          <p className="text-xs text-muted-foreground italic -mt-2">
            Items recently removed or expired from your pantry.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {suggested.map((r) => (
              <Card key={r.id} className="paper-card p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground italic">
                    {r.reason === "expired" ? "expired" : "used up"}
                    {r.quantity ? ` · ${r.quantity}` : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => accept(r.id)}
                  aria-label="Add to list"
                  className="text-primary"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => reject(r.id)}
                  aria-label="No thanks"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-foreground/90">
          My list{" "}
          <span className="font-hand text-2xl text-accent">· {active.length}</span>
        </h2>
        {!loading && active.length === 0 ? (
          <Card className="paper-card p-6 text-center text-sm text-muted-foreground italic">
            Your shopping list is empty.
          </Card>
        ) : (
          <div className="grid gap-2">
            {active.map((r) => (
              <Card key={r.id} className="paper-card p-3 flex items-center gap-2">
                {editingId === r.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      className="w-24"
                      placeholder="qty"
                    />
                    <Button size="sm" variant="hero" onClick={saveEdit}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-lg truncate">{r.name}</p>
                      {r.quantity && (
                        <p className="text-xs text-muted-foreground italic">{r.quantity}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(r)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(r.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ShoppingList;
