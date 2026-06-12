import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { uploadRecipeImage } from "@/lib/recipeStorage";
import { toast } from "sonner";
import RecipeImage from "./RecipeImage";

export interface EditableRecipe {
  id?: string;
  title: string;
  description: string | null;
  ingredients: string[];
  steps: string[];
  prep_minutes: number | null;
  image_url: string | null;
  source?: "ai" | "user";
  uses_items?: string[];
}

interface Props {
  open: boolean;
  initial: EditableRecipe | null;
  /** "create" | "edit" */
  mode: "create" | "edit";
  onClose: () => void;
  onSaved: () => void;
}

const blank: EditableRecipe = {
  title: "",
  description: "",
  ingredients: [""],
  steps: [""],
  prep_minutes: 30,
  image_url: null,
  source: "user",
};

const RecipeEditorDialog = ({ open, initial, mode, onClose, onSaved }: Props) => {
  const [form, setForm] = useState<EditableRecipe>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              ...initial,
              ingredients: initial.ingredients.length ? initial.ingredients : [""],
              steps: initial.steps.length ? initial.steps : [""],
            }
          : blank,
      );
    }
  }, [open, initial]);

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadRecipeImage(f, "user");
      setForm((p) => ({ ...p, image_url: url }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const updateList = (key: "ingredients" | "steps", i: number, value: string) =>
    setForm((p) => ({ ...p, [key]: p[key].map((v, idx) => (idx === i ? value : v)) }));
  const addToList = (key: "ingredients" | "steps") =>
    setForm((p) => ({ ...p, [key]: [...p[key], ""] }));
  const removeFromList = (key: "ingredients" | "steps", i: number) =>
    setForm((p) => ({ ...p, [key]: p[key].filter((_, idx) => idx !== i) }));

  const save = async () => {
    const title = form.title.trim();
    if (!title) {
      toast.error("Please give the recipe a title");
      return;
    }
    setSaving(true);
    const payload = {
      title,
      description: form.description?.trim() || null,
      ingredients: form.ingredients.map((s) => s.trim()).filter(Boolean),
      steps: form.steps.map((s) => s.trim()).filter(Boolean),
      prep_minutes: form.prep_minutes ?? null,
      image_url: form.image_url,
      uses_items: form.uses_items ?? [],
      source: form.source ?? "user",
      is_favorite: true,
    };
    const { error } =
      mode === "edit" && form.id
        ? await supabase.from("cookbook_recipes").update(payload).eq("id", form.id)
        : await supabase.from("cookbook_recipes").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(mode === "edit" ? "Recipe updated" : "Added to your cookbook");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto paper-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {mode === "edit" ? "Edit recipe" : "Add a recipe"}
          </DialogTitle>
          <DialogDescription className="font-hand text-lg text-primary">
            {mode === "edit" ? "Tweak the details below." : "A new page for your cookbook."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-28 h-28 shrink-0 overflow-hidden rounded-md border border-border">
              <RecipeImage src={form.image_url} alt={form.title} />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Picture</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                  {form.image_url ? "Change picture" : "Upload picture"}
                </Button>
                {form.image_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((p) => ({ ...p, image_url: null }))}
                  >
                    <X /> Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pickImage}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-title">Title</Label>
            <Input
              id="r-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Grandma's lemon loaf"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="r-desc">Short description</Label>
              <Input
                id="r-desc"
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-mins">Prep (min)</Label>
              <Input
                id="r-mins"
                type="number"
                min={0}
                value={form.prep_minutes ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    prep_minutes: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ingredients</Label>
            {form.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={ing}
                  onChange={(e) => updateList("ingredients", i, e.target.value)}
                  placeholder="1 cup flour"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromList("ingredients", i)}
                  aria-label="Remove ingredient"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addToList("ingredients")}>
              <Plus /> Add ingredient
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Steps</Label>
            {form.steps.map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="font-display text-lg text-primary leading-10 w-6 text-right">{i + 1}.</span>
                <Textarea
                  value={s}
                  onChange={(e) => updateList("steps", i, e.target.value)}
                  placeholder="Mix the dry ingredients…"
                  className="min-h-[60px]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromList("steps", i)}
                  aria-label="Remove step"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addToList("steps")}>
              <Plus /> Add step
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="hero" onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save recipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeEditorDialog;
