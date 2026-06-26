'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../../../lib/auth';

type Course = {
  id: string;
  title: string;
  slug: string;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  duration_minutes: number | null;
  order_index: number;
};

function normalizeContentType(type: string | null | undefined) {
  return String(type || 'text').toLowerCase().trim();
}

function getContentTypeLabel(type: string) {
  const normalizedType = normalizeContentType(type);

  const labels: Record<string, string> = {
    video: 'Vídeo',
    text: 'Texto',
    pdf: 'PDF',
    image: 'Imagem',
    mixed: 'Misto',
  };

  return labels[normalizedType] || type;
}

function isPdfUrl(url: string) {
  return url.toLowerCase().split('?')[0].endsWith('.pdf');
}

function isImageUrl(url: string) {
  const cleanUrl = url.toLowerCase().split('?')[0];
  return (
    cleanUrl.endsWith('.jpg') ||
    cleanUrl.endsWith('.jpeg') ||
    cleanUrl.endsWith('.png') ||
    cleanUrl.endsWith('.webp') ||
    cleanUrl.endsWith('.gif')
  );
}

function isVideoUrl(url: string) {
  const cleanUrl = url.toLowerCase().split('?')[0];
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov')
  );
}

function getSafeContentUrl(url: string | null) {
  const cleanUrl = String(url || '').trim();

  if (!cleanUrl) {
    return '';
  }

  return cleanUrl;
}

