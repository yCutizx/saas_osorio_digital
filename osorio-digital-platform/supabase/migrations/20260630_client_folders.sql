-- ============================================================
-- DRIVE COM PASTAS — fundação
-- Tabela de pastas (hierárquica, auto-referente) + folder_id em client_files.
-- Hierarquia mora SÓ aqui; o path no Storage continua plano.
-- ============================================================

-- 1) Tabela de pastas
create table if not exists public.client_folders (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  parent_id   uuid references public.client_folders(id) on delete cascade,
  name        text not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- parent_id null = pasta na raiz do cliente.
-- on delete cascade no parent_id: apagar pasta apaga as subpastas (decisão do pacote).

create index if not exists client_folders_client_idx
  on public.client_folders (client_id);
create index if not exists client_folders_parent_idx
  on public.client_folders (parent_id);

-- 2) Liga arquivo à pasta (null = arquivo solto na raiz)
alter table public.client_files
  add column if not exists folder_id uuid references public.client_folders(id) on delete cascade;

create index if not exists client_files_folder_idx
  on public.client_files (folder_id);

-- on delete cascade no folder_id: apagar pasta apaga os REGISTROS dos arquivos dela.
-- ATENÇÃO: isso apaga a LINHA no banco, mas NÃO o objeto no Storage. A remoção
-- física do Storage é feita pela deleteFolderAction (recursiva), no backend.

-- 3) RLS na tabela de pastas (mesmo molde de client_files/client_notes)
alter table public.client_folders enable row level security;

drop policy if exists "admin all client_folders"   on public.client_folders;
drop policy if exists "team select client_folders" on public.client_folders;

create policy "admin all client_folders" on public.client_folders
  for all using (public.get_user_role() = 'admin');

create policy "team select client_folders" on public.client_folders
  for select using (
    public.get_user_role() in ('traffic_manager','social_media')
    and public.user_has_client_access(client_id)
  );

-- role 'client' sem policy = bloqueado, igual ao resto.
