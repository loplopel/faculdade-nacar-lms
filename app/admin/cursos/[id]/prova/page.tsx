'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient';

type Course = {
  id: string;
  title: string;
  slug: string;
};

type Exam = {
  id: string;
  title: string;
  description: string | null;
  minimum_score: number | null;
  max_attempts: number | null;
  is_active: boolean | null;
};

export default function AdminCourseExamPage() {
  const params = useParams();
  const courseId = String(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minimumScore, setMinimumScore] = useState('80');
  const [maxAttempts, setMaxAttempts] = useState('3');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadData() {
    setLoading(true);
    setErrorMessage('');

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

    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('id, title, description, minimum_score, max_attempts, is_active')
      .eq('course_id', courseId)
      .maybeSingle();

    setCourse(courseData as Course);

    if (!examError && examData) {
      const currentExam = examData as Exam;
      setExam(currentExam);
      setTitle(currentExam.title);
      setDescription(currentExam.description || '');
      setMinimumScore(String(currentExam.minimum_score || 80));
      setMaxAttempts(String(currentExam.max_attempts || 3));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [courseId]);

  async function handleSaveExam() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Informe o título da prova.');
      return;
    }

    setSaving(true);

    const payload = {
      course_id: courseId,
      title,
      description,
      minimum_score: Number(minimumScore) || 80,
      max_attempts: Number(maxAttempts) || 3,
      is_active: true,
    };

    const { error } = exam
      ? await supabase.from('exams').update(payload).eq('id', exam.id)
      : await supabase.from('exams').insert(payload);

    setSaving(false);

    if (error) {
      setErrorMessage(`Erro ao salvar prova: ${error.message}`);
      return;
    }

    setSuccessMessage('Prova salva com sucesso no Supabase.');
    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando prova...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Administração de prova
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            {course?.title}
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Configure a avaliação final deste curso, nota mínima e quantidade de tentativas.
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
              <h2 className="text-2xl font-black">Dados da prova</h2>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Título da prova
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Ex: Prova Final - Atendimento Nacar"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Descrição da prova
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Explique o objetivo da avaliação..."
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Nota mínima
                    </label>
                    <input
                      value={minimumScore}
                      onChange={(event) => setMinimumScore(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                      placeholder="80"
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
                </div>

                <button
                  type="button"
                  onClick={handleSaveExam}
                  disabled={saving}
                  className="rounded-2xl bg-[#f36b2a] px-5 py-4 text-lg font-black text-white shadow-[0_0_28px_rgba(243,107,42,0.35)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : exam ? 'Atualizar prova' : 'Salvar prova'}
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
            <h2 className="text-2xl font-black">Status da prova</h2>

            {exam ? (
              <div className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="font-bold text-green-200">Prova cadastrada</p>
                <p className="mt-2 text-sm text-zinc-300">
                  Agora podemos cadastrar perguntas e alternativas para esta avaliação.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4">
                <p className="font-bold text-[#ffb088]">Sem prova</p>
                <p className="mt-2 text-sm text-zinc-300">
                  Este curso ainda não possui avaliação cadastrada.
                </p>
              </div>
            )}

            {exam && (
              <a
                href={`/admin/provas/${exam.id}/perguntas`}
                className="mt-6 block rounded-2xl bg-[#f36b2a] px-5 py-4 text-center text-sm font-black text-white shadow-[0_0_28px_rgba(243,107,42,0.35)] hover:bg-[#ff6a24]"
              >
                Gerenciar perguntas
              </a>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}