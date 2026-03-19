-- ── SETUP POSTAL CODES TABLE ──
-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.postal_codes (
    zip TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    region TEXT -- wal, fla, bxl
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.postal_codes ENABLE ROW LEVEL SECURITY;

-- 3. Allow anonymous read access
CREATE POLICY "Allow public read-only access" 
ON public.postal_codes FOR SELECT 
USING (true);

-- 4. Sample data for 7822 (Ghislenghien)
INSERT INTO public.postal_codes (zip, city, region) 
VALUES ('7822', 'Ghislenghien', 'wal')
ON CONFLICT (zip) DO UPDATE SET city = EXCLUDED.city, region = EXCLUDED.region;
