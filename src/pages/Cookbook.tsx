import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RecipeImage from "@/components/RecipeImage";
import RecipeDetailDialog from "@/components/RecipeDetailDialog";
import RecipeEditorDialog, { type EditableRecipe } from "@/components/RecipeEditorDialog";

interface CookbookRow {
  id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  steps: string[];
  uses_items: string[];
  prep_minutes: number | null;
  image_url: string | null;
  source: string;
  is_favorite: boolean;
  created_at: string;
}

const toArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)) : [];

const Cookbook = () => {
  const [rows, setRows] = useState<CookbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<CookbookRow | null>(null);
  const [editing, setEditing] = useState<CookbookRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cookbook_recipes")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setRows(
        (data ?? []).map((r) => ({
          ...r,
          ingredients: toArr(r.ingredients),
          steps: toArr(r.steps),
          uses_items: toArr(r.uses_items),
        })) as CookbookRow[],
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Remove this recipe from your cookbook?")) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from("cookbook_recipes").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(error.message);
    }
  };

  const filtered = rows.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase()),
  );

  const toEditable = (r: CookbookRow): EditableRecipe => ({
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    steps: r.steps,
    prep_minutes: r.prep_minutes,
    image_url: r.image_url,
    source: (r.source as "ai" | "user") ?? "user",
    uses_items: r.uses_items,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="font-hand text-2xl text-accent leading-none">My</p>
            <h1 className="font-display text-4xl tracking-tight flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-primary" /> Cookbook
            </h1>
            <p className="text-sm text-muted-foreground mt-1 italic">
              Favorites and recipes you've added — kept for keeps.
            </p>
          </div>
          <Button variant="hero" onClick={() => setCreating(true)}>
            <Plus /> Add a recipe
          </Button>
        </div>
        <hr className="rule-divider" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the cookbook…"
          className="max-w-sm bg-card"
        />
      </header>

      {loading && <p className="text-muted-foreground italic">Opening the book…</p>}

      {!loading && filtered.length === 0 && (
        <Card className="paper-card p-10 text-center relative">
          <span className="tape" />
          <BookOpen className="h-10 w-10 mx-auto text-primary/70 mb-3" />
          <p className="font-display text-xl">Your cookbook is empty</p>
          <p className="text-sm text-muted-foreground italic mt-1 mb-4">
            Favorite an AI recipe or add your own to start.
          </p>
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus /> Write your first recipe
          </Button>
        </Card>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
        {filtered.map((r) => (
          <Card
            key={r.id}
            className="paper-card overflow-hidden flex flex-col group cursor-pointer hover:-translate-y-0.5 transition-transform"
            onClick={() => setViewing(r)}
          >
            <div className="aspect-[4/3] overflow-hidden relative">
              <RecipeImage src={r.image_url} alt={r.title} rounded="" />
              {r.is_favorite && (
                <Star
                  className="absolute top-2 right-2 h-5 w-5 fill-accent text-accent drop-shadow"
                  aria-label="Favorited"
                />
              )}
              {r.source === "user" && (
                <span className="absolute top-2 left-2 font-hand text-base px-2 py-0.5 bg-card/90 border border-border rounded-sm rotate-[-3deg]">
                  my recipe
                </span>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-display text-xl leading-tight">{r.title}</h3>
              {r.description && (
                <p className="text-sm text-muted-foreground italic mt-1 line-clamp-2">
                  {r.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                <span className="text-xs text-muted-foreground">
                  {r.prep_minutes ? `${r.prep_minutes} min` : "—"}
                </span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(r)}
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
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <RecipeDetailDialog
        open={!!viewing}
        recipe={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => {
          if (viewing) {
            setEditing(viewing);
            setViewing(null);
          }
        }}
      />
      <RecipeEditorDialog
        open={creating || !!editing}
        mode={editing ? "edit" : "create"}
        initial={editing ? toEditable(editing) : null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={load}
      />
    </div>
  );
};

export default Cookbook;
