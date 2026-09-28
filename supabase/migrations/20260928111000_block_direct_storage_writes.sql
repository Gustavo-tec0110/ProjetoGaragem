begin;

-- Uploads passam exclusivamente pela rota server-side, que autentica a sessão,
-- valida a imagem e usa a service role para criar um path novo e seguro.
drop policy if exists "project_images_insert_own_folder" on storage.objects;

-- A aplicação nunca substitui objetos: cada imagem normalizada recebe um nome
-- aleatório. Remover UPDATE impede substituir um arquivo sem passar pelo Sharp.
drop policy if exists "project_images_update_own_folder" on storage.objects;

-- Mantém leitura pública e DELETE limitado à pasta do dono para objetos já
-- existentes; nenhum fluxo atual depende de UPDATE direto do browser.
notify pgrst, 'reload schema';

commit;
