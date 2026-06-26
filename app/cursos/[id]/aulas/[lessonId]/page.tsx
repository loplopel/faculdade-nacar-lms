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
  return String(type || 'text').toLowerCase();
}

function isVideoUrl(url: string | null) {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg');
}

function isPdfUrl(url: string | null) {
  if (!url) return false;
  return url.toLowerCase().split('?')[0].endsWith('.pdf');
}

function isImageUrl(url: string | null) {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return (
    cleanUrl.endsWith('.jpg') ||
    cleanUrl.endsWith('.jpeg') ||
    cleanUrl.endsWith('.png') ||
    cleanUrl.endsWith('.webp') ||
    cleanUrl.endsWith('.gif')
  );
}

export default function LessonDetailPage() {
  const params = useParams();
  const courseSlug = String(params.id);
  const lessonId = String(params.lessonId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadLesson() {
      setLoading(true);
      setErrorMessage('');

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

      if (courseError || !courseData) {
        setErrorMessage(courseError?.message || 'Curso não encontrado.');
        setLoading(false);
        return;
      }

      const currentCourse = courseData as Course;

      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select(
          'id, course_id, title, description, content_type, content_url, text_content, duration_minutes, order_index'
        )
        .eq('id', lessonId)
        .eq('course_id', currentCourse.id)
        .single();

      if (lessonError || !lessonData) {
        setErrorMessage(lessonError?.message || 'Aula não encontrada.');
        setLoading(false);
        return;
      }

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('is_completed')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      setCourse(currentCourse);
      setLesson(lessonData as Lesson);
      setCompleted(Boolean(progressData?.is_completed));
      setLoading(false);
    }

    loadLesson();
  }, [courseSlug, lessonId]);

  async function handleCompleteLesson() {
    if (!lesson || !course) return;

    setSavingProgress(true);
    setProgressMessage('');
    setErrorMessage('');

    const userId = await getCurrentUserId();

    if (!userId) {
      window.location.href = '/login';
      return;
    }

    const { error } = await supabase.from('lesson_progress').upsert(
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
    setProgressMessage('Aula concluída com sucesso.');
  }

  function renderContent() {
    if (!lesson) return null;

    const type = normalizeContentType(lesson.content_type);
    const url = lesson.content_url?.trim() || null;

    if ((type === 'video' || isVideoUrl(url)) && url) {
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-[#2d3a52] bg-black">
            <video
              key={url}
              controls
              playsInline
              preload="metadata"
              className="h-auto w-full bg-black"
            >
              <source src={url} type="video/mp4" />
              Seu navegador não conseguiu reproduzir este vídeo.
            </video>
          </div>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-200 hover:border-[#f36b2a] hover:text-white"
          >
            Abrir vídeo em nova aba
          </a>

          <p className="text-sm leading-6 text-zinc-400">
            Se o vídeo abrir em nova aba, mas não tocar no player, o arquivo pode estar em MP4 com codificação incompatível. O ideal é MP4 H.264 com áudio AAC.
          </p>
        </div>
      );
    }

    if ((type === 'pdf' || isPdfUrl(url)) && url) {
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-[#2d3a52] bg-[#080c18]">
            <iframe
              src={url}
              className="h-[720px] w-full"
              title={lesson.title}
            />
          </div>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white hover:bg-[#ff6a24]"
          >
            Abrir PDF em nova aba
          </a>
        </div>
      );
    }

    if ((type === 'image' || isImageUrl(url)) && url) {
      return (
        <div className="space-y-4">
          <img
            src={url}
            alt={lesson.title}
            className="w-full rounded-3xl border border-[#2d3a52] bg-[#080c18] object-contain"
          />

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-200 hover:border-[#f36b2a] hover:text-white"
          >
            Abrir imagem em nova aba
          </a>
        </div>
      );
    }

    if (url) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white hover:bg-[#ff6a24]"
        >
          Abrir conteúdo da aula
        </a>
      );
    }

    return (
      <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/70 p-6 text-zinc-400">
        Esta aula ainda não possui link de conteúdo cadastrado.
      </div>
    );
  }

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

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap gap-3">
          <a
            href={`/cursos/${course.slug}`}
            className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
          >
            Voltar para o curso
          </a>

          <a
            href="/cursos"
            className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
          >
            Meus cursos
          </a>
        </div>

        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Aula {lesson.order_index}
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            {lesson.title}
          </h1>

          <p className="mt-4 text-zinc-400">{course.title}</p>

          {lesson.description && (
            <p className="mt-6 max-w-4xl text-base leading-7 text-zinc-300">
              {lesson.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-[#2d3a52] bg-[#080c18]/70 px-4 py-2 text-zinc-300">
              Tipo: {lesson.content_type}
            </span>

            <span className="rounded-full border border-[#2d3a52] bg-[#080c18]/70 px-4 py-2 text-zinc-300">
              Duração: {lesson.duration_minutes || 0} min
            </span>

            <span
              className={`rounded-full border px-4 py-2 font-bold ${
                completed
                  ? 'border-green-500/40 bg-green-500/10 text-green-300'
                  : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'
              }`}
            >
              {completed ? 'Concluída' : 'Pendente'}
            </span>
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <h2 className="mb-6 text-2xl font-black">Conteúdo da aula</h2>
          {renderContent()}
        </section>

        {lesson.text_content && (
          <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
            <h2 className="mb-6 text-2xl font-black">Texto da aula</h2>

            <div className="whitespace-pre-line text-base leading-8 text-zinc-300">
              {lesson.text_content}
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black">Progresso</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Marque esta aula como concluída quando finalizar o conteúdo.
              </p>

              {progressMessage && (
                <p className="mt-4 text-sm font-bold text-[#f36b2a]">
                  {progressMessage}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleCompleteLesson}
              disabled={savingProgress || completed}
              className="rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completed
                ? 'Aula concluída'
                : savingProgress
                  ? 'Salvando...'
                  : 'Marcar como concluída'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
