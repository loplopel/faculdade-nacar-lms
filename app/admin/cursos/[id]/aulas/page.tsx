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
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  duration_minutes: number | null;
  order_index: number;
};

type ContentType = 'text' | 'video' | 'pdf' | 'image' | 'mixed';

const contentTypes: { value: ContentType; label: string; helper: string }[] = [
  {
    value: 'text',
    label: 'Texto',
    helper: 'Use para aulas com conteúdo escrito, orientações, processos e comunicados.',
  },
  {
    value: 'video',
    label: 'Vídeo',
    helper: 'Use link público de MP4, Vimeo, YouTube não listado ou Supabase Storage.',
  },
  {
    value: 'pdf',
    label: 'PDF',
    helper: 'Use para apostilas, manuais, políticas internas e materiais de apoio.',
  },
  {
    value: 'image',
    label: 'Imagem',
    helper: 'Use para banners, fluxogramas, checklists visuais e prints explicativos.',
  },
  {
    value: 'mixed',
    label: 'Misto',
    helper: 'Use quando a aula tiver texto e também link externo de apoio.',
  },
];

const emptyForm = {
  title: '',
  description: '',
  contentType: 'text' as ContentType,
  contentUrl: '',
  textContent: '',
  durationMinutes: '10',
  orderIndex: '1',
};

function getContentTypeLabel(contentType: string) {
  return contentTypes.find((type) => type.value === contentType)?.label || contentType;
}

function normalizeContentType(contentType: string): ContentType {
  if (contentTypes.some((type) => type.value === contentType)) {
    return contentType as ContentType;
  }

  return 'text';
}

function extractYouTubeId(url: string) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function isMp4(url: string) {
  return url.toLowerCase().split('?')[0].endsWith('.mp4');
}

