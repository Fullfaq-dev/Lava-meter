CREATE TABLE IF NOT EXISTS public.ic_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    month TEXT NOT NULL,
    ee_reading NUMERIC,
    water_supply_reading NUMERIC,
    water_drainage_reading NUMERIC,
    heating_reading NUMERIC,
    residents_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(year, month)
);

ALTER TABLE public.ic_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.ic_readings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.ic_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.ic_readings FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.ic_readings FOR DELETE USING (true);
