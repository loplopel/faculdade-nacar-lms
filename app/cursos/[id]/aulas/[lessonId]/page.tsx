'use client';

import { useEffect, useMemo, useState } from 'react';
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

type Material = {
  id: string;
  title: string;
  file_type: string;
  file_url: string | null;
  description: string | null;
};

function normalizeContentType(type: string | null | undefined) {
  return String(type || 'text').toLowerCase();
}

function getContentTypeLabel(type: string | null | undefined) {
  const normalized = normalizeContentType(type);

  const labels: Record<string, string> = {
    text: 'Texto',
    video: 'Vídeo',
    pdf: 'PDF',
    image: 'Imagem',
    mixed: 'Misto',
    link: 'Link',
  };

  return labels[normalized] || normalized;
}

function extractYouTubeId(url: string) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractVimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  return match?.[1] || null;
}

function getCleanUrl(url: string | null) {
  return String(url || '').trim();
}

function getUrlWithoutQuery(url: string | null) {
  return getCleanUrl(url).toLowerCase().split('?')[0];
}

function isVideoUrl(url: string | null) {
  const cleanUrl = getUrlWithoutQuery(url);

  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov')
  );
}

function getVideoMimeType(url: string) {
  const cleanUrl = getUrlWithoutQuery(url);

  if (cleanUrl.endsWith('.webm')) return 'video/webm';
  if (cleanUrl.endsWith('.ogg')) return 'video/ogg';
  if (cleanUrl.endsWith('.mov')) return 'video/mp4';

  return 'video/mp4';
}

function isPdfUrl(url: string | null) {
  return getUrlWithoutQuery(url).endsWith('.pdf');
}

function isImageUrl(url: string | null) {
  const cleanUrl = getUrlWithoutQuery(url);

  return (
    cleanUrl.endsWith('.jpg') ||
    cleanUrl.endsWith('.jpeg') ||
    cleanUrl.endsWith('.png') ||
    cleanUrl.endsWith('.webp') ||
    cleanUrl.endsWith('.gif')
  );
}

function isExternalUrl(url: string | null) {
  const cleanUrl = getCleanUrl(url);
  return cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://');
}

function getMaterialLabel(fileType: string | null | undefined) {
  const type = normalizeContentType(fileType);

  const labels: Record<string, string> = {
    pdf: 'PDF',
    video: 'Vídeo',
    image: 'Imagem',
    text: 'Texto',
    link: 'Link',
  };

  return labels[type] || 'Material';
}

