'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUserId } from '../../lib/auth';

type ExamInfo = {
  title: string;
  minimum_score: number | null;
};

type CourseInfo = {
  title: string;
  slug: string;
};

type Attempt = {
  id: string;
  score: number | null;
  status: string;
  finished_at: string | null;
  exams: ExamInfo | ExamInfo[] | null;
  courses: CourseInfo | CourseInfo[] | null;
};

function getExam(attempt: Attempt) {
  if (Array.isArray(attempt.exams)) {
    return attempt.exams[0];
  }

  return attempt.exams;
}

function getCourse(attempt: Attempt) {
  if (Array.isArray(attempt.courses)) {
    return attempt.courses[0];
  }

  return attempt.courses;
}

export default function ProvasPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadAttempts() {
      const userId = await getCurrentUserId();

      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          id,
          score,
          status,
          finished_at,
          exams (
            title,
            minimum_score
          ),
          courses (
            title,
            slug
          )
        `)
        .eq('user_id', userId)
        .order('finished_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setAttempts((data || []) as Attempt[]);
      setLoading(false);
    }

    loadAttempts();
  }, []);

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Provas e notas
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Histórico de avaliações
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Consulte as provas realizadas, notas, aprovação e evolução do colaborador.
          </p>
        </section>

        {loading && (
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
            Carregando provas...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
            Erro ao buscar provas: {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && attempts.length === 0 && (
          <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6">
            <p className="text-lg font-black text-[#ffb088]">
              Nenhuma prova realizada ainda.
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Acesse um curso, faça a avaliação e o resultado aparecerá aqui.
            </p>
          </div>
        )}

        {!loading && !errorMessage && attempts.length > 0 && (
          <>
            <div className="mb-5 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4 text-sm text-zinc-300">
              Total de avaliações realizadas:{' '}
              <strong className="text-[#f36b2a]">{attempts.length}</strong>
            </div>

            <div className="grid gap-5">
              {attempts.map((attempt) => {
                const approved = attempt.status === 'passed';
                const exam = getExam(attempt);
                const course = getCourse(attempt);

                return (
                  <article
                    key={attempt.id}
                    className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl"
                  >
                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                      <div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            approved
                              ? 'border-green-500/40 bg-green-500/10 text-green-200'
                              : 'border-red-500/40 bg-red-500/10 text-red-200'
                          }`}
                        >
                          {approved ? 'Aprovado' : 'Reprovado'}
                        </span>

                        <h2 className="mt-4 text-2xl font-black">
                          {exam?.title || 'Prova sem título'}
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                          Curso: {course?.title || 'Sem curso'}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500">
                          Realizada em:{' '}
                          {attempt.finished_at
                            ? new Date(attempt.finished_at).toLocaleString('pt-BR')
                            : 'Data não registrada'}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5 text-center">
                        <p className="text-sm text-zinc-400">Nota</p>
                        <p className="mt-1 text-4xl font-black text-[#f36b2a]">
                          {attempt.score || 0}%
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Mínima: {exam?.minimum_score || 80}%
                        </p>
                      </div>
                    </div>

                    {course?.slug && (
                      <a
                        href={`/cursos/${course.slug}`}
                        className="mt-5 inline-block rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
                      >
                        Voltar para o curso
                      </a>
                    )}
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
