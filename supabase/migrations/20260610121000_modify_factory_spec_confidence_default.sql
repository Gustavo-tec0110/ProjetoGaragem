-- Migration: set DEFAULT NULL for factory_spec_confidence in car_catalog_versions
-- Generated on 2026-06-10

alter table public.car_catalog_versions
  alter column factory_spec_confidence drop default,
  alter column factory_spec_confidence set default null;
