'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUserId } from '../../lib/auth';

type CourseInfo = {
  title: string;
  slug: string;
};

type LessonInfo = {
  title: string;
  id: string;
};

type Material = {
  id: string;
  course_id: string | null;
  lesson_id: string | null;
  title: string;
  file_type: string;
  file_url: string | null;
  description: string | null;
  created_at: string | null;
  courses: CourseInfo | CourseInfo[] | null;
  lessons: LessonInfo | LessonInfo[] | null;
};

function getCourse(material: Material) {
  if (Array.isArray(material.courses)) return material.courses[0];
  return material.courses;
}

function getLesson(material: Material) {
  if (Array.isArray(material.lessons)) return material.lessons[0];
  return material.lessons;
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    pdf: 'PDF',
    video: 'Vídeo',
    image: 'Imagem',
    text: 'Texto',
    link: 'Link',
  };

  return labels[String(type || '').toLowerCase()] || 'Material';
}

function getTypeColor(type: string) {
  const normalized = String(type || '').toLowerCase();

  if (normalized === 'video') return 'border-red-400/30 bg-red-500/10 text-red-200';
  if (normalized === 'pdf') return 'border-blue-400/30 bg-blue-500/10 text-blue-200';
  if (normalized === 'image') return 'border-green-400/30 bg-green-500/10 text-green-200';
  if (normalized === 'link') return 'border-purple-400/30 bg-purple-500/10 text-purple-200';

  return 'border-[#f36b2a]/30 bg-[#f36b2a]/10 text-[#ffb088]';
}

function isImageUrl(url: string | null) {
  const clean = String(url || '').toLowerCase().split('?')[0];
  return clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.png') || clean.endsWith('.webp') || clean.endsWith('.gif');
}

export default function BibliotecaPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  async function loadMaterials() {
    setLoading(true);
    setErrorMessage('');

    const userId = await getCurrentUserId();

    if (!userId) {
      window.location.href = '/login';
      return;
    }

    const { data, error } = await supabase
      .from('materials')
      .select(`
        id,
        course_id,
        lesson_id,
        title,
        file_type,
        file_url,
        description,
        created_at,
        courses (
          title,
          slug
        ),
        lessons (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMessage(`Erro ao carregar biblioteca: ${error.message}`);
      setLoading(false);
      return;
    }

    setMaterials((data || []) as Material[]);
    setLoading(false);
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  const filteredMaterials = useMemo(() => {
    const term = search.trim().toLowerCase();

    return materials.filter((material) => {
      const course = getCourse(material);
      const lesson = getLesson(material);
      const haystack = [
        material.title,
        material.description,
        material.file_type,
        course?.title,
        lesson?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesType = typeFilter === 'all' || material.file_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [materials, search, typeFilter]);

  const totalVideos = materials.filter((material) => material.file_type === 'video').length;
  const totalPdfs = materials.filter((material) => material.file_type === 'pdf').length;
  const totalImages = materials.filter((material) => material.file_type === 'image').length;

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando biblioteca...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
                Conhecimento Nacar
              </p>
              <h1 className="mt-4 text-4xl font-black md:text-5xl">Biblioteca</h1>
              <p className="mt-3 max-w-3xl text-zinc-300">
                Consulte vídeos, PDFs, imagens, links e materiais de apoio cadastrados nos cursos da Faculdade Nacar.
              </p>
            </div>

            <a
              href="/admin/cursos"
              className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
            >
              Gerenciar cursos
            </a>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-5">
            <p className="text-sm text-zinc-400">Materiais</p>
            <p className="mt-2 text-3xl font-black text-[#f36b2a]">{materials.length}</p>
          </div>
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-5">
            <p className="text-sm text-zinc-400">Vídeos</p>
            <p className="mt-2 text-3xl font-black text-[#f36b2a]">{totalVideos}</p>
          </div>
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-5">
            <p className="text-sm text-zinc-400">PDFs</p>
            <p className="mt-2 text-3xl font-black text-[#f36b2a]">{totalPdfs}</p>
          </div>
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-5">
            <p className="text-sm text-zinc-400">Imagens</p>
            <p className="mt-2 text-3xl font-black text-[#f36b2a]">{totalImages}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-4 md:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-[#2d3a52] bg-[#1b2435] px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-[#f36b2a]"
            placeholder="Pesquisar por curso, aula, material, tipo ou palavra-chave..."
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-2xl border border-[#2d3a52] bg-[#1b2435] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
          >
            <option value="all">Todos os tipos</option>
            <option value="video">Vídeos</option>
            <option value="pdf">PDFs</option>
            <option value="image">Imagens</option>
            <option value="link">Links</option>
            <option value="text">Textos</option>
          </select>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {filteredMaterials.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/60 p-8 text-zinc-400 md:col-span-2">
              Nenhum material encontrado. Cadastre ou envie arquivos pelo admin de aulas.
            </div>
          )}

          {filteredMaterials.map((material) => {
            const course = getCourse(material);
            const lesson = getLesson(material);

            return (
              <article
                key={material.id}
                className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getTypeColor(material.file_type)}`}>
                    {getTypeLabel(material.file_type)}
                  </span>

                  {course?.title && (
                    <span className="rounded-full border border-[#2d3a52] bg-[#080c18]/70 px-3 py-1 text-xs font-bold text-zinc-400">
                      {course.title}
                    </span>
                  )}
                </div>

                {material.file_url && material.file_type === 'image' && isImageUrl(material.file_url) && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#2d3a52] bg-[#080c18]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={material.file_url}
                      alt={material.title}
                      className="h-52 w-full object-cover"
                    />
                  </div>
                )}

                <h2 className="mt-5 text-2xl font-black">{material.title}</h2>

                {lesson?.title && (
                  <p className="mt-2 text-sm text-zinc-400">Aula: {lesson.title}</p>
                )}

                {material.description && material.description !== 'Conteúdo principal da aula' && (
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{material.description}</p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {material.file_url && (
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
                    >
                      Abrir material
                    </a>
                  )}

                  {course?.slug && lesson?.id && (
                    <a
                      href={`/cursos/${course.slug}/aulas/${lesson.id}`}
                      className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                    >
                      Ver aula
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