export default function LessonDetailPage() {
  const params = useParams();
  const courseSlug = String(params.id);
  const lessonId = String(params.lessonId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [completed, setCompleted] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadLesson() {
      setLoading(true);
      setErrorMessage('');
      setProgressMessage('');

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

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(
          'id, course_id, title, description, content_type, content_url, text_content, duration_minutes, order_index'
        )
        .eq('course_id', currentCourse.id)
        .order('order_index', { ascending: true });

      if (lessonsError) {
        setErrorMessage(lessonsError.message);
        setLoading(false);
        return;
      }

      const currentLessons = (lessonsData || []) as Lesson[];
      const currentLesson = currentLessons.find((item) => item.id === lessonId);

      if (!currentLesson) {
        setErrorMessage('Aula não encontrada neste curso.');
        setLoading(false);
        return;
      }

      const lessonIds = currentLessons.map((item) => item.id);

      if (lessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, is_completed')
          .eq('user_id', userId)
          .eq('is_completed', true)
          .in('lesson_id', lessonIds);

        const completedIds = (progressData || []).map((item) => item.lesson_id);
        setCompletedLessonIds(completedIds);
        setCompleted(completedIds.includes(lessonId));
      }

      const { data: materialsData } = await supabase
        .from('materials')
        .select('id, title, file_type, file_url, description')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

      setCourse(currentCourse);
      setLessons(currentLessons);
      setLesson(currentLesson);
      setMaterials((materialsData || []) as Material[]);
      setLoading(false);
    }

    loadLesson();
  }, [courseSlug, lessonId]);

  const currentIndex = useMemo(() => {
    return lessons.findIndex((item) => item.id === lesson?.id);
  }, [lessons, lesson?.id]);

  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1
      ? lessons[currentIndex + 1]
      : null;

  const progress = lessons.length
    ? Math.round((completedLessonIds.length / lessons.length) * 100)
    : 0;

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
    setCompletedLessonIds((current) =>
      current.includes(lesson.id) ? current : [...current, lesson.id]
    );
    setProgressMessage('Aula concluída com sucesso.');
  }

  function renderContent() {
    if (!lesson) return null;

    const type = normalizeContentType(lesson.content_type);
    const url = getCleanUrl(lesson.content_url);
    const youtubeId = url ? extractYouTubeId(url) : null;
    const vimeoId = url ? extractVimeoId(url) : null;

    if (!url && type !== 'text') {
      return (
        <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/70 p-6 text-zinc-400">
          Esta aula ainda não possui link de conteúdo cadastrado.
        </div>
      );
    }

    if (type === 'video' && youtubeId) {
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-[#2d3a52] bg-black shadow-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title={lesson.title}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <ContentAction href={url} label="Abrir vídeo em nova aba" />
        </div>
      );
    }

    if (type === 'video' && vimeoId) {
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-[#2d3a52] bg-black shadow-2xl">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              title={lesson.title}
              className="aspect-video w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>

          <ContentAction href={url} label="Abrir vídeo em nova aba" />
        </div>
      );
    }

    if ((type === 'video' || isVideoUrl(url)) && url) {
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-[#2d3a52] bg-black shadow-2xl">
            <video
              key={url}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-black"
            >
              <source src={url} type={getVideoMimeType(url)} />
              Seu navegador não conseguiu reproduzir este vídeo.
            </video>
          </div>

          <div className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5">
            <p className="text-sm font-bold text-zinc-200">Orientação técnica</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Se o vídeo abrir em nova aba, mas não tocar no player, converta o
              arquivo para MP4 com vídeo H.264 e áudio AAC. Esse é o formato mais
              compatível para navegador.
            </p>

            <div className="mt-4">
              <ContentAction href={url} label="Abrir vídeo em nova aba" />
            </div>
          </div>
        </div>
      );
    }

    if ((type === 'pdf' || isPdfUrl(url)) && url) {
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-[#2d3a52] bg-[#080c18] shadow-2xl">
            <iframe
              src={url}
              className="h-[720px] w-full bg-white"
              title={lesson.title}
            />
          </div>

          <ContentAction href={url} label="Abrir PDF em nova aba" primary />
        </div>
      );
    }

    if ((type === 'image' || isImageUrl(url)) && url) {
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-[#2d3a52] bg-[#080c18] p-3 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={lesson.title}
              className="max-h-[760px] w-full rounded-3xl object-contain"
            />
          </div>

          <ContentAction href={url} label="Abrir imagem em nova aba" />
        </div>
      );
    }

    if (url && isExternalUrl(url)) {
      return (
        <div className="rounded-[2rem] border border-[#2d3a52] bg-[#080c18]/70 p-6">
          <p className="text-lg font-black text-white">Conteúdo externo</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Esta aula possui um material externo. Clique no botão abaixo para
            abrir em nova aba.
          </p>

          <div className="mt-5">
            <ContentAction href={url} label="Abrir conteúdo da aula" primary />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/70 p-6 text-zinc-400">
        Esta aula usa apenas conteúdo em texto.
      </div>
    );
  }

  function renderMaterials() {
    if (materials.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/60 p-5 text-sm text-zinc-500">
          Nenhum material de apoio cadastrado para esta aula.
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {materials.map((material) => (
          <article
            key={material.id}
            className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#f36b2a]/30 bg-[#f36b2a]/10 px-3 py-1 text-xs font-bold text-[#ffb088]">
                {getMaterialLabel(material.file_type)}
              </span>
            </div>

            <h3 className="mt-4 text-lg font-black">{material.title}</h3>

            {material.description && (
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {material.description}
              </p>
            )}

            {material.file_url && (
              <div className="mt-5">
                <ContentAction href={material.file_url} label="Abrir material" />
              </div>
            )}
          </article>
        ))}
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
      <div className="mx-auto max-w-7xl">
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

        <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
          <div>
            <section className="mb-8 overflow-hidden rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 shadow-2xl">
              <div className="border-b border-[#2d3a52] bg-[#080c18]/60 p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[#f36b2a]/30 bg-[#f36b2a]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#ffb088]">
                    Aula {lesson.order_index}
                  </span>

                  <span className="rounded-full border border-[#2d3a52] bg-[#080c18]/70 px-4 py-2 text-xs font-bold text-zinc-300">
                    {getContentTypeLabel(lesson.content_type)}
                  </span>

                  <span className="rounded-full border border-[#2d3a52] bg-[#080c18]/70 px-4 py-2 text-xs font-bold text-zinc-300">
                    {lesson.duration_minutes || 0} min
                  </span>

                  <span
                    className={`rounded-full border px-4 py-2 text-xs font-bold ${
                      completed
                        ? 'border-green-500/40 bg-green-500/10 text-green-300'
                        : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'
                    }`}
                  >
                    {completed ? 'Concluída' : 'Pendente'}
                  </span>
                </div>

                <h1 className="mt-6 text-4xl font-black md:text-5xl">
                  {lesson.title}
                </h1>

                <p className="mt-3 text-sm font-bold text-zinc-400">
                  {course.title}
                </p>

                {lesson.description && (
                  <p className="mt-5 max-w-4xl text-base leading-7 text-zinc-300">
                    {lesson.description}
                  </p>
                )}
              </div>

              <div className="p-5 md:p-8">{renderContent()}</div>
            </section>

            {lesson.text_content && (
              <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
                <h2 className="text-2xl font-black">Texto da aula</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Leia o conteúdo complementar antes de concluir a aula.
                </p>

                <div className="mt-6 whitespace-pre-line rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-6 text-base leading-8 text-zinc-300">
                  {lesson.text_content}
                </div>
              </section>
            )}

            <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
              <h2 className="text-2xl font-black">Materiais de apoio</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Arquivos e links complementares vinculados a esta aula.
              </p>

              <div className="mt-6">{renderMaterials()}</div>
            </section>

            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-black">Concluir aula</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Marque esta aula como concluída quando finalizar o conteúdo.
                    O progresso do curso será atualizado automaticamente.
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

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-6 shadow-2xl xl:sticky xl:top-6">
              <h2 className="text-xl font-black">Seu progresso</h2>

              <div className="mt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Curso</p>
                    <p className="mt-1 text-4xl font-black text-[#f36b2a]">
                      {progress}%
                    </p>
                  </div>

                  <p className="text-sm text-zinc-400">
                    {completedLessonIds.length}/{lessons.length} aulas
                  </p>
                </div>

                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-[#f36b2a] shadow-[0_0_14px_rgba(243,107,42,0.55)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {previousLesson ? (
                  <a
                    href={`/cursos/${course.slug}/aulas/${previousLesson.id}`}
                    className="rounded-2xl border border-[#2d3a52] bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 hover:border-[#f36b2a]"
                  >
                    ← Aula anterior
                    <span className="mt-1 block text-xs font-normal text-zinc-500">
                      {previousLesson.title}
                    </span>
                  </a>
                ) : (
                  <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 px-4 py-3 text-sm text-zinc-500">
                    Esta é a primeira aula.
                  </div>
                )}

                {nextLesson ? (
                  <a
                    href={`/cursos/${course.slug}/aulas/${nextLesson.id}`}
                    className="rounded-2xl bg-[#f36b2a] px-4 py-3 text-sm font-bold text-white hover:bg-[#ff6a24]"
                  >
                    Próxima aula →
                    <span className="mt-1 block text-xs font-normal text-white/80">
                      {nextLesson.title}
                    </span>
                  </a>
                ) : (
                  <a
                    href={`/cursos/${course.slug}`}
                    className="rounded-2xl bg-[#f36b2a] px-4 py-3 text-sm font-bold text-white hover:bg-[#ff6a24]"
                  >
                    Voltar ao curso
                    <span className="mt-1 block text-xs font-normal text-white/80">
                      Conferir prova e certificado
                    </span>
                  </a>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-6 shadow-2xl">
              <h2 className="text-xl font-black">Aulas da trilha</h2>

              <div className="mt-5 space-y-3">
                {lessons.map((item) => {
                  const isCurrent = item.id === lesson.id;
                  const isCompleted = completedLessonIds.includes(item.id);

                  return (
                    <a
                      key={item.id}
                      href={`/cursos/${course.slug}/aulas/${item.id}`}
                      className={`block rounded-2xl border p-4 text-sm transition ${
                        isCurrent
                          ? 'border-[#f36b2a] bg-[#f36b2a]/10 text-white'
                          : 'border-[#2d3a52] bg-[#080c18]/60 text-zinc-300 hover:border-[#f36b2a]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold">
                          Aula {item.order_index}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-green-500/10 text-green-300'
                              : 'bg-white/5 text-zinc-400'
                          }`}
                        >
                          {isCompleted ? 'OK' : 'Pendente'}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                        {item.title}
                      </p>
                    </a>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ContentAction({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex rounded-full px-5 py-3 text-sm font-bold transition ${
        primary
          ? 'bg-[#f36b2a] text-white hover:bg-[#ff6a24]'
          : 'border border-[#2d3a52] bg-white/5 text-zinc-200 hover:border-[#f36b2a] hover:text-white'
      }`}
    >
      {label}
    </a>
  );
}
