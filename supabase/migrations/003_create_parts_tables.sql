-- Parts Catalog
CREATE TABLE IF NOT EXISTS public.parts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  average_price_min NUMERIC(10,2),
  average_price_max NUMERIC(10,2),
  is_universal BOOLEAN DEFAULT false,
  impact_type TEXT,
  impact_score NUMERIC(3,2),
  difficulty_score NUMERIC(3,2),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Part Vehicle Compatibility
CREATE TABLE IF NOT EXISTS public.part_vehicle_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts_catalog(id),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  generation TEXT,
  year_start INTEGER NOT NULL,
  year_end INTEGER NOT NULL,
  compatibility_type TEXT,
  notes TEXT
);

-- Part Dependencies
CREATE TABLE IF NOT EXISTS public.part_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts_catalog(id),
  required_part_id UUID REFERENCES public.parts_catalog(id),
  dependency_type TEXT,
  notes TEXT
);

-- Project Parts
CREATE TABLE IF NOT EXISTS public.project_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  part_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  custom_name TEXT,
  category TEXT,
  status TEXT CHECK (status IN ('installed', 'planned', 'purchased', 'ordered', 'discarded')),
  price_paid NUMERIC(10,2),
  estimated_price NUMERIC(10,2),
  purchase_url TEXT,
  affiliate_url TEXT,
  supplier_name TEXT,
  marketplace TEXT,
  last_price_checked_at TIMESTAMPTZ,
  notes TEXT,
  installed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Build Budgets
CREATE TABLE IF NOT EXISTS public.build_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.cars(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  budget_amount NUMERIC(10,2),
  goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);