export default function LessonDetailPage() {
  const params = useParams();

  const courseSlug = String(params.id);
  const lessonId = String(params.lessonId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadLesson() {
      const userId = await getCurrentUserId();

      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, slug')
        .eq('slug', courseSlug)
        .single();

      if (courseError) {
        setErrorMessage(`Erro ao buscar curso: ${courseError.message}`);
        setLoading(false);
        return;
      }

      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select(
          'id, course_id, title, description, content_type, content_url, text_content, duration_minutes, order_index'
        )
        .eq('id', lessonId)
        .eq('course_id', courseData.id)
        .single();

      if (lessonError) {
        setErrorMessage(`Erro ao buscar aula: ${lessonError.message}`);
        setLoading(false);
        return;
      }

      setCourse(courseData as Course);
      setLesson(lessonData as Lesson);

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('is_completed')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();

      if (progressData?.is_completed) {
        setCompleted(true);
      }

      setLoading(false);
    }

    loadLesson();
  }, [courseSlug, lessonId]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando aula...
        </div>
      </main>
    );
  }

  if (errorMessage || !course || !lesson) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
          {errorMessage || 'Aula não encontrada.'}
        </div>
      </main>
    );
  }

  const contentType = normalizeContentType(lesson.content_type);
  const contentUrl = getSafeContentUrl(lesson.content_url);

  const shouldShowVideo =
    Boolean(contentUrl) && (contentType === 'video' || isVideoUrl(contentUrl));

  const shouldShowPdf =
    Boolean(contentUrl) && (contentType === 'pdf' || isPdfUrl(contentUrl));

  const shouldShowImage =
    Boolean(contentUrl) && (contentType === 'image' || isImageUrl(contentUrl));

  const shouldShowGenericLink =
    Boolean(contentUrl) && !shouldShowVideo && !shouldShowPdf && !shouldShowImage;

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Faculdade Nacar
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            {lesson.title}
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Curso: <strong>{course.title}</strong>
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-300">
            <span className="rounded-full bg-[#080c18]/70 px-4 py-2">
              Aula {lesson.order_index}
            </span>

            <span className="rounded-full bg-[#080c18]/70 px-4 py-2">
              {getContentTypeLabel(lesson.content_type)}
            </span>

            <span className="rounded-full bg-[#080c18]/70 px-4 py-2">
              {lesson.duration_minutes || 0} minutos
            </span>

            <span className="rounded-full bg-[#080c18]/70 px-4 py-2">
              {completed ? 'Concluída' : 'Em andamento'}
            </span>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2">
            <article className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
              <h2 className="text-2xl font-black">Conteúdo da aula</h2>

              {lesson.description && (
                <p className="mt-4 rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4 text-sm leading-6 text-zinc-300">
                  {lesson.description}
                </p>
              )}

              {shouldShowVideo && (
                <div className="mt-6 rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5">
                  <div className="overflow-hidden rounded-2xl border border-[#2d3a52] bg-black">
                    <video
                      controls
                      preload="metadata"
                      playsInline
                      className="aspect-video w-full bg-black"
                      src={contentUrl}
                    >
                      Seu navegador não suporta reprodução de vídeo.
                    </video>
                  </div>

                  <a
                    href={contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block break-all text-sm font-bold text-[#f36b2a] hover:text-[#ffb088]"
                  >
                    Abrir vídeo em nova aba
                  </a>
                </div>
              )}

              {shouldShowPdf && (
                <div className="mt-6 rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5">
                  <div className="overflow-hidden rounded-2xl border border-[#2d3a52] bg-white">
                    <iframe
                      src={contentUrl}
                      title={lesson.title}
                      className="h-[620px] w-full"
                    />
                  </div>

                  <a
                    href={contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block break-all text-sm font-bold text-[#f36b2a] hover:text-[#ffb088]"
                  >
                    Abrir PDF em nova aba
                  </a>
                </div>
              )}

              {shouldShowImage && (
                <div className="mt-6 rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5">
                  <div className="overflow-hidden rounded-2xl border border-[#2d3a52] bg-black/40">
                    <img
                      src={contentUrl}
                      alt={lesson.title}
                      className="max-h-[620px] w-full object-contain"
                    />
                  </div>

                  <a
                    href={contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block break-all text-sm font-bold text-[#f36b2a] hover:text-[#ffb088]"
                  >
                    Abrir imagem em nova aba
                  </a>
                </div>
              )}

              {shouldShowGenericLink && (
                <div className="mt-6 rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5">
                  <p className="text-sm font-bold text-[#ffb088]">
                    Material da aula
                  </p>

                  <a
                    href={contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block break-all text-sm font-bold text-[#f36b2a] hover:text-[#ffb088]"
                  >
                    Abrir conteúdo em nova aba
                  </a>
                </div>
              )}

              {lesson.text_content && (
                <div className="mt-6 rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-6">
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#f36b2a]">
                    Texto da aula
                  </p>

                  <div className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-300">
                    {lesson.text_content}
                  </div>
                </div>
              )}

              {!contentUrl && !lesson.text_content && (
                <div className="mt-6 rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6">
                  <p className="font-bold text-[#ffb088]">
                    Esta aula ainda não possui conteúdo.
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    Volte na área administrativa e adicione texto, link, vídeo,
                    PDF ou imagem.
                  </p>
                </div>
              )}
            </article>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
              <h2 className="text-2xl font-black">Ações da aula</h2>

              <button
                type="button"
                onClick={async () => {
                  setSavingProgress(true);
                  setProgressMessage('');

                  const userId = await getCurrentUserId();

                  if (!userId) {
                    window.location.href = '/login';
                    return;
                  }

                  const { error } = await supabase
                    .from('lesson_progress')
                    .upsert(
                      {
                        user_id: userId,
                        lesson_id: lesson.id,
                        course_id: course.id,
                        is_completed: true,
                        completed_at: new Date().toISOString(),
                      },
                      {
                        onConflict: 'user_id,lesson_id',
                      }
                    );

                  setSavingProgress(false);

                  if (error) {
                    setProgressMessage(`Erro ao salvar progresso: ${error.message}`);
                    return;
                  }

                  setCompleted(true);
                  setProgressMessage('Aula marcada como concluída.');
                }}
                disabled={savingProgress || completed}
                className="mt-6 w-full rounded-2xl bg-[#f36b2a] px-5 py-4 text-lg font-black text-white shadow-[0_0_28px_rgba(243,107,42,0.35)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProgress
                  ? 'Salvando...'
                  : completed
                    ? 'Aula concluída'
                    : 'Marcar como concluída'}
              </button>

              {progressMessage && (
                <p className="mt-4 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4 text-sm text-zinc-300">
                  {progressMessage}
                </p>
              )}

              <a
                href={`/cursos/${course.slug}`}
                className="mt-4 block rounded-2xl border border-[#2d3a52] bg-white/5 px-5 py-4 text-center text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
              >
                Voltar para o curso
              </a>

              <a
                href="/cursos"
                className="mt-3 block text-center text-sm font-bold text-zinc-500 hover:text-white"
              >
                Voltar para Meus cursos
              </a>
            </div>

            <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6 shadow-xl">
              <h2 className="text-xl font-black text-[#ffb088]">
                Dica de conclusão
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Assista ao conteúdo completo, leia as orientações da aula e só
                depois marque como concluída.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
