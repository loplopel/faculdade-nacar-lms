'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient';

type Course = {
  id: string;
  title: string;
  slug: string;
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

export default function AdminCourseLessonsPage() {
  const params = useParams();
  const courseId = String(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('video');
  const [contentUrl, setContentUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [orderIndex, setOrderIndex] = useState('1');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadData() {
    setLoading(true);

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('id, title, slug')
      .eq('id', courseId)
      .single();

    if (courseError) {
      setErrorMessage(`Erro ao buscar curso: ${courseError.message}`);
      setLoading(false);
      return;
    }

    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select(
        'id, title, description, content_type, content_url, text_content, duration_minutes, order_index'
      )
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (lessonsError) {
      setErrorMessage(`Erro ao buscar aulas: ${lessonsError.message}`);
      setLoading(false);
      return;
    }

    setCourse(courseData as Course);
    setLessons((lessonsData || []) as Lesson[]);
    setOrderIndex(String((lessonsData?.length || 0) + 1));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [courseId]);

  async function handleSaveLesson() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Informe o título da aula.');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('lessons').insert({
      course_id: courseId,
      title,
      description,
      content_type: contentType,
      content_url: contentUrl || null,
      text_content: textContent || null,
      duration_minutes: Number(durationMinutes) || 0,
      order_index: Number(orderIndex) || lessons.length + 1,
      is_required: true,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(`Erro ao salvar aula: ${error.message}`);
      return;
    }

    setSuccessMessage('Aula salva com sucesso.');

    setTitle('');
    setDescription('');
    setContentType('video');
    setContentUrl('');
    setTextContent('');
    setDurationMinutes('10');

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando curso e aulas...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Administração de aulas
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            {course?.title}
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Cadastre as aulas, conteúdos, vídeos, PDFs, textos e materiais que
            farão parte deste curso.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/cursos"
              className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
            >
              Voltar para cursos
            </a>

            <a
              href={`/cursos/${course?.slug}`}
              className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
            >
              Ver página do curso
            </a>
          </div>
        </section>

        {successMessage && (
          <div className="mb-6 rounded-3xl border border-green-500/40 bg-green-500/10 p-5 text-green-200">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2">
            <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
              <h2 className="text-2xl font-black">Cadastrar nova aula</h2>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Título da aula
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Ex: Introdução ao treinamento"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Descrição da aula
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Explique o objetivo desta aula..."
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Tipo de conteúdo
                    </label>
                    <select
                      value={contentType}
                      onChange={(event) => setContentType(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none focus:border-[#f36b2a]"
                    >
                      <option value="video">Vídeo</option>
                      <option value="text">Texto</option>
                      <option value="pdf">PDF</option>
                      <option value="image">Imagem</option>
                      <option value="mixed">Misto</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Duração em minutos
                    </label>
                    <input
                      value={durationMinutes}
                      onChange={(event) =>
                        setDurationMinutes(event.target.value)
                      }
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Ordem
                    </label>
                    <input
                      value={orderIndex}
                      onChange={(event) => setOrderIndex(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Link do conteúdo
                  </label>
                  <input
                    value={contentUrl}
                    onChange={(event) => setContentUrl(event.target.value)}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Link do vídeo, PDF, imagem ou material"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Texto da aula
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(event) => setTextContent(event.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Conteúdo em texto da aula, resumo ou instruções..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveLesson}
                  disabled={saving}
                  className="rounded-2xl bg-[#f36b2a] px-5 py-4 text-lg font-black text-white shadow-[0_0_28px_rgba(243,107,42,0.35)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar aula'}
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
            <h2 className="text-2xl font-black">Aulas cadastradas</h2>

            <p className="mt-2 text-sm text-zinc-400">
              Total de aulas: {lessons.length}
            </p>

            <div className="mt-5 space-y-4">
              {lessons.length === 0 && (
                <div className="rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4 text-sm text-zinc-300">
                  Nenhuma aula cadastrada ainda.
                </div>
              )}

              {lessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f36b2a]">
                    Aula {lesson.order_index}
                  </p>

                  <h3 className="mt-3 font-black">{lesson.title}</h3>

                  <p className="mt-2 text-xs text-zinc-400">
                    Tipo: {lesson.content_type} • Duração:{' '}
                    {lesson.duration_minutes || 0} min
                  </p>

                  {lesson.description && (
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {lesson.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}