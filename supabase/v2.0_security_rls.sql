-- =====================================================
-- FACULDADE NACAR LMS
-- v2.0 — Segurança, RLS e produção inicial
-- Rode este SQL SOMENTE depois de aplicar o ZIP v2.0,
-- passar o build e publicar na Vercel.
-- =====================================================

create extension if not exists "uuid-ossp";

-- -----------------------------------------------------
-- 1) Funções seguras de permissão
-- -----------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() limit 1),
    'anon'
  );
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select
        coalesce(is_active, true) = true
        and lower(coalesce(situation, 'active')) not in ('inactive', 'inativo', 'blocked', 'bloqueado')
      from public.profiles
      where id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() = 'admin' and public.current_user_is_active();
$$;

create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('admin', 'gestor') and public.current_user_is_active();
$$;

create or replace function public.is_content_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('admin', 'instrutor') and public.current_user_is_active();
$$;

create or replace function public.is_admin_area_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('admin', 'gestor', 'instrutor') and public.current_user_is_active();
$$;

-- -----------------------------------------------------
-- 2) Garante colunas usadas pelas policies
-- -----------------------------------------------------
alter table public.profiles
add column if not exists situation text default 'active',
add column if not exists is_active boolean default true,
add column if not exists store_id uuid references public.stores(id),
add column if not exists position_id uuid references public.positions(id),
add column if not exists group_id uuid references public.user_groups(id),
add column if not exists updated_at timestamptz default now();

alter table public.enrollments
add column if not exists status text default 'not_started',
add column if not exists progress numeric default 0,
add column if not exists started_at timestamptz,
add column if not exists completed_at timestamptz,
add column if not exists updated_at timestamptz default now();

alter table public.lesson_progress
add column if not exists is_completed boolean default false,
add column if not exists completed_at timestamptz;

-- -----------------------------------------------------
-- 3) Revoga acesso aberto de desenvolvimento
-- -----------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- -----------------------------------------------------
-- 4) Ativa RLS nas tabelas do LMS
-- -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.positions enable row level security;
alter table public.user_groups enable row level security;
alter table public.user_group_members enable row level security;
alter table public.course_categories enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.materials enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_answers enable row level security;
alter table public.certificates enable row level security;
alter table public.training_paths enable row level security;
alter table public.training_path_courses enable row level security;

-- -----------------------------------------------------
-- 5) Limpa policies antigas da v2.0 para reprocessar sem erro
-- -----------------------------------------------------
do $$
declare
  tbl text;
  pol text;
begin
  foreach tbl in array array[
    'profiles','stores','positions','user_groups','user_group_members','course_categories','courses',
    'lessons','materials','enrollments','lesson_progress','exams','questions','question_options',
    'exam_attempts','exam_answers','certificates','training_paths','training_path_courses'
  ] loop
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = tbl and policyname like 'v2_%'
    loop
      execute format('drop policy if exists %I on public.%I', pol, tbl);
    end loop;
  end loop;
end $$;

-- -----------------------------------------------------
-- 6) Profiles
-- -----------------------------------------------------
create policy "v2_profiles_select"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin_area_user()
);

create policy "v2_profiles_insert"
on public.profiles
for insert
to authenticated
with check (public.is_manager());

create policy "v2_profiles_update"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_manager())
with check (id = auth.uid() or public.is_manager());

create policy "v2_profiles_delete"
on public.profiles
for delete
to authenticated
using (public.is_admin());

-- -----------------------------------------------------
-- 7) Tabelas organizacionais
-- -----------------------------------------------------
create policy "v2_stores_select" on public.stores for select to authenticated using (public.current_user_is_active());
create policy "v2_stores_insert" on public.stores for insert to authenticated with check (public.is_manager());
create policy "v2_stores_update" on public.stores for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "v2_stores_delete" on public.stores for delete to authenticated using (public.is_admin());

create policy "v2_positions_select" on public.positions for select to authenticated using (public.current_user_is_active());
create policy "v2_positions_insert" on public.positions for insert to authenticated with check (public.is_manager());
create policy "v2_positions_update" on public.positions for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "v2_positions_delete" on public.positions for delete to authenticated using (public.is_admin());

create policy "v2_user_groups_select" on public.user_groups for select to authenticated using (public.current_user_is_active());
create policy "v2_user_groups_insert" on public.user_groups for insert to authenticated with check (public.is_manager());
create policy "v2_user_groups_update" on public.user_groups for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "v2_user_groups_delete" on public.user_groups for delete to authenticated using (public.is_admin());

create policy "v2_user_group_members_select" on public.user_group_members for select to authenticated using (user_id = auth.uid() or public.is_admin_area_user());
create policy "v2_user_group_members_insert" on public.user_group_members for insert to authenticated with check (public.is_manager());
create policy "v2_user_group_members_update" on public.user_group_members for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "v2_user_group_members_delete" on public.user_group_members for delete to authenticated using (public.is_manager());

