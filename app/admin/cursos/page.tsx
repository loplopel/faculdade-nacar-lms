'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../lib/auth';

type Course = {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string | null;
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadCourses() {
      const userId = await getCurrentUserId();

      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug, status, created_at')
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
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Administração
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Gerenciar cursos
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Acesse rapidamente as aulas e provas de cada curso cadastrado.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
            >
              Voltar ao admin
            </a>

            <a
              href="/admin/novo-curso"
              className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
            >
              Criar novo curso
            </a>
          </div>
        </section>

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
          <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6 text-[#ffb088]">
            Nenhum curso cadastrado ainda.
          </div>
        )}

        {!loading && !errorMessage && courses.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {courses.map((course) => (
              <article
                key={course.id}
                className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black">{course.title}</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Status: {course.status === 'published' ? 'Publicado' : course.status}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={`/cursos/${course.slug}`}
                    className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white hover:bg-[#ff6a24]"
                  >
                    Ver curso
                  </a>

                  <a
                    href={`/admin/cursos/${course.id}/aulas`}
                    className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                  >
                    Gerenciar aulas
                  </a>

                  <a
                    href={`/admin/cursos/${course.id}/prova`}
                    className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                  >
                    Gerenciar prova
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
