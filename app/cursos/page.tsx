'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUserId } from '../../lib/auth';

type Role = 'admin' | 'gestor' | 'instrutor' | 'funcionario';

type CategoryInfo = {
  name: string;
};

type CurrentProfile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean | null;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  is_required: boolean;
  minimum_score: number | null;
  course_categories: CategoryInfo | CategoryInfo[] | null;
};

type Enrollment = {
  id: string;
  course_id: string;
  status: string;
  progress: number | null;
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
      return 'Concluído';
    case 'approved':
      return 'Aprovado';
    case 'failed':
      return 'Reprovado';
    case 'not_started':
      return 'Liberado';
    default:
      return 'Não matriculado';
  }
}

export default function CursosPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const enrollmentByCourseId = useMemo(() => {
    const map = new Map<string, Enrollment>();
    enrollments.forEach((enrollment) => map.set(enrollment.course_id, enrollment));
    return map;
  }, [enrollments]);

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      setErrorMessage('');

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

      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id, course_id, status, progress')
        .eq('user_id', userId);

      if (enrollmentsError) {
        setErrorMessage(`Erro ao buscar matrículas: ${enrollmentsError.message}. Rode o SQL da v1.5 no Supabase.`);
        setLoading(false);
        return;
      }

      const userEnrollments = (enrollmentsData || []) as Enrollment[];
      setEnrollments(userEnrollments);

      let query = supabase
        .from('courses')
        .select(`
          id,
          title,
          slug,
          description,
          status,
          is_required,
          minimum_score,
          course_categories (
            name
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (!canSeeAllCourses(profile)) {
        const allowedCourseIds = userEnrollments.map((enrollment) => enrollment.course_id);

        if (allowedCourseIds.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        query = query.in('id', allowedCourseIds);
      }

      const { data, error } = await query;

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setCourses((data || []) as Course[]);
      setLoading(false);
    }

    loadCourses();
  }, []);

  const isAdminView = canSeeAllCourses(currentProfile);

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Faculdade Nacar
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Meus cursos
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            {isAdminView
              ? 'Como admin, gestor ou instrutor, você visualiza todos os cursos publicados. Funcionários visualizam apenas os cursos em que estão matriculados.'
              : 'Cursos liberados para o seu perfil pela administração da Faculdade Nacar.'}
          </p>
        </div>

        {loading && (
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
            Carregando cursos...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
            Erro ao buscar cursos: {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && courses.length === 0 && (
          <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6">
            <p className="text-lg font-black text-[#ffb088]">
              Nenhum curso liberado para você ainda.
            </p>

            <p className="mt-2 text-sm text-zinc-300">
              Peça para um administrador matricular seu usuário em um curso na área de Matrículas e acessos.
            </p>
          </div>
        )}

        {!loading && !errorMessage && courses.length > 0 && (
          <>
            <div className="mb-5 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4 text-sm text-zinc-300">
              Cursos visíveis para este perfil:{' '}
              <strong className="text-[#f36b2a]">{courses.length}</strong>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {courses.map((course) => {
                const enrollment = enrollmentByCourseId.get(course.id);

                return (
                  <article
                    key={course.id}
                    className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="rounded-full border border-[#f36b2a]/30 bg-[#f36b2a]/10 px-3 py-1 text-xs font-bold text-[#ffb088]">
                          {getCategoryName(course)}
                        </span>

                        <h2 className="mt-4 text-2xl font-black">
                          {course.title}
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                          {course.is_required ? 'Obrigatório' : 'Opcional'} •
                          Nota mínima: {course.minimum_score || 80}%
                        </p>
                      </div>

                      <span className="rounded-full bg-[#080c18] px-3 py-2 text-xs font-bold text-zinc-300">
                        {isAdminView && !enrollment ? 'Admin' : enrollmentLabel(enrollment?.status || null)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-zinc-400">
                      {course.description || 'Sem descrição cadastrada.'}
                    </p>

                    {enrollment && (
                      <div className="mt-5 rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
                          <span>Progresso da matrícula</span>
                          <strong className="text-[#f36b2a]">
                            {Math.round(Number(enrollment.progress || 0))}%
                          </strong>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-[#f36b2a]"
                            style={{ width: `${Math.round(Number(enrollment.progress || 0))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href={`/cursos/${course.slug}`}
                        className="inline-block rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
                      >
                        Acessar curso
                      </a>

                      {isAdminView && (
                        <>
                          <a
                            href={`/admin/cursos/${course.id}/aulas`}
                            className="inline-block rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                          >
                            Gerenciar aulas
                          </a>

                          <a
                            href={`/admin/cursos/${course.id}/prova`}
                            className="inline-block rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                          >
                            Gerenciar prova
                          </a>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
