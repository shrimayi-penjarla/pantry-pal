
-- Clear existing rows (demo data) so we can enforce user ownership
DELETE FROM public.pantry_items;
DELETE FROM public.cookbook_recipes;
DELETE FROM public.recipes;

-- Add user_id columns
ALTER TABLE public.pantry_items ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cookbook_recipes ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recipes ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old public policies
DROP POLICY IF EXISTS "Public can view pantry items" ON public.pantry_items;
DROP POLICY IF EXISTS "Public can insert pantry items" ON public.pantry_items;
DROP POLICY IF EXISTS "Public can update pantry items" ON public.pantry_items;
DROP POLICY IF EXISTS "Public can delete pantry items" ON public.pantry_items;

DROP POLICY IF EXISTS "Public can view cookbook" ON public.cookbook_recipes;
DROP POLICY IF EXISTS "Public can insert cookbook" ON public.cookbook_recipes;
DROP POLICY IF EXISTS "Public can update cookbook" ON public.cookbook_recipes;
DROP POLICY IF EXISTS "Public can delete cookbook" ON public.cookbook_recipes;

DROP POLICY IF EXISTS "Public can view recipes" ON public.recipes;
DROP POLICY IF EXISTS "Public can insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Public can delete recipes" ON public.recipes;

-- Revoke public access
REVOKE ALL ON public.pantry_items FROM anon;
REVOKE ALL ON public.cookbook_recipes FROM anon;
REVOKE ALL ON public.recipes FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cookbook_recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.pantry_items TO service_role;
GRANT ALL ON public.cookbook_recipes TO service_role;
GRANT ALL ON public.recipes TO service_role;

-- New per-user policies
CREATE POLICY "Users manage own pantry" ON public.pantry_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own cookbook" ON public.cookbook_recipes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own recipes" ON public.recipes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shopping list
CREATE TABLE public.shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text,
  status text NOT NULL DEFAULT 'suggested', -- 'suggested' | 'active' | 'rejected'
  reason text, -- 'expired' | 'removed' | 'manual'
  suggested_from_pantry_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT ALL ON public.shopping_list_items TO service_role;

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shopping list" ON public.shopping_list_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_shopping_list_items_updated_at
  BEFORE UPDATE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
