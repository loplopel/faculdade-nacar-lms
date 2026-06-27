-- v1.6 Faculdade Nacar
-- Permissões temporárias para o painel de relatórios do LMS.
-- Na v2.0, vamos reativar RLS e criar policies seguras por perfil.

grant usage on schema public to anon;
grant usage on schema public to authenticated;

alter table public.profiles disable row level security;
alter table public.courses disable row level security;
alter table public.lessons disable row level security;
alter table public.lesson_progress disable row level security;
alter table public.enrollments disable row level security;
alter table public.exam_attempts disable row level security;
alter table public.certificates disable row level security;

grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.courses to anon, authenticated;
grant select, insert, update, delete on table public.lessons to anon, authenticated;
grant select, insert, update, delete on table public.lesson_progress to anon, authenticated;
grant select, insert, update, delete on table public.enrollments to anon, authenticated;
grant select, insert, update, delete on table public.exam_attempts to anon, authenticated;
grant select, insert, update, delete on table public.certificates to anon, authenticated;

create index if not exists lesson_progress_user_course_idx on public.lesson_progress(user_id, course_id);
create index if not exists exam_attempts_user_course_idx on public.exam_attempts(user_id, course_id);
create index if not exists certificates_user_course_idx on public.certificates(user_id, course_id);