-- -----------------------------------------------------
-- 8) Conteúdo de cursos
-- -----------------------------------------------------
create policy "v2_course_categories_select" on public.course_categories for select to authenticated using (public.current_user_is_active());
create policy "v2_course_categories_insert" on public.course_categories for insert to authenticated with check (public.is_content_manager());
create policy "v2_course_categories_update" on public.course_categories for update to authenticated using (public.is_content_manager()) with check (public.is_content_manager());
create policy "v2_course_categories_delete" on public.course_categories for delete to authenticated using (public.is_admin());

create policy "v2_courses_select"
on public.courses
for select
to authenticated
using (
  public.is_admin_area_user()
  or (
    public.current_user_is_active()
    and status = 'published'
  )
  or exists (
    select 1 from public.enrollments e
    where e.course_id = courses.id
      and e.user_id = auth.uid()
  )
);

create policy "v2_courses_insert" on public.courses for insert to authenticated with check (public.is_content_manager());
create policy "v2_courses_update" on public.courses for update to authenticated using (public.is_content_manager()) with check (public.is_content_manager());
create policy "v2_courses_delete" on public.courses for delete to authenticated using (public.is_admin());

create policy "v2_lessons_select"
on public.lessons
for select
to authenticated
using (
  public.is_admin_area_user()
  or exists (
    select 1 from public.enrollments e
    where e.course_id = lessons.course_id
      and e.user_id = auth.uid()
  )
  or exists (
    select 1 from public.courses c
    where c.id = lessons.course_id
      and c.status = 'published'
  )
);

create policy "v2_lessons_insert" on public.lessons for insert to authenticated with check (public.is_content_manager());
create policy "v2_lessons_update" on public.lessons for update to authenticated using (public.is_content_manager()) with check (public.is_content_manager());
create policy "v2_lessons_delete" on public.lessons for delete to authenticated using (public.is_admin());

create policy "v2_materials_select"
on public.materials
for select
to authenticated
using (
  public.is_admin_area_user()
  or course_id is null
  or exists (
    select 1 from public.enrollments e
    where e.course_id = materials.course_id
      and e.user_id = auth.uid()
  )
);

create policy "v2_materials_insert" on public.materials for insert to authenticated with check (public.is_content_manager());
create policy "v2_materials_update" on public.materials for update to authenticated using (public.is_content_manager()) with check (public.is_content_manager());
create policy "v2_materials_delete" on public.materials for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------
-- 9) Matrículas e progresso
-- -----------------------------------------------------
create policy "v2_enrollments_select"
on public.enrollments
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_area_user());

create policy "v2_enrollments_insert"
on public.enrollments
for insert
to authenticated
with check (public.is_admin_area_user());

create policy "v2_enrollments_update"
on public.enrollments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin_area_user())
with check (user_id = auth.uid() or public.is_admin_area_user());

create policy "v2_enrollments_delete"
on public.enrollments
for delete
to authenticated
using (public.is_manager());

create policy "v2_lesson_progress_select"
on public.lesson_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_area_user());

create policy "v2_lesson_progress_insert"
on public.lesson_progress
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin_area_user());

create policy "v2_lesson_progress_update"
on public.lesson_progress
for update
to authenticated
using (user_id = auth.uid() or public.is_admin_area_user())
with check (user_id = auth.uid() or public.is_admin_area_user());

create policy "v2_lesson_progress_delete"
on public.lesson_progress
for delete
to authenticated
using (public.is_admin_area_user());

-- -----------------------------------------------------
-- 10) Provas, tentativas e certificados
-- -----------------------------------------------------
create policy "v2_exams_select"
on public.exams
for select
to authenticated
using (
  public.is_admin_area_user()
  or (
    public.current_user_is_active()
    and is_active = true
    and exists (
      select 1 from public.enrollments e
      where e.course_id = exams.course_id
        and e.user_id = auth.uid()
    )
  )
);

create policy "v2_exams_insert" on public.exams for insert to authenticated with check (public.is_content_manager());
create policy "v2_exams_update" on public.exams for update to authenticated using (public.is_content_manager()) with check (public.is_content_manager());
create policy "v2_exams_delete" on public.exams for delete to authenticated using (public.is_admin());

create policy "v2_questions_select"
on public.questions
for select
to authenticated
using (
  public.is_admin_area_user()
  or exists (
    select 1
    from public.exams ex
    join public.enrollments e on e.course_id = ex.course_id
    where ex.id = questions.exam_id
      and ex.is_active = true
      and e.user_id = auth.uid()
  )
);

create policy "v2_questions_insert" on public.questions for insert to authenticated with check (public.is_content_manager());
create policy "v2_questions_update" on public.questions for update to authenticated using (public.is_content_manager()) with check (public.is_content_manager());
create policy "v2_questions_delete" on public.questions for delete to authenticated using (public.is_admin());

