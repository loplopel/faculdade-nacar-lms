-- v1.5 Faculdade Nacar
-- Matrículas, regras do aluno e controle de progresso por curso

create extension if not exists "uuid-ossp";

create table if not exists public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'not_started',
  progress numeric default 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, course_id)
);

alter table public.enrollments
add column if not exists status text default 'not_started',
add column if not exists progress numeric default 0,
add column if not exists started_at timestamp with time zone,
add column if not exists completed_at timestamp with time zone,
add column if not exists created_at timestamp with time zone default now(),
add column if not exists updated_at timestamp with time zone default now();

alter table public.enrollments
alter column status set default 'not_started';

update public.enrollments
set status = 'not_started'
where status is null or status = '';

update public.enrollments
set progress = 0
where progress is null;

-- Atualiza constraint de status para aceitar o fluxo completo da v1.5
alter table public.enrollments
  drop constraint if exists enrollments_status_check;

alter table public.enrollments
  add constraint enrollments_status_check
  check (status in ('not_started', 'in_progress', 'completed', 'approved', 'failed'));

-- Índices úteis para consultas do LMS
create index if not exists enrollments_user_id_idx on public.enrollments(user_id);
create index if not exists enrollments_course_id_idx on public.enrollments(course_id);
create index if not exists enrollments_status_idx on public.enrollments(status);

-- Permissões temporárias para desenvolvimento e testes na Vercel.
-- Na v2.0, vamos reativar RLS e criar policies seguras.
alter table public.enrollments disable row level security;

grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.enrollments to anon;
grant select, insert, update, delete on table public.enrollments to authenticated;
