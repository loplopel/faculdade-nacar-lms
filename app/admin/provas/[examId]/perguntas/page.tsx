'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient';

type Exam = {
  id: string;
  title: string;
  course_id: string;
  minimum_score: number | null;
  courses:
    | {
        title: string;
        slug: string;
      }[]
    | null;
};

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  points: number | null;
  order_index: number;
  question_options: {
    id: string;
    option_text: string;
    is_correct: boolean | null;
    order_index: number;
  }[];
};

export default function AdminExamQuestionsPage() {
  const params = useParams();
  const examId = String(params.examId);

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [questionText, setQuestionText] = useState('');
  const [points, setPoints] = useState('1');
  const [orderIndex, setOrderIndex] = useState('1');

  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadData() {
    setLoading(true);
    setErrorMessage('');

    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        course_id,
        minimum_score,
        courses (
          title,
          slug
        )
      `)
      .eq('id', examId)
      .single();

    if (examError) {
      setErrorMessage(`Erro ao buscar prova: ${examError.message}`);
      setLoading(false);
      return;
    }

    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        question_type,
        points,
        order_index,
        question_options (
          id,
          option_text,
          is_correct,
          order_index
        )
      `)
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    if (questionsError) {
      setErrorMessage(`Erro ao buscar perguntas: ${questionsError.message}`);
      setLoading(false);
      return;
    }

    const normalizedQuestions = ((questionsData || []) as Question[]).map(
      (question) => ({
        ...question,
        question_options: [...(question.question_options || [])].sort(
          (a, b) => a.order_index - b.order_index
        ),
      })
    );

    setExam(examData as Exam);
    setQuestions(normalizedQuestions);
    setOrderIndex(String((questionsData?.length || 0) + 1));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [examId]);

  async function handleSaveQuestion() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!questionText.trim()) {
      setErrorMessage('Informe o texto da pergunta.');
      return;
    }

    const options = [
      { label: 'A', text: optionA },
      { label: 'B', text: optionB },
      { label: 'C', text: optionC },
      { label: 'D', text: optionD },
    ];

    const emptyOption = options.find((option) => !option.text.trim());

    if (emptyOption) {
      setErrorMessage(`Preencha a alternativa ${emptyOption.label}.`);
      return;
    }

    setSaving(true);

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        exam_id: examId,
        question_text: questionText,
        question_type: 'multiple_choice',
        points: Number(points) || 1,
        order_index: Number(orderIndex) || questions.length + 1,
      })
      .select('id')
      .single();

    if (questionError || !questionData) {
      setSaving(false);
      setErrorMessage(
        `Erro ao salvar pergunta: ${questionError?.message || 'sem retorno'}`
      );
      return;
    }

    const optionsPayload = options.map((option, index) => ({
      question_id: questionData.id,
      option_text: option.text,
      is_correct: option.label === correctOption,
      order_index: index + 1,
    }));

    const { error: optionsError } = await supabase
      .from('question_options')
      .insert(optionsPayload);

    setSaving(false);

    if (optionsError) {
      setErrorMessage(`Erro ao salvar alternativas: ${optionsError.message}`);
      return;
    }

    setSuccessMessage('Pergunta salva com sucesso.');

    setQuestionText('');
    setPoints('1');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectOption('A');

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando perguntas...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Banco de perguntas
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            {exam?.title}
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Curso: <strong>{exam?.courses?.[0]?.title || 'Sem curso'}</strong>
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/cursos"
              className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
            >
              Voltar para cursos
            </a>

            {exam?.courses?.[0]?.slug && (
              <a
                href={`/cursos/${exam.courses[0].slug}`}
                className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
              >
                Ver curso
              </a>
            )}
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
              <h2 className="text-2xl font-black">Cadastrar pergunta</h2>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Pergunta
                  </label>
                  <textarea
                    value={questionText}
                    onChange={(event) => setQuestionText(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    placeholder="Digite a pergunta da prova..."
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Pontuação
                    </label>
                    <input
                      value={points}
                      onChange={(event) => setPoints(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                      placeholder="1"
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

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Alternativa A
                    </label>
                    <input
                      value={optionA}
                      onChange={(event) => setOptionA(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Alternativa B
                    </label>
                    <input
                      value={optionB}
                      onChange={(event) => setOptionB(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Alternativa C
                    </label>
                    <input
                      value={optionC}
                      onChange={(event) => setOptionC(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Alternativa D
                    </label>
                    <input
                      value={optionD}
                      onChange={(event) => setOptionD(event.target.value)}
                      className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Resposta correta
                  </label>
                  <select
                    value={correctOption}
                    onChange={(event) => setCorrectOption(event.target.value)}
                    className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none focus:border-[#f36b2a]"
                  >
                    <option value="A">Alternativa A</option>
                    <option value="B">Alternativa B</option>
                    <option value="C">Alternativa C</option>
                    <option value="D">Alternativa D</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  disabled={saving}
                  className="rounded-2xl bg-[#f36b2a] px-5 py-4 text-lg font-black text-white shadow-[0_0_28px_rgba(243,107,42,0.35)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar pergunta'}
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
            <h2 className="text-2xl font-black">Perguntas cadastradas</h2>

            <p className="mt-2 text-sm text-zinc-400">
              Total de perguntas: {questions.length}
            </p>

            <div className="mt-5 space-y-4">
              {questions.length === 0 && (
                <div className="rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4 text-sm text-zinc-300">
                  Nenhuma pergunta cadastrada ainda.
                </div>
              )}

              {questions.map((question) => (
                <article
                  key={question.id}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f36b2a]">
                    Pergunta {question.order_index}
                  </p>

                  <h3 className="mt-3 font-black">{question.question_text}</h3>

                  <p className="mt-2 text-xs text-zinc-400">
                    Pontos: {question.points || 1}
                  </p>

                  <div className="mt-4 space-y-2">
                    {question.question_options.map((option) => (
                      <div
                        key={option.id}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          option.is_correct
                            ? 'border-green-500/40 bg-green-500/10 text-green-200'
                            : 'border-[#2d3a52] bg-[#111827] text-zinc-300'
                        }`}
                      >
                        {option.option_text}
                        {option.is_correct && (
                          <span className="ml-2 text-xs font-bold">
                            Correta
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}