create policy "v2_question_options_select"
on public.question_options
for select
to authenticated
using (
  public.is_admin_area_user()
  or exists (
    select 1
    from public.questions q
    join public.exams ex on ex.id = q.exam_id
    join public.enrollments e on e.course_id = ex.course_id
    where q.id = question_options.question_id
      and ex.is_active = true
      and e.user_id = auth.uid()
  )
);

create policy "v2_question_options_insert" on public.question_options for insert to authenticated with check (public.is_content_manager());
create policy "v2_question_options_update" on public.question_options for update to authenticated using (public.is_content_manager()) with check (public.is_content_manager());
create policy "v2_question_options_delete" on public.question_options for delete to authenticated using (public.is_admin());

create policy "v2_exam_attempts_select" on public.exam_attempts for select to authenticated using (user_id = auth.uid() or public.is_admin_area_user());
create policy "v2_exam_attempts_insert" on public.exam_attempts for insert to authenticated with check (user_id = auth.uid() or public.is_admin_area_user());
create policy "v2_exam_attempts_update" on public.exam_attempts for update to authenticated using (user_id = auth.uid() or public.is_admin_area_user()) with check (user_id = auth.uid() or public.is_admin_area_user());
create policy "v2_exam_attempts_delete" on public.exam_attempts for delete to authenticated using (public.is_admin());

create policy "v2_exam_answers_select"
on public.exam_answers
for select
to authenticated
using (
  public.is_admin_area_user()
  or exists (
    select 1 from public.exam_attempts a
    where a.id = exam_answers.attempt_id
      and a.user_id = auth.uid()
  )
);

create policy "v2_exam_answers_insert"
on public.exam_answers
for insert
to authenticated
with check (
  public.is_admin_area_user()
  or exists (
    select 1 from public.exam_attempts a
    where a.id = exam_answers.attempt_id
      and a.user_id = auth.uid()
  )
);

create policy "v2_exam_answers_update" on public.exam_answers for update to authenticated using (public.is_admin_area_user()) with check (public.is_admin_area_user());
create policy "v2_exam_answers_delete" on public.exam_answers for delete to authenticated using (public.is_admin());

create policy "v2_certificates_select" on public.certificates for select to authenticated using (user_id = auth.uid() or public.is_admin_area_user());
create policy "v2_certificates_insert" on public.certificates for insert to authenticated with check (user_id = auth.uid() or public.is_admin_area_user());
create policy "v2_certificates_update" on public.certificates for update to authenticated using (public.is_admin_area_user()) with check (public.is_admin_area_user());
create policy "v2_certificates_delete" on public.certificates for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------
-- 11) Trilhas obrigatórias
-- -----------------------------------------------------
create policy "v2_training_paths_select" on public.training_paths for select to authenticated using (public.current_user_is_active());
create policy "v2_training_paths_insert" on public.training_paths for insert to authenticated with check (public.is_admin_area_user());
create policy "v2_training_paths_update" on public.training_paths for update to authenticated using (public.is_admin_area_user()) with check (public.is_admin_area_user());
create policy "v2_training_paths_delete" on public.training_paths for delete to authenticated using (public.is_admin());

create policy "v2_training_path_courses_select" on public.training_path_courses for select to authenticated using (public.current_user_is_active());
create policy "v2_training_path_courses_insert" on public.training_path_courses for insert to authenticated with check (public.is_admin_area_user());
create policy "v2_training_path_courses_update" on public.training_path_courses for update to authenticated using (public.is_admin_area_user()) with check (public.is_admin_area_user());
create policy "v2_training_path_courses_delete" on public.training_path_courses for delete to authenticated using (public.is_admin_area_user());

-- -----------------------------------------------------
-- 12) Storage: upload restrito para admins/instrutores
-- Leitura permanece compatível com os links públicos já usados no sistema.
-- -----------------------------------------------------
grant select, insert, update, delete on table storage.objects to authenticated;

do $$
declare
  pol text;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'v2_%'
  loop
    execute format('drop policy if exists %I on storage.objects', pol);
  end loop;
end $$;

create policy "v2_storage_read_course_files"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials', 'materials')
);

create policy "v2_storage_insert_course_files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials', 'materials')
  and public.is_content_manager()
);

create policy "v2_storage_update_course_files"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials', 'materials')
  and public.is_content_manager()
)
with check (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials', 'materials')
  and public.is_content_manager()
);

create policy "v2_storage_delete_course_files"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('course-videos', 'course-pdfs', 'course-images', 'course-materials', 'materials')
  and public.is_admin()
);

-- -----------------------------------------------------
-- 13) Confirma Rodrigo como admin, se existir no Auth/Profile
-- -----------------------------------------------------
update public.profiles
set role = 'admin', is_active = true, situation = 'active', updated_at = now()
where lower(email) = 'rodrigo.franco@nacar.com.br';

-- =====================================================
-- Fim v2.0
-- =====================================================
