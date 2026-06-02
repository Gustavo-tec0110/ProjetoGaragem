-- Projeto Garagem MVP seed.
-- Perfis e carros dependem de auth.users, por isso sao criados pelo app.
-- Este seed mantem apenas recomendacoes genericas de compatibilidade.

insert into public.part_requirements (part_category, required_category, message)
values
  ('Turbo', 'Intercooler', 'Projeto turbo geralmente pede intercooler, alimentacao, acerto e embreagem.'),
  ('Turbo', 'Alimentacao', 'Verifique bomba, bicos e linha de combustivel antes de subir pressao.'),
  ('Turbo', 'Eletronica', 'Acerto/injecao e wideband reduzem risco em projeto turbo.'),
  ('Suspensao', 'Pneus', 'Mudancas de altura pedem revisao de pneus, alinhamento e geometria.'),
  ('Freios', 'Pneus', 'Upgrade de freio rende mais quando pneus e rodas acompanham o conjunto.')
on conflict do nothing;
