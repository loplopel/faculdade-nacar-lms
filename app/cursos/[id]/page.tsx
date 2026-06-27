'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../lib/auth';

type Role = 'admin' | 'gestor' | 'instrutor' | 'funcionario';

type CourseCategory =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type CurrentProfile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean | null;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  progress: number | null;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  is_required: boolean;
  minimum_score: number | null;
  certificate_enabled: boolean | null;
  course_categories: CourseCategory;
};

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  duration_minutes: number | null;
  order_index: number;
};

type Exam = {
  id: string;
  title: string;
  minimum_score: number | null;
  is_active: boolean | null;
};

function getCategoryName(course: Course) {
  if (Array.isArray(course.course_categories)) {
    return course.course_categories[0]?.name || 'Sem categoria';
  }

  return course.course_categories?.name || 'Sem categoria';
}

function canSeeAllCourses(profile: CurrentProfile | null) {
  return profile?.role === 'admin' || profile?.role === 'gestor' || profile?.role === 'instrutor';
}

function enrollmentLabel(status: string | null) {
  switch (status) {
    case 'in_progress':
      return 'Em andamento';
    case 'completed':
      return 'Aulas concluídas';
    case 'approved':
      return 'Aprovado';
    case 'failed':
      return 'Reprovado';
    case 'not_started':
      return 'Liberado';
    default:
      return 'Acesso administrativo';
  }
}

