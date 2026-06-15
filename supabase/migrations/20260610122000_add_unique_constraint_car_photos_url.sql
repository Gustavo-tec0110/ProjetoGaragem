-- Migration: add UNIQUE constraint on car_photos.url
-- Generated on 2026-06-10

alter table public.car_photos
  add constraint car_photos_url_unique unique (url);
