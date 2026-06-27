-- v1.7 Faculdade Nacar
-- Uploads, Storage e Biblioteca de Materiais

-- Buckets públicos para testes e uso inicial do LMS
insert into storage.buckets (id, name, public)
values
  ('course-videos', 'course-videos', true),
  ('course-pdfs', 'course-pdfs', true),
  ('course-images', 'course-images', true),
  ('course-materials', 'course-materials', true)
on conflict (id) do update set
  public = excluded.public;

-- Garante tabela de materiais
create table if not exists public.materials (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  title text not null,
  file_type text not null,
  file_url text,
  description text,
  created_at timestamp with time zone default now()
);

-- Permissões temporárias para desenvolvimento.
-- Na v2.0 vamos fechar isso com RLS e policies por perfil.
alter table public.materials disable row level security;

grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.materials to anon;
grant select, insert, update, delete on table public.materials to authenticated;

-- Policies do Supabase Storage para upload e leitura pelos usuários logados.
-- Se alguma policy já existir com estes nomes, removemos e recriamos.
drop policy if exists "lms_storage_read_public_buckets" on storage.objects;
drop policy if exists "lms_storage_insert_authenticated_buckets" on storage.objects;
drop policy if exists "lms_storage_update_authenticated_buckets" on storage.objects;
drop policy if exists "lms_storage_delete_authenticated_buckets" on storage.objects;

create policy "lms_storage_read_public_buckets"
on storage.objects
for select
using (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials')
);

create policy "lms_storage_insert_authenticated_buckets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials')
);

create policy "lms_storage_update_authenticated_buckets"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials')
)
with check (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials')
);

create policy "lms_storage_delete_authenticated_buckets"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials')
);
