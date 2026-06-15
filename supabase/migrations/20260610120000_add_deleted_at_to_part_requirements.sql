-- Migration: add deleted_at column to part_requirements with DEFAULT NULL
-- Generated on 2026-06-10

alter table public.part_requirements
  add column if not exists deleted_at timestamptz default null;
