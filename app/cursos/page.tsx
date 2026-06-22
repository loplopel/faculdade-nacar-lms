'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUserId } from '../../lib/auth';

type CategoryInfo = {
  name: string;
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

function getCategoryName(course: Course) {
  if (Array.isArray(course.course_categories)) {
    return course.course_categories[0]?.name || 'Sem categoria';
  }

  return course.course_categories?.name || 'Sem categoria';
}

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      setErrorMessage('');

      const userId = await getCurrentUserId();

      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const { data, error } = await supabase
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
        .order('created_at', { ascending: false });

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
            Cursos cadastrados no Supabase para treinamento e avaliação dos
            colaboradores.
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
              Nenhum curso cadastrado ainda.
            </p>

            <p className="mt-2 text-sm text-zinc-300">
              Vá em Administração e crie o primeiro curso.
            </p>
          </div>
        )}

        {!loading && !errorMessage && courses.length > 0 && (
          <>
            <div className="mb-5 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4 text-sm text-zinc-300">
              Total de cursos no Supabase:{' '}
              <strong className="text-[#f36b2a]">{courses.length}</strong>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {courses.map((course) => (
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
                      {course.status === 'published' ? 'Publicado' : course.status}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-zinc-400">
                    {course.description || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={`/cursos/${course.slug}`}
                      className="inline-block rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
                    >
                      Acessar curso
                    </a>

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
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