export default function CourseDetailPage() {
  const params = useParams();
  const slug = String(params.id);

  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      setLoading(true);
      setErrorMessage('');
      setAccessDenied(false);

      const userId = await getCurrentUserId();

      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        setErrorMessage(profileError?.message || 'Seu perfil não foi encontrado.');
        setLoading(false);
        return;
      }

      const profile = profileData as CurrentProfile;
      setCurrentProfile(profile);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          slug,
          description,
          status,
          is_required,
          minimum_score,
          certificate_enabled,
          course_categories (
            name
          )
        `)
        .eq('slug', slug)
        .single();

      if (courseError || !courseData) {
        setErrorMessage(courseError?.message || 'Curso não encontrado.');
        setLoading(false);
        return;
      }

      const currentCourse = courseData as Course;
      setCourse(currentCourse);

      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('id, user_id, course_id, status, progress')
        .eq('user_id', userId)
        .eq('course_id', currentCourse.id)
        .maybeSingle();

      if (enrollmentData) {
        setEnrollment(enrollmentData as Enrollment);
      }

      if (!canSeeAllCourses(profile) && !enrollmentData) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const { data: examData } = await supabase
        .from('exams')
        .select('id, title, minimum_score, is_active')
        .eq('course_id', currentCourse.id)
        .eq('is_active', true)
        .maybeSingle();

      if (examData) {
        setExam(examData as Exam);
      }

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          description,
          content_type,
          content_url,
          text_content,
          duration_minutes,
          order_index
        `)
        .eq('course_id', currentCourse.id)
        .order('order_index', { ascending: true });

      if (lessonsError) {
        setErrorMessage(lessonsError.message);
        setLoading(false);
        return;
      }

      const currentLessons = (lessonsData || []) as Lesson[];
      setLessons(currentLessons);

      const lessonIds = currentLessons.map((lesson) => lesson.id);
      let currentCompletedLessonIds: string[] = [];

      if (lessonIds.length > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', userId)
          .eq('is_completed', true)
          .in('lesson_id', lessonIds);

        if (!progressError) {
          currentCompletedLessonIds = (progressData || []).map((item) => item.lesson_id);
          setCompletedLessonIds(currentCompletedLessonIds);
        }
      }

      if (enrollmentData) {
        const calculatedProgress =
          currentLessons.length > 0
            ? Math.round((currentCompletedLessonIds.length / currentLessons.length) * 100)
            : 0;

        const nextStatus =
          calculatedProgress >= 100
            ? 'completed'
            : calculatedProgress > 0
              ? 'in_progress'
              : enrollmentData.status || 'not_started';

        await supabase
          .from('enrollments')
          .update({
            progress: calculatedProgress,
            status: nextStatus,
            started_at: nextStatus === 'in_progress' ? new Date().toISOString() : undefined,
            completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
          })
          .eq('id', enrollmentData.id);

        setEnrollment({ ...(enrollmentData as Enrollment), progress: calculatedProgress, status: nextStatus });
      }

      setLoading(false);
    }

    loadCourse();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando curso...
        </div>
      </main>
    );
  }

  if (errorMessage || !course) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
          Curso não encontrado: {errorMessage}
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#f36b2a]/40 bg-[#f36b2a]/10 p-8 text-[#ffb088]">
          <p className="text-sm uppercase tracking-[0.35em]">Acesso não liberado</p>
          <h1 className="mt-4 text-3xl font-black text-white">Você ainda não está matriculado neste curso.</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Peça para um administrador liberar sua matrícula em Administração &gt; Matrículas e acessos.
          </p>
          <a
            href="/cursos"
            className="mt-6 inline-block rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white hover:bg-[#ff6a24]"
          >
            Voltar para meus cursos
          </a>
        </div>
      </main>
    );
  }

  const completedLessons = completedLessonIds.length;
  const progress =
    lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;
  const allLessonsCompleted = lessons.length > 0 && completedLessons >= lessons.length;
  const isAdminView = canSeeAllCourses(currentProfile);

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <span className="rounded-full border border-[#f36b2a]/30 bg-[#f36b2a]/10 px-3 py-1 text-xs font-bold text-[#ffb088]">
                {getCategoryName(course)}
              </span>

              <h1 className="mt-5 text-4xl font-black md:text-5xl">
                {course.title}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
                {course.description || 'Sem descrição cadastrada.'}
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-300">
                <span className="rounded-full bg-[#080c18]/70 px-4 py-2">
                  {course.is_required ? 'Obrigatório' : 'Opcional'}
                </span>

                <span className="rounded-full bg-[#080c18]/70 px-4 py-2">
                  {lessons.length} aulas
                </span>

                <span className="rounded-full bg-[#080c18]/70 px-4 py-2">
                  Nota mínima: {course.minimum_score || 80}%
                </span>

                <span className="rounded-full bg-[#080c18]/70 px-4 py-2">
                  {enrollmentLabel(enrollment?.status || null)}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-6 shadow-xl">
              <p className="text-sm text-zinc-400">Progresso do curso</p>
              <p className="mt-2 text-5xl font-black text-[#f36b2a]">
                {progress}%
              </p>

              <div className="mt-5 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-[#f36b2a] shadow-[0_0_14px_rgba(243,107,42,0.55)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {exam && allLessonsCompleted ? (
                <a
                  href={`/provas/${exam.id}`}
                  className="mt-6 block rounded-full bg-[#f36b2a] px-5 py-3 text-center text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
                >
                  Fazer prova
                </a>
              ) : exam ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 block w-full cursor-not-allowed rounded-full bg-zinc-700 px-5 py-3 text-center text-sm font-bold text-zinc-400"
                >
                  Conclua todas as aulas para liberar a prova
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-6 block w-full cursor-not-allowed rounded-full bg-zinc-700 px-5 py-3 text-center text-sm font-bold text-zinc-400"
                >
                  Prova não cadastrada
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2">
            <div className="mb-4">
              <h2 className="text-2xl font-black">Aulas do curso</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Conteúdos liberados para este treinamento.
              </p>
            </div>

            <div className="space-y-4">
              {lessons.length === 0 && (
                <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6">
                  <p className="text-lg font-black text-[#ffb088]">
                    Nenhuma aula cadastrada ainda.
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    Vá em Gerenciar aulas para adicionar o primeiro conteúdo.
                  </p>
                </div>
              )}

              {lessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-5 shadow-xl transition hover:border-[#f36b2a]/60"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f36b2a]">
                        Aula {lesson.order_index}
                      </p>

                      <h3 className="mt-3 text-xl font-black">
                        {lesson.title}
                      </h3>

                      <p className="mt-2 text-sm text-zinc-400">
                        {lesson.content_type} • {lesson.duration_minutes || 0}{' '}
                        min
                      </p>

                      {lesson.description && (
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                          {lesson.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-[#2d3a52] bg-[#080c18]/70 px-4 py-2 text-xs font-bold text-zinc-300">
                        {completedLessonIds.includes(lesson.id)
                          ? 'Concluída'
                          : 'Disponível'}
                      </span>

                      <a
                        href={`/cursos/${course.slug}/aulas/${lesson.id}`}
                        className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
                      >
                        Abrir aula
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
            <h2 className="text-2xl font-black">Resumo do curso</h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                <p className="text-sm text-zinc-400">Total de aulas</p>
                <p className="mt-1 text-3xl font-black text-[#f36b2a]">
                  {lessons.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                <p className="text-sm text-zinc-400">Aulas concluídas</p>
                <p className="mt-1 text-3xl font-black text-[#f36b2a]">
                  {completedLessons}
                </p>
              </div>

              <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                <p className="text-sm text-zinc-400">Nota mínima</p>
                <p className="mt-1 text-3xl font-black text-[#f36b2a]">
                  {course.minimum_score || 80}%
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4">
              <p className="font-bold text-[#ffb088]">Regra de aprovação</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Para liberar a prova, o colaborador precisa concluir todas as aulas. Depois, precisa atingir a nota mínima na avaliação.
              </p>
            </div>

            {isAdminView && (
              <div className="mt-5 rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4 text-sm text-zinc-400">
                Visualização administrativa: você pode acessar o curso mesmo sem matrícula.
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
