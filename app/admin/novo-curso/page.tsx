'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

type Category = {
  id: string;
  name: string;
};

function createSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function NovoCursoPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [courseType, setCourseType] = useState('Obrigatório');
  const [description, setDescription] = useState('');
  const [minimumScore, setMinimumScore] = useState('80');
  const [maxAttempts, setMaxAttempts] = useState('3');
  const [certificateEnabled, setCertificateEnabled] = useState('Sim');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from('course_categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (!error && data) {
        setCategories(data);
        setCategoryId(data[0]?.id || '');
      }

      setLoadingCategories(false);
    }

    loadCategories();
  }, []);

  async function handleSaveCourse() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Informe o nome do curso.');
      return;
    }

    if (!categoryId) {
      setErrorMessage('Selecione uma categoria.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Informe a descrição do curso.');
      return;
    }

    setSaving(true);

    const slug = createSlug(title);

    const { error } = await supabase.from('courses').insert({
      title,
      slug,
      description,
      category_id: categoryId,
      status: 'published',
      is_required: courseType === 'Obrigatório',
      minimum_score: Number(minimumScore) || 80,
      certificate_enabled: certificateEnabled === 'Sim',
    });

    setSaving(false);

    if (error) {
      setErrorMessage(`Erro ao salvar curso: ${error.message}`);
      return;
    }

    setSuccessMessage('Curso salvo com sucesso no Supabase.');

    setTitle('');
    setDescription('');
    setMinimumScore('80');
    setMaxAttempts('3');
    setCourseType('Obrigatório');
    setCertificateEnabled('Sim');
  }

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Administração
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Criar novo curso
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Cadastre treinamentos com vídeos, textos, PDFs, imagens, provas e
            regras de aprovação para os colaboradores da Nacar.
          </p>
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
              <h2 className="text-2xl font-black">Informações do curso</h2>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Nome do curso
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Ex: Atendimento Nacar"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Categoria
                    </label>
                    <select
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none focus:border-[#f36b2a]"
                    >
                      {loadingCategories && (
                        <option>Carregando categorias...</option>
                      )}

                      {!loadingCategories &&
                        categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Tipo do curso
                    </label>
                    <select
                      value={courseType}
                      onChange={(event) => setCourseType(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none focus:border-[#f36b2a]"
                    >
                      <option>Obrigatório</option>
                      <option>Opcional</option>
                      <option>Somente gestores</option>
                      <option>Somente vendas</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Descrição
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Descreva o objetivo do curso..."
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
              <h2 className="text-2xl font-black">Conteúdo do curso</h2>
              <p className="mt-2 text-sm text-zinc-400">
                No próximo passo vamos salvar aulas, PDFs, vídeos e imagens no
                Supabase Storage.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/60 p-6 text-center hover:border-[#f36b2a]">
                  <p className="text-4xl font-black text-[#f36b2a]">+</p>
                  <h3 className="mt-3 font-bold">Adicionar vídeo</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    MP4, link externo ou vídeo de treinamento.
                  </p>
                </div>

                <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/60 p-6 text-center hover:border-[#f36b2a]">
                  <p className="text-4xl font-black text-[#f36b2a]">+</p>
                  <h3 className="mt-3 font-bold">Adicionar PDF</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Manuais, apostilas, catálogos e checklists.
                  </p>
                </div>

                <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/60 p-6 text-center hover:border-[#f36b2a]">
                  <p className="text-4xl font-black text-[#f36b2a]">+</p>
                  <h3 className="mt-3 font-bold">Adicionar imagem</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Capa do curso, banners ou material visual.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
              <h2 className="text-2xl font-black">Configuração da prova</h2>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Nota mínima
                  </label>
                  <input
                    value={minimumScore}
                    onChange={(event) => setMinimumScore(event.target.value)}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Ex: 80"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Tentativas permitidas
                  </label>
                  <select
                    value={maxAttempts}
                    onChange={(event) => setMaxAttempts(event.target.value)}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none focus:border-[#f36b2a]"
                  >
                    <option value="1">1 tentativa</option>
                    <option value="2">2 tentativas</option>
                    <option value="3">3 tentativas</option>
                    <option value="999">Ilimitado</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Liberar certificado
                  </label>
                  <select
                    value={certificateEnabled}
                    onChange={(event) =>
                      setCertificateEnabled(event.target.value)
                    }
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none focus:border-[#f36b2a]"
                  >
                    <option>Sim</option>
                    <option>Não</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6 shadow-xl">
              <h2 className="text-xl font-black text-[#ffb088]">
                Publicação
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Agora o curso será salvo diretamente na tabela courses do
                Supabase.
              </p>

              <button
                type="button"
                onClick={handleSaveCourse}
                disabled={saving}
                className="mt-6 w-full rounded-2xl bg-[#f36b2a] px-5 py-4 text-lg font-black text-white shadow-[0_0_28px_rgba(243,107,42,0.35)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar curso'}
              </button>

              <a
                href="/admin"
                className="mt-3 block text-center text-sm font-bold text-zinc-400 hover:text-white"
              >
                Voltar para administração
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}