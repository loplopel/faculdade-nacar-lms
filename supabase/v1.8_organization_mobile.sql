-- =====================================================
-- FACULDADE NACAR LMS
-- v1.8 — Organização corporativa
-- Lojas, cargos, grupos e base mobile/admin
-- =====================================================

create extension if not exists "uuid-ossp";

-- LOJAS
create table if not exists public.stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.stores
add column if not exists code text,
add column if not exists is_active boolean default true,
add column if not exists updated_at timestamptz default now();

-- CARGOS / FUNÇÕES
create table if not exists public.positions (
  id uuid primary key default uuid_generate_v4(),
  title text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- GRUPOS DE USUÁRIOS
create table if not exists public.user_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.user_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(group_id, user_id)
);

-- PERFIS
alter table public.profiles
add column if not exists store_id uuid references public.stores(id),
add column if not exists store text,
add column if not exists position_id uuid references public.positions(id),
add column if not exists group_id uuid references public.user_groups(id),
add column if not exists position text,
add column if not exists region text,
add column if not exists seller_name text,
add column if not exists phone text,
add column if not exists whatsapp text,
add column if not exists situation text default 'active',
add column if not exists is_active boolean default true,
add column if not exists updated_at timestamptz default now();

-- Normaliza situação para padrão da v1.8
update public.profiles
set situation = case
  when lower(coalesce(situation, '')) in ('ativo', 'active') then 'active'
  when lower(coalesce(situation, '')) in ('inativo', 'inactive') then 'inactive'
  when lower(coalesce(situation, '')) in ('bloqueado', 'blocked') then 'blocked'
  else 'active'
end
where situation is null
   or lower(situation) in ('ativo', 'active', 'inativo', 'inactive', 'bloqueado', 'blocked', '');

-- Seeds oficiais de loja
insert into public.stores (name, code, is_active) values
('Nacar Mega Store', '22', true),
('Nacar Motorcycle', '27', true),
('Nacar Campinas', '34', true),
('Nacar Taubaté', '36', true),
('Web Racing', '14', true),
('Planet Bike', '19', true),
('Super Bike', '18', true),
('Toleman', '20', true),
('MotoSports', '16', true),
('Nova Centro', '11', true),
('Nova Suzuki', '10', true),
('Nova MotoStore', '9', true)
on conflict (name) do update set
  code = excluded.code,
  is_active = excluded.is_active,
  updated_at = now();

-- Cargos iniciais
insert into public.positions (title, description, is_active) values
('Administrador', 'Responsável por administrar o LMS e suas configurações.', true),
('Gestor', 'Responsável por acompanhar equipe, progresso e resultados.', true),
('Instrutor', 'Responsável por apoiar conteúdos, aulas e treinamentos.', true),
('Vendedor', 'Colaborador comercial e atendimento ao cliente.', true),
('Estoquista', 'Colaborador de estoque e operação.', true),
('Garantia / Pós-venda', 'Colaborador responsável por garantia, SAC e pós-venda.', true),
('Marketing / E-commerce', 'Colaborador de marketing, tráfego, conteúdo ou e-commerce.', true),
('Colaborador', 'Perfil geral de funcionário/aluno.', true)
on conflict (title) do update set
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

-- Grupos iniciais
insert into public.user_groups (name, description, is_active) values
('Administradores', 'Grupo com usuários administradores do LMS.', true),
('Gestores', 'Grupo de liderança e acompanhamento de equipes.', true),
('Instrutores', 'Grupo de criação e apoio a conteúdos.', true),
('Funcionários', 'Grupo padrão dos colaboradores/alunos.', true),
('Vendas e Atendimento', 'Grupo de equipes comerciais e atendimento.', true),
('Operação e Estoque', 'Grupo de equipes operacionais.', true),
('Garantia e Pós-venda', 'Grupo de equipes de garantia, SAC e pós-venda.', true),
('Marketing e E-commerce', 'Grupo de marketing, tráfego, design e e-commerce.', true)
on conflict (name) do update set
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

-- Permissões temporárias para desenvolvimento
alter table public.stores disable row level security;
alter table public.positions disable row level security;
alter table public.user_groups disable row level security;
alter table public.user_group_members disable row level security;
alter table public.profiles disable row level security;

grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.stores to anon, authenticated;
grant select, insert, update, delete on table public.positions to anon, authenticated;
grant select, insert, update, delete on table public.user_groups to anon, authenticated;
grant select, insert, update, delete on table public.user_group_members to anon, authenticated;
grant select, insert, update, delete on table public.profiles to anon, authenticated;