function AdminContentPreview({
  contentType,
  contentUrl,
  textContent,
}: {
  contentType: string;
  contentUrl: string;
  textContent: string;
}) {
  const youtubeId = contentUrl ? extractYouTubeId(contentUrl) : null;

  if (!contentUrl && !textContent) {
    return (
      <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/50 p-5 text-sm text-zinc-500">
        A prévia aparece aqui quando você preencher texto ou link.
      </div>
    );
  }

  if (contentType === 'video' && contentUrl) {
    if (youtubeId) {
      return (
        <div className="overflow-hidden rounded-3xl border border-[#2d3a52] bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="Prévia do vídeo"
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (isMp4(contentUrl)) {
      return (
        <div className="overflow-hidden rounded-3xl border border-[#2d3a52] bg-black">
          <video
            key={contentUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-black"
          >
            <source src={contentUrl} type="video/mp4" />
            Seu navegador não conseguiu reproduzir este vídeo.
          </video>
        </div>
      );
    }
  }

  if (contentType === 'pdf' && contentUrl) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[#2d3a52] bg-[#080c18]">
        <iframe
          src={contentUrl}
          title="Prévia do PDF"
          className="h-[420px] w-full"
        />
      </div>
    );
  }

  if (contentType === 'image' && contentUrl) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[#2d3a52] bg-[#080c18]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={contentUrl}
          alt="Prévia da imagem da aula"
          className="max-h-[420px] w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contentUrl && (
        <a
          href={contentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full border border-[#f36b2a]/40 bg-[#f36b2a]/10 px-5 py-3 text-sm font-bold text-[#f36b2a] hover:bg-[#f36b2a]/20"
        >
          Abrir link do conteúdo
        </a>
      )}

      {textContent && (
        <div className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5 text-sm leading-7 text-zinc-300">
          {textContent}
        </div>
      )}
    </div>
  );
}

export default function AdminCourseLessonsPage() {
  const params = useParams();
  const courseId = String(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const [title, setTitle] = useState(emptyForm.title);
  const [description, setDescription] = useState(emptyForm.description);
  const [contentType, setContentType] = useState<ContentType>(emptyForm.contentType);
  const [contentUrl, setContentUrl] = useState(emptyForm.contentUrl);
  const [textContent, setTextContent] = useState(emptyForm.textContent);
  const [durationMinutes, setDurationMinutes] = useState(emptyForm.durationMinutes);
  const [orderIndex, setOrderIndex] = useState(emptyForm.orderIndex);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movingLessonId, setMovingLessonId] = useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedType = useMemo(
    () => contentTypes.find((type) => type.value === contentType),
    [contentType]
  );

  async function loadData(options?: { keepForm?: boolean }) {
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
      .eq('id', courseId)
      .single();

    if (courseError || !courseData) {
      setErrorMessage(courseError?.message || 'Curso não encontrado.');
      setLoading(false);
      return;
    }

    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select(
        'id, title, description, content_type, content_url, text_content, duration_minutes, order_index'
      )
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (lessonsError) {
      setErrorMessage(`Erro ao buscar aulas: ${lessonsError.message}`);
      setLoading(false);
      return;
    }

    const normalizedLessons = ((lessonsData || []) as Lesson[]).map((lesson, index) => ({
      ...lesson,
      order_index: Number(lesson.order_index || index + 1),
    }));

    setCourse(courseData as Course);
    setLessons(normalizedLessons);

    if (!options?.keepForm && !editingLessonId) {
      setOrderIndex(String(normalizedLessons.length + 1));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function resetForm(nextOrder?: number) {
    setEditingLessonId(null);
    setTitle('');
    setDescription('');
    setContentType('text');
    setContentUrl('');
    setTextContent('');
    setDurationMinutes('10');
    setOrderIndex(String(nextOrder || lessons.length + 1));
  }

  function handleEditLesson(lesson: Lesson) {
    setSuccessMessage('');
    setErrorMessage('');
    setEditingLessonId(lesson.id);
    setTitle(lesson.title || '');
    setDescription(lesson.description || '');
    setContentType(normalizeContentType(lesson.content_type || 'text'));
    setContentUrl(lesson.content_url || '');
    setTextContent(lesson.text_content || '');
    setDurationMinutes(String(lesson.duration_minutes ?? 0));
    setOrderIndex(String(lesson.order_index || lessons.length + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSaveLesson() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Informe o título da aula.');
      return;
    }

    if ((contentType === 'video' || contentType === 'pdf' || contentType === 'image') && !contentUrl.trim()) {
      setErrorMessage('Para este tipo de conteúdo, informe o link do conteúdo.');
      return;
    }

    setSaving(true);

    const payload = {
      course_id: courseId,
      title: title.trim(),
      description: description.trim() || null,
      content_type: contentType,
      content_url: contentUrl.trim() || null,
      text_content: textContent.trim() || null,
      duration_minutes: Number(durationMinutes) || 0,
      order_index: Number(orderIndex) || lessons.length + 1,
      is_required: true,
    };

    const { error } = editingLessonId
      ? await supabase.from('lessons').update(payload).eq('id', editingLessonId)
      : await supabase.from('lessons').insert(payload);

    setSaving(false);

    if (error) {
      setErrorMessage(`Erro ao salvar aula: ${error.message}`);
      return;
    }

    setSuccessMessage(editingLessonId ? 'Aula atualizada com sucesso.' : 'Aula criada com sucesso.');
    resetForm(lessons.length + 1);
    await loadData();
  }

  async function handleDeleteLesson(lesson: Lesson) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a aula "${lesson.title}"? Essa ação também remove o progresso dessa aula.`
    );

    if (!confirmed) return;

    setSuccessMessage('');
    setErrorMessage('');
    setDeletingLessonId(lesson.id);

    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);

    setDeletingLessonId(null);

    if (error) {
      setErrorMessage(`Erro ao excluir aula: ${error.message}`);
      return;
    }

    setSuccessMessage('Aula excluída com sucesso.');

    if (editingLessonId === lesson.id) {
      resetForm(Math.max(lessons.length, 1));
    }

    await loadData();
  }

  async function handleMoveLesson(lesson: Lesson, direction: 'up' | 'down') {
    const currentIndex = lessons.findIndex((item) => item.id === lesson.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetLesson = lessons[targetIndex];

    if (!targetLesson) return;

    setSuccessMessage('');
    setErrorMessage('');
    setMovingLessonId(lesson.id);

    const firstUpdate = supabase
      .from('lessons')
      .update({ order_index: targetLesson.order_index })
      .eq('id', lesson.id);

    const secondUpdate = supabase
      .from('lessons')
      .update({ order_index: lesson.order_index })
      .eq('id', targetLesson.id);

    const [firstResult, secondResult] = await Promise.all([firstUpdate, secondUpdate]);

    setMovingLessonId(null);

    const error = firstResult.error || secondResult.error;

    if (error) {
      setErrorMessage(`Erro ao reordenar aulas: ${error.message}`);
      return;
    }

    setSuccessMessage('Ordem das aulas atualizada.');
    await loadData({ keepForm: true });
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
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
                Administração de aulas
              </p>

              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                {course?.title}
              </h1>

              <p className="mt-4 text-zinc-400">
                Crie, edite, exclua, organize e visualize as aulas deste curso.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/admin/cursos"
                className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
              >
                Cursos admin
              </a>

              <a
                href="/cursos"
                className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
              >
                Meus cursos
              </a>

              {course?.slug && (
                <a
                  href={`/cursos/${course.slug}`}
                  className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                >
                  Ver curso
                </a>
              )}
            </div>
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

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
          <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
            <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black">
                  {editingLessonId ? 'Editar aula' : 'Nova aula'}
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  {editingLessonId
                    ? 'Atualize os dados da aula selecionada.'
                    : 'Preencha os dados para criar uma nova aula.'}
                </p>
              </div>

              {editingLessonId && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm(lessons.length + 1);
                    setSuccessMessage('');
                    setErrorMessage('');
                  }}
                  className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-300">Título da aula</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  placeholder="Ex.: Aula 1 - Introdução"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-300">Descrição da aula</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  placeholder="Resumo breve da aula"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-zinc-300">Tipo de conteúdo</span>
                  <select
                    value={contentType}
                    onChange={(event) => setContentType(event.target.value as ContentType)}
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  >
                    {contentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-zinc-300">Duração em minutos</span>
                  <input
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    type="number"
                    min="0"
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-zinc-300">Ordem</span>
                  <input
                    value={orderIndex}
                    onChange={(event) => setOrderIndex(event.target.value)}
                    type="number"
                    min="1"
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  />
                </label>
              </div>

              {selectedType?.helper && (
                <div className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-4 text-sm leading-6 text-zinc-400">
                  <strong className="text-zinc-200">{selectedType.label}:</strong> {selectedType.helper}
                </div>
              )}

              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-300">Link do conteúdo</span>
                <input
                  value={contentUrl}
                  onChange={(event) => setContentUrl(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  placeholder="Link de vídeo, PDF, imagem ou material"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-300">Texto da aula</span>
                <textarea
                  value={textContent}
                  onChange={(event) => setTextContent(event.target.value)}
                  rows={10}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  placeholder="Conteúdo textual da aula"
                />
              </label>

              <div>
                <p className="mb-3 text-sm font-bold text-zinc-300">Prévia do conteúdo</p>
                <AdminContentPreview
                  contentType={contentType}
                  contentUrl={contentUrl.trim()}
                  textContent={textContent.trim()}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSaveLesson}
                  disabled={saving}
                  className="rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? 'Salvando...'
                    : editingLessonId
                      ? 'Salvar alterações'
                      : 'Salvar aula'}
                </button>

                <button
                  type="button"
                  onClick={() => resetForm(lessons.length + 1)}
                  className="rounded-full border border-[#2d3a52] bg-white/5 px-6 py-4 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                >
                  Limpar formulário
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">Aulas cadastradas</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {lessons.length} aula(s) neste curso
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {lessons.length === 0 && (
                <div className="rounded-3xl border border-dashed border-[#2d3a52] p-6 text-zinc-400">
                  Nenhuma aula cadastrada ainda.
                </div>
              )}

              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className={`rounded-3xl border p-5 ${
                    editingLessonId === lesson.id
                      ? 'border-[#f36b2a] bg-[#f36b2a]/10'
                      : 'border-[#2d3a52] bg-[#080c18]/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[#f36b2a]">
                        Aula {lesson.order_index}
                      </p>

                      <h3 className="mt-2 font-black">{lesson.title}</h3>

                      <p className="mt-2 text-sm text-zinc-400">
                        Tipo: {getContentTypeLabel(lesson.content_type)} • {lesson.duration_minutes || 0} min
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(lesson, 'up')}
                        disabled={index === 0 || movingLessonId === lesson.id}
                        className="rounded-full border border-[#2d3a52] bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a] disabled:cursor-not-allowed disabled:opacity-40"
                        title="Mover para cima"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveLesson(lesson, 'down')}
                        disabled={index === lessons.length - 1 || movingLessonId === lesson.id}
                        className="rounded-full border border-[#2d3a52] bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a] disabled:cursor-not-allowed disabled:opacity-40"
                        title="Mover para baixo"
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  {lesson.description && (
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {lesson.description}
                    </p>
                  )}

                  {lesson.content_url && (
                    <a
                      href={lesson.content_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex text-sm font-bold text-[#f36b2a] hover:text-[#ff6a24]"
                    >
                      Abrir conteúdo
                    </a>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {course?.slug && (
                      <a
                        href={`/cursos/${course.slug}/aulas/${lesson.id}`}
                        className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-3 text-center text-sm font-bold text-zinc-200 hover:border-[#f36b2a] hover:text-white"
                      >
                        Visualizar
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEditLesson(lesson)}
                      className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 hover:border-[#f36b2a] hover:text-white"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lesson)}
                      disabled={deletingLessonId === lesson.id}
                      className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingLessonId === lesson.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
