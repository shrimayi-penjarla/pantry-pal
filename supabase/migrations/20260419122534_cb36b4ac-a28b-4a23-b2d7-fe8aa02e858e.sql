
-- Pantry items
CREATE TABLE public.pantry_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity TEXT,
  added_on DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  estimated_shelf_life_days INTEGER,
  source TEXT NOT NULL DEFAULT 'receipt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

-- v1 has no auth — single shared pantry, public access
CREATE POLICY "Public can view pantry items"
  ON public.pantry_items FOR SELECT USING (true);
CREATE POLICY "Public can insert pantry items"
  ON public.pantry_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update pantry items"
  ON public.pantry_items FOR UPDATE USING (true);
CREATE POLICY "Public can delete pantry items"
  ON public.pantry_items FOR DELETE USING (true);

CREATE INDEX idx_pantry_items_expiry ON public.pantry_items(expiry_date);

-- Cached recipe suggestions
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  uses_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  prep_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view recipes"
  ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Public can insert recipes"
  ON public.recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete recipes"
  ON public.recipes FOR DELETE USING (true);
