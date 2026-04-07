CREATE TABLE public.energy_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    month TEXT NOT NULL,
    vazma_active_kwh NUMERIC,
    vazma_active_rosseti_rub NUMERIC,
    vazma_active_atom_rub NUMERIC,
    vazma_reactive_kwh NUMERIC,
    vazma_reactive_rosseti_rub NUMERIC,
    sn_zavod_kwh NUMERIC,
    sn_energocenter_kwh NUMERIC,
    losses_cable_kwh NUMERIC,
    losses_transformer_kwh NUMERIC,
    boiler_kwh NUMERIC,
    ec_produced_kwh NUMERIC,
    ec_gas_payment_rub NUMERIC,
    ec_gas_volume_m3 NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(year, month)
);

ALTER TABLE public.energy_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.energy_reports FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.energy_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.energy_reports FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.energy_reports FOR DELETE USING (true);
