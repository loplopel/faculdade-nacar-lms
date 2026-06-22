'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from '../lib/auth';

type Course = {
  id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  slug: string;
};

type Attempt = {
  id: string;
  score: number | null;
  status: string;
};

export default function HomePage() {

  const [courses, setCourses] = useState<Course[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const userId = await getCurrentUserId();

      if (!userId) {
        window.location.href = '/login';
        return;
      }
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, description, is_required, slug')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      const { count: lessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });

      const { count: completedCount } = await supabase
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_completed', true);

      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select('id, score, status')
        .eq('user_id', userId)
        .order('finished_at', { ascending: false });

      const { count: certificatesTotal } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setCourses((coursesData || []) as Course[]);
      setTotalLessons(lessonsCount || 0);
      setCompletedLessons(completedCount || 0);
      setAttempts((attemptsData || []) as Attempt[]);
      setCertificatesCount(certificatesTotal || 0);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const averageScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) /
            attempts.length
        )
      : 0;

  const approvedAttempts = attempts.filter(
    (attempt) => attempt.status === 'passed'
  ).length;

  const progress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
                LMS Corporativo
              </p>

              <h1 className="mt-4 text-4xl font-black md:text-6xl">
                Faculdade <span className="text-[#f36b2a]">Nacar</span>
              </h1>

              <p className="mt-4 max-w-3xl text-zinc-300">
                Portal de conhecimento, treinamentos, provas, notas,
                certificados e evolução dos colaboradores do Grupo Nacar.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/cursos"
                  className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
                >
                  Continuar estudando
                </a>

                <a
                  href="/certificados"
                  className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                >
                  Ver certificados
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-6 shadow-xl">
              <p className="text-sm text-zinc-400">Seu progresso geral</p>
              <p className="mt-2 text-5xl font-black text-[#f36b2a]">
                {progress}%
              </p>

              <div className="mt-5 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-[#f36b2a] shadow-[0_0_14px_rgba(243,107,42,0.55)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                {completedLessons} de {totalLessons} aulas concluídas
              </p>
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
            Carregando dashboard...
          </div>
        )}

        {!loading && (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Cursos ativos</p>
                <p className="mt-2 text-3xl font-black">{courses.length}</p>
              </div>

              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Aulas concluídas</p>
                <p className="mt-2 text-3xl font-black">{completedLessons}</p>
              </div>

              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Provas realizadas</p>
                <p className="mt-2 text-3xl font-black">{attempts.length}</p>
              </div>

              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Média geral</p>
                <p className="mt-2 text-3xl font-black">{averageScore}%</p>
              </div>

              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Certificados</p>
                <p className="mt-2 text-3xl font-black">{certificatesCount}</p>
              </div>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <div className="mb-4">
                  <h2 className="text-2xl font-black">Cursos em destaque</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Treinamentos disponíveis no Supabase.
                  </p>
                </div>

                <div className="space-y-4">
                  {courses.length === 0 && (
                    <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6 text-sm text-zinc-300">
                      Nenhum curso publicado ainda.
                    </div>
                  )}

                  {courses.slice(0, 4).map((course) => (
                    <article
                      key={course.id}
                      className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl"
                    >
                      <span className="rounded-full border border-[#f36b2a]/30 bg-[#f36b2a]/10 px-3 py-1 text-xs font-bold text-[#ffb088]">
                        {course.is_required ? 'Obrigatório' : 'Opcional'}
                      </span>

                      <h3 className="mt-4 text-2xl font-black">
                        {course.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {course.description || 'Sem descrição cadastrada.'}
                      </p>

                      <a
                        href={`/cursos/${course.slug}`}
                        className="mt-5 inline-block rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
                      >
                        Acessar curso
                      </a>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <h2 className="text-2xl font-black">Resumo de desempenho</h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                    <p className="text-sm text-zinc-400">Aprovações</p>
                    <p className="mt-1 text-3xl font-black text-[#f36b2a]">
                      {approvedAttempts}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                    <p className="text-sm text-zinc-400">Tentativas totais</p>
                    <p className="mt-1 text-3xl font-black text-[#f36b2a]">
                      {attempts.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4">
                    <p className="font-bold text-[#ffb088]">Próxima missão</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      Continue concluindo aulas, realizando avaliações e
                      liberando certificados.
                    </p>
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  );
}