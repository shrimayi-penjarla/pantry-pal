import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
  rounded?: string;
}

/** Recipe image with a parchment fallback illustration when none is set. */
const RecipeImage = ({ src, alt = "", className, rounded = "rounded-md" }: Props) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("w-full h-full object-cover", rounded, className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "w-full h-full bg-gradient-warm flex flex-col items-center justify-center text-primary/70 border border-border/60",
        rounded,
        className,
      )}
      aria-label={alt || "Recipe illustration"}
    >
      <ChefHat className="h-8 w-8 mb-1" />
      <span className="font-hand text-xl">à la maison</span>
    </div>
  );
};

export default RecipeImage;
