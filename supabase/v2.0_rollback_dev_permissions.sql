-- =====================================================
-- FACULDADE NACAR LMS
-- Rollback emergencial v2.0
-- Use somente se o SQL de segurança travar os testes.
-- Depois de corrigir, volte a rodar v2.0_security_rls.sql.
-- =====================================================

alter table if exists public.profiles disable row level security;
alter table if exists public.stores disable row level security;
alter table if exists public.positions disable row level security;
alter table if exists public.user_groups disable row level security;
alter table if exists public.user_group_members disable row level security;
alter table if exists public.course_categories disable row level security;
alter table if exists public.courses disable row level security;
alter table if exists public.lessons disable row level security;
alter table if exists public.materials disable row level security;
alter table if exists public.enrollments disable row level security;
alter table if exists public.lesson_progress disable row level security;
alter table if exists public.exams disable row level security;
alter table if exists public.questions disable row level security;
alter table if exists public.question_options disable row level security;
alter table if exists public.exam_attempts disable row level security;
alter table if exists public.exam_answers disable row level security;
alter table if exists public.certificates disable row level security;
alter table if exists public.training_paths disable row level security;
alter table if exists public.training_path_courses disable row level security;

grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
