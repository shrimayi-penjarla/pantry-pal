import { Clock, X, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RecipeImage from "./RecipeImage";

export interface ViewableRecipe {
  title: string;
  description?: string | null;
  ingredients: string[];
  steps: string[];
  prep_minutes?: number | null;
  uses_items?: string[];
  image_url?: string | null;
}

interface Props {
  open: boolean;
  recipe: ViewableRecipe | null;
  onClose: () => void;
  onEdit?: () => void;
}

const RecipeDetailDialog = ({ open, recipe, onClose, onEdit }: Props) => {
  if (!recipe) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto paper-card">
        <DialogHeader>
          <div className="aspect-[16/9] w-full overflow-hidden rounded-md border border-border mb-3">
            <RecipeImage src={recipe.image_url} alt={recipe.title} />
          </div>
          <DialogTitle className="font-display text-3xl leading-tight">
            {recipe.title}
          </DialogTitle>
          {recipe.description && (
            <p className="text-muted-foreground italic">{recipe.description}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {recipe.prep_minutes != null && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {recipe.prep_minutes} min
              </Badge>
            )}
            {recipe.uses_items?.map((u, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/30"
              >
                {u}
              </span>
            ))}
          </div>
        </DialogHeader>

        <hr className="rule-divider my-2" />

        <div className="grid sm:grid-cols-[1fr_2fr] gap-6">
          <div>
            <h3 className="font-display text-xl mb-2">Ingredients</h3>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No ingredients listed.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-display text-xl mb-2">Method</h3>
            {recipe.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No steps listed.</p>
            ) : (
              <ol className="space-y-3 text-sm">
                {recipe.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-display text-xl text-accent leading-none shrink-0">
                      {i + 1}.
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Pencil /> Edit
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            <X /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeDetailDialog;
