-- =====================================================
-- FACULDADE NACAR LMS
-- v1.9 — Trilhas obrigatórias por loja, cargo e grupo
-- =====================================================

create extension if not exists "uuid-ossp";

-- Trilhas de treinamento
create table if not exists public.training_paths (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  audience_type text not null default 'all',
  audience_role text,
  audience_store_id uuid references public.stores(id) on delete set null,
  audience_position_id uuid references public.positions(id) on delete set null,
  audience_group_id uuid references public.user_groups(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.training_paths
add column if not exists description text,
add column if not exists audience_type text default 'all',
add column if not exists audience_role text,
add column if not exists audience_store_id uuid references public.stores(id) on delete set null,
add column if not exists audience_position_id uuid references public.positions(id) on delete set null,
add column if not exists audience_group_id uuid references public.user_groups(id) on delete set null,
add column if not exists is_active boolean default true,
add column if not exists updated_at timestamptz default now();

alter table public.training_paths
drop constraint if exists training_paths_audience_type_check;

alter table public.training_paths
add constraint training_paths_audience_type_check
check (audience_type in ('all', 'role', 'store', 'position', 'group'));

-- Cursos vinculados à trilha
create table if not exists public.training_path_courses (
  id uuid primary key default uuid_generate_v4(),
  path_id uuid not null references public.training_paths(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_index integer not null default 1,
  is_required boolean default true,
  created_at timestamptz default now(),
  unique(path_id, course_id)
);

alter table public.training_path_courses
add column if not exists order_index integer default 1,
add column if not exists is_required boolean default true;

-- Garante colunas esperadas nas tabelas usadas pela v1.9
alter table public.profiles
add column if not exists store_id uuid references public.stores(id),
add column if not exists position_id uuid references public.positions(id),
add column if not exists group_id uuid references public.user_groups(id),
add column if not exists situation text default 'active',
add column if not exists is_active boolean default true,
add column if not exists updated_at timestamptz default now();

alter table public.enrollments
add column if not exists status text default 'not_started',
add column if not exists progress numeric default 0,
add column if not exists started_at timestamptz,
add column if not exists completed_at timestamptz,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

alter table public.enrollments
drop constraint if exists enrollments_status_check;

alter table public.enrollments
add constraint enrollments_status_check
check (
  status in (
    'not_started',
    'in_progress',
    'completed',
    'approved',
    'failed',
    'Não iniciado',
    'Em andamento',
    'Concluído',
    'Aprovado',
    'Reprovado'
  )
);

-- Exemplo inicial de trilha, sem cursos vinculados automaticamente
insert into public.training_paths (
  name,
  description,
  audience_type,
  is_active
)
values (
  'Integração Nacar',
  'Trilha padrão para novos colaboradores e treinamentos corporativos iniciais.',
  'all',
  true
)
on conflict (name) do nothing;

-- Permissões temporárias de desenvolvimento
-- Na v2.0 vamos substituir por RLS e policies seguras.
alter table public.training_paths disable row level security;
alter table public.training_path_courses disable row level security;
alter table public.enrollments disable row level security;
alter table public.profiles disable row level security;
alter table public.courses disable row level security;
alter table public.stores disable row level security;
alter table public.positions disable row level security;
alter table public.user_groups disable row level security;
alter table public.user_group_members disable row level security;

grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.training_paths to anon, authenticated;
grant select, insert, update, delete on table public.training_path_courses to anon, authenticated;
grant select, insert, update, delete on table public.enrollments to anon, authenticated;
grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.courses to anon, authenticated;
grant select, insert, update, delete on table public.stores to anon, authenticated;
grant select, insert, update, delete on table public.positions to anon, authenticated;
grant select, insert, update, delete on table public.user_groups to anon, authenticated;
grant select, insert, update, delete on table public.user_group_members to anon, authenticated;
