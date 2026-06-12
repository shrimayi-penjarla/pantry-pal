
-- Cookbook: saved/favorited AI recipes + user's own recipes
CREATE TABLE public.cookbook_recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  uses_items jsonb not null default '[]'::jsonb,
  prep_minutes integer,
  image_url text,
  source text not null default 'ai', -- 'ai' | 'user'
  is_favorite boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cookbook_recipes TO anon, authenticated;
GRANT ALL ON public.cookbook_recipes TO service_role;

ALTER TABLE public.cookbook_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view cookbook" ON public.cookbook_recipes FOR SELECT USING (true);
CREATE POLICY "Public can insert cookbook" ON public.cookbook_recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update cookbook" ON public.cookbook_recipes FOR UPDATE USING (true);
CREATE POLICY "Public can delete cookbook" ON public.cookbook_recipes FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cookbook_recipes_updated_at
BEFORE UPDATE ON public.cookbook_recipes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow editing pantry items (the existing migration may not have UPDATE; ensure column for image)
ALTER TABLE public.pantry_items ADD COLUMN IF NOT EXISTS image_url text;

-- Storage policies for recipe-images bucket (used for recipe pics + fridge scans)
CREATE POLICY "Public read recipe-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

CREATE POLICY "Public upload recipe-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY "Public update recipe-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'recipe-images');

CREATE POLICY "Public delete recipe-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'recipe-images');
