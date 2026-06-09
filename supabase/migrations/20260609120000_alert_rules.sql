-- Migration: Create alert and recommendation rule tables for build planner
-- Date: 2026-06-09

begin;

-- Table: part_alert_rules
create table if not exists public.part_alert_rules (
  id uuid primary key default gen_random_uuid(),
  part_category text not null,
  part_name_pattern text,
  vehicle_brand text,
  vehicle_model text,
  engine_min_displacement numeric,
  engine_max_displacement numeric,
  min_power numeric,
  max_power numeric,
  rule_type text not null,
  severity text not null check (severity in ('info','success','warning','danger')),
  title text not null,
  message text not null,
  required_part_categories text[],
  recommended_part_categories text[],
  created_at timestamptz not null default now()
);

-- Table: part_recommendation_rules
create table if not exists public.part_recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  part_category text not null,
  impact_type text,
  impact_score numeric,
  difficulty_score numeric,
  risk_score numeric,
  priority_score numeric,
  notes text,
  created_at timestamptz not null default now()
);

-- RLS Policies: public read, service_role write
-- part_alert_rules
drop policy if exists "part_alert_rules_read_public" on public.part_alert_rules;
create policy "part_alert_rules_read_public"
  on public.part_alert_rules for select
  to anon, authenticated
  using (true);

drop policy if exists "part_alert_rules_write_service" on public.part_alert_rules;
create policy "part_alert_rules_write_service"
  on public.part_alert_rules for all
  to service_role
  using (true) with check (true);

-- part_recommendation_rules
drop policy if exists "part_recommendation_rules_read_public" on public.part_recommendation_rules;
create policy "part_recommendation_rules_read_public"
  on public.part_recommendation_rules for select
  to anon, authenticated
  using (true);

drop policy if exists "part_recommendation_rules_write_service" on public.part_recommendation_rules;
create policy "part_recommendation_rules_write_service"
  on public.part_recommendation_rules for all
  to service_role
  using (true) with check (true);

-- Seed initial alert rules
insert into public.part_alert_rules (
  part_category,
  part_name_pattern,
  vehicle_brand,
  vehicle_model,
  rule_type,
  severity,
  title,
  message,
  required_part_categories,
  recommended_part_categories
) values
  (
    'Turbo',
    null,
    null,
    null,
    'validation',
    'warning',
    'Turbo sem intercooler',
    'Um turbo sem intercooler pode gerar temperaturas elevadas. Provavelmente você precisará de um intercooler, e pode exigir revisão da alimentação e do acerto.',
    ARRAY['Intercooler'],
    null
  ),
  (
    'Intercooler',
    null,
    null,
    null,
    'recommendation',
    'info',
    'Intercooler universal',
    'Um intercooler universal costuma servir a maioria dos modelos. Recomenda-se verificar a compatibilidade com o motor antes da instalação.',
    null,
    ARRAY['Turbo']
  ),
  (
    'Suspensao',
    null,
    null,
    null,
    'validation',
    'danger',
    'Suspensão de rosca',
    'Suspensões de rosca podem exigir adaptações para seu modelo. Pode ser necessário verificar a fixação e consultar um profissional.',
    null,
    null
  ),
  (
    'Suspensao',
    null,
    null,
    null,
    'validation',
    'warning',
    'Suspensão a ar',
    'Suspensões a ar exigem componentes específicos. Pode ser necessário adaptar o sistema e revisar a compatibilidade com a carroceria.',
    null,
    null
  ),
  (
    'Rodas',
    null,
    null,
    null,
    'validation',
    'info',
    'Rodas maiores que originais',
    'Rodas maiores que as originais podem exigir ajustes na suspensão e no sistema de freios. Recomenda-se avaliar o impacto no manejo.',
    null,
    null
  ),
  (
    'Escape',
    null,
    null,
    null,
    'recommendation',
    'info',
    'Escape esportivo',
    'Um escape esportivo pode melhorar o som e o fluxo de gases. Provavelmente será necessário adaptar suportes ou conferir requisitos de homologação.',
    null,
    null
  ),
  (
    'Aerodinamica',
    null,
    null,
    null,
    'recommendation',
    'info',
    'Front lip universal',
    'Um front lip universal costuma ser compatível com diversos modelos. Recomenda‑se verificar a fixação específica do seu veículo.',
    null,
    null
  ),
  (
    'Interior',
    null,
    null,
    null,
    'recommendation',
    'info',
    'Painel digital',
    'Um painel digital pode requerer integração elétrica. Pode ser necessário adaptar fiação ou confirmar compatibilidade com o CAN‑bus.',
    null,
    null
  ),
  (
    'Direcao',
    null,
    null,
    null,
    'recommendation',
    'info',
    'Volante esportivo',
    'Um volante esportivo pode alterar a ergonomia. Pode exigir ajuste do airbag e verificação de compatibilidade com o sistema de direção.',
    null,
    null
  );

commit;