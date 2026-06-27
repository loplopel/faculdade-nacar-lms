"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentUserId } from "../../../lib/auth";

type CourseInfo = {
  title: string;
  slug: string;
};

type Exam = {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  minimum_score: number | null;
  max_attempts: number | null;
  courses: CourseInfo | CourseInfo[] | null;
};

type QuestionOption = {
  id: string;
  option_text: string;
  is_correct: boolean | null;
  order_index: number;
};

type Question = {
  id: string;
  question_text: string;
  points: number | null;
  order_index: number;
  question_options: QuestionOption[];
};

type ExamResult = {
  score: number;
  status: string;
  correct: number;
  total: number;
};

function getCourse(exam: Exam | null) {
  if (!exam?.courses) return null;
  return Array.isArray(exam.courses) ? exam.courses[0] : exam.courses;
}

export default function ExamPage() {
  const params = useParams();
  const examId = String(params.examId);

  const [userId, setUserId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [alreadyPassed, setAlreadyPassed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [gateMessage, setGateMessage] = useState("");

  useEffect(() => {
    async function loadExam() {
      setLoading(true);
      setErrorMessage("");
      setGateMessage("");

      const currentUserId = await getCurrentUserId();

      if (!currentUserId) {
        window.location.href = "/login";
        return;
      }

      setUserId(currentUserId);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, is_active")
        .eq("id", currentUserId)
        .single();

      if (profileError || !profileData) {
        setErrorMessage(profileError?.message || "Seu perfil não foi encontrado.");
        setLoading(false);
        return;
      }

      const currentRole = String(profileData.role || "funcionario");
      const isAdminView =
        currentRole === "admin" || currentRole === "gestor" || currentRole === "instrutor";

      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select(
          `
          id,
          title,
          description,
          course_id,
          minimum_score,
          max_attempts,
          courses (
            title,
            slug
          )
        `,
        )
        .eq("id", examId)
        .single();

      if (examError || !examData) {
        setErrorMessage(
          `Erro ao buscar prova: ${examError?.message || "prova não encontrada"}`,
        );
        setLoading(false);
        return;
      }

      const normalizedExam = examData as Exam;

      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("id, status, progress")
        .eq("user_id", currentUserId)
        .eq("course_id", normalizedExam.course_id)
        .maybeSingle();

      if (!isAdminView && !enrollmentData) {
        setGateMessage("Você ainda não está matriculado neste curso. Peça liberação para um administrador.");
        setExam(normalizedExam);
        setLoading(false);
        return;
      }

      const { data: courseLessonsData, error: courseLessonsError } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", normalizedExam.course_id);

      if (courseLessonsError) {
        setErrorMessage(`Erro ao validar aulas do curso: ${courseLessonsError.message}`);
        setLoading(false);
        return;
      }

      const lessonIds = (courseLessonsData || []).map((lesson) => lesson.id);

      if (lessonIds.length > 0) {
        const { data: completedLessonsData, error: completedLessonsError } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", currentUserId)
          .eq("is_completed", true)
          .in("lesson_id", lessonIds);

        if (completedLessonsError) {
          setErrorMessage(`Erro ao validar progresso: ${completedLessonsError.message}`);
          setLoading(false);
          return;
        }

        const completedCount = completedLessonsData?.length || 0;
        const courseProgress = Math.round((completedCount / lessonIds.length) * 100);

        if (enrollmentData) {
          await supabase
            .from("enrollments")
            .update({
              progress: courseProgress,
              status: courseProgress >= 100 ? "completed" : courseProgress > 0 ? "in_progress" : enrollmentData.status,
              completed_at: courseProgress >= 100 ? new Date().toISOString() : null,
            })
            .eq("id", enrollmentData.id);
        }

        if (completedCount < lessonIds.length) {
          setGateMessage(
            `A prova só será liberada após concluir todas as aulas. Progresso atual: ${completedCount} de ${lessonIds.length} aulas.`,
          );
          setExam(normalizedExam);
          setLoading(false);
          return;
        }
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select(
          `
          id,
          question_text,
          points,
          order_index,
          question_options (
            id,
            option_text,
            is_correct,
            order_index
          )
        `,
        )
        .eq("exam_id", examId)
        .order("order_index", { ascending: true });

      if (questionsError) {
        setErrorMessage(`Erro ao buscar perguntas: ${questionsError.message}`);
        setLoading(false);
        return;
      }

      const normalizedQuestions = ((questionsData || []) as Question[]).map(
        (question) => ({
          ...question,
          question_options: [...(question.question_options || [])].sort(
            (a, b) => Number(a.order_index || 0) - Number(b.order_index || 0),
          ),
        }),
      );

      const { data: attemptsData, error: attemptsError } = await supabase
        .from("exam_attempts")
        .select("id, score, status, finished_at")
        .eq("user_id", currentUserId)
        .eq("exam_id", examId)
        .order("finished_at", { ascending: false });

      if (attemptsError) {
        setErrorMessage(`Erro ao buscar tentativas: ${attemptsError.message}`);
        setLoading(false);
        return;
      }

      const attempts = attemptsData || [];
      const passedAttempt = attempts.find(
        (attempt) => attempt.status === "passed",
      );

      setAttemptsUsed(attempts.length);

      if (passedAttempt) {
        setAlreadyPassed(true);
        setResult({
          score: Number(passedAttempt.score || 0),
          status: "passed",
          correct: 0,
          total: normalizedQuestions.length,
        });
      }

      setExam(normalizedExam);
      setQuestions(normalizedQuestions);
      setLoading(false);
    }

    loadExam();
  }, [examId]);

  async function handleSubmitExam() {
    setErrorMessage("");

    if (!exam) return;

    const currentUserId = userId || (await getCurrentUserId());

    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }

    if (alreadyPassed) {
      setErrorMessage(
        "Você já foi aprovado nesta prova. Não é necessário refazer.",
      );
      return;
    }

    const maxAttempts = Number(exam.max_attempts || 3);

    if (attemptsUsed >= maxAttempts) {
      setErrorMessage("Você atingiu o limite de tentativas desta prova.");
      return;
    }

    const unanswered = questions.find((question) => !answers[question.id]);

    if (unanswered) {
      setErrorMessage("Responda todas as perguntas antes de enviar.");
      return;
    }

    setSending(true);

    const totalPoints = questions.reduce(
      (sum, question) => sum + Number(question.points || 1),
      0,
    );

    let earnedPoints = 0;
    let correctCount = 0;

    const calculatedAnswers = questions.map((question) => {
      const selectedOptionId = answers[question.id];
      const selectedOption = question.question_options.find(
        (option) => option.id === selectedOptionId,
      );

      const isCorrect = Boolean(selectedOption?.is_correct);

      if (isCorrect) {
        earnedPoints += Number(question.points || 1);
        correctCount += 1;
      }

      return {
        question_id: question.id,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
      };
    });

    const score =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    const status =
      score >= Number(exam.minimum_score || 80) ? "passed" : "failed";

    const { data: attemptData, error: attemptError } = await supabase
      .from("exam_attempts")
      .insert({
        user_id: currentUserId,
        exam_id: exam.id,
        course_id: exam.course_id,
        score,
        status,
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (attemptError || !attemptData) {
      setSending(false);
      setErrorMessage(
        `Erro ao salvar tentativa: ${attemptError?.message || "sem retorno"}`,
      );
      return;
    }

    const answersPayload = calculatedAnswers.map((answer) => ({
      attempt_id: attemptData.id,
      question_id: answer.question_id,
      selected_option_id: answer.selected_option_id,
      is_correct: answer.is_correct,
    }));

    const { error: answersError } = await supabase
      .from("exam_answers")
      .insert(answersPayload);

    if (answersError) {
      setSending(false);
      setErrorMessage(`Erro ao salvar respostas: ${answersError.message}`);
      return;
    }

    setAttemptsUsed((current) => current + 1);

    if (status === "passed") {
      setAlreadyPassed(true);

      await supabase.from("certificates").upsert(
        {
          user_id: currentUserId,
          course_id: exam.course_id,
          certificate_url: null,
          issued_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,course_id",
        },
      );

      await supabase
        .from("enrollments")
        .update({
          status: "approved",
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", currentUserId)
        .eq("course_id", exam.course_id);
    }

    if (status === "failed") {
      await supabase
        .from("enrollments")
        .update({
          status: "failed",
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", currentUserId)
        .eq("course_id", exam.course_id);
    }

    setResult({
      score,
      status,
      correct: correctCount,
      total: questions.length,
    });

    setSending(false);
  }

  const course = getCourse(exam);
  const maxAttempts = Number(exam?.max_attempts || 3);
  const minimumScore = Number(exam?.minimum_score || 80);
  const blocked = alreadyPassed || attemptsUsed >= maxAttempts;

  return (
    <main className="min-h-screen bg-[#080c18] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <a
          href={course?.slug ? `/cursos/${course.slug}` : "/cursos"}
          className="text-sm font-bold text-[#f36b2a] hover:text-[#ffb088]"
        >
          ← Voltar para o curso
        </a>

        <section className="mt-8 rounded-3xl border border-[#2d3a52] bg-[#111827]/90 p-8 shadow-2xl">
          {loading && <p className="text-zinc-300">Carregando prova...</p>}

          {!loading && errorMessage && !exam && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
              {errorMessage}
            </div>
          )}

          {!loading && gateMessage && exam && (
            <div className="rounded-3xl border border-[#f36b2a]/40 bg-[#f36b2a]/10 p-6 text-[#ffb088]">
              <p className="text-sm font-bold uppercase tracking-[0.25em]">Prova bloqueada</p>
              <h1 className="mt-3 text-2xl font-black text-white">Conclua a etapa anterior antes de fazer a avaliação.</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{gateMessage}</p>
              <a
                href={getCourse(exam)?.slug ? `/cursos/${getCourse(exam)?.slug}` : "/cursos"}
                className="mt-6 inline-block rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white hover:bg-[#ff6a24]"
              >
                Voltar para o curso
              </a>
            </div>
          )}

          {!loading && exam && !gateMessage && (
            <>
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#f36b2a]">
                    Prova
                  </p>
                  <h1 className="mt-3 text-3xl font-black md:text-4xl">
                    {exam.title}
                  </h1>
                  <p className="mt-3 text-sm text-zinc-400">
                    Curso: {course?.title || "Sem curso"}
                  </p>
                  {exam.description && (
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300">
                      {exam.description}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 p-5 text-sm text-zinc-300">
                  <p>
                    Nota mínima:{" "}
                    <strong className="text-[#f36b2a]">{minimumScore}%</strong>
                  </p>
                  <p className="mt-2">
                    Tentativas:{" "}
                    <strong className="text-white">
                      {attemptsUsed}/{maxAttempts}
                    </strong>
                  </p>
                  <p className="mt-2">
                    Perguntas:{" "}
                    <strong className="text-white">{questions.length}</strong>
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
                  {errorMessage}
                </div>
              )}

              {result && (
                <div
                  className={`mt-6 rounded-3xl border p-6 ${
                    result.status === "passed"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                      : "border-red-500/40 bg-red-500/10 text-red-100"
                  }`}
                >
                  <p className="text-sm font-bold uppercase tracking-[0.2em]">
                    Resultado
                  </p>
                  <h2 className="mt-2 text-3xl font-black">
                    {result.score}% —{" "}
                    {result.status === "passed" ? "Aprovado" : "Reprovado"}
                  </h2>
                  <p className="mt-2 text-sm opacity-90">
                    {result.status === "passed"
                      ? "Parabéns! Seu certificado já foi liberado na área de certificados."
                      : "Você pode revisar o conteúdo e tentar novamente, se ainda houver tentativas disponíveis."}
                  </p>
                  {result.correct > 0 && (
                    <p className="mt-2 text-sm opacity-90">
                      Acertos: {result.correct} de {result.total}
                    </p>
                  )}
                </div>
              )}

              {questions.length === 0 && (
                <div className="mt-8 rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-5 text-[#ffb088]">
                  Esta prova ainda não possui perguntas cadastradas.
                </div>
              )}

              {questions.length > 0 && (
                <div className="mt-8 space-y-5">
                  {questions.map((question, index) => (
                    <article
                      key={question.id}
                      className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-lg font-black">
                          {index + 1}. {question.question_text}
                        </h2>
                        <span className="rounded-full bg-[#080c18] px-3 py-1 text-xs font-bold text-zinc-300">
                          {Number(question.points || 1)} ponto(s)
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {question.question_options.map((option) => (
                          <label
                            key={option.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                              answers[question.id] === option.id
                                ? "border-[#f36b2a] bg-[#f36b2a]/10"
                                : "border-[#2d3a52] bg-[#080c18]/60 hover:border-[#f36b2a]/60"
                            } ${blocked ? "cursor-not-allowed opacity-70" : ""}`}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option.id}
                              disabled={blocked || Boolean(result)}
                              checked={answers[question.id] === option.id}
                              onChange={() =>
                                setAnswers((current) => ({
                                  ...current,
                                  [question.id]: option.id,
                                }))
                              }
                              className="h-4 w-4 accent-[#f36b2a]"
                            />
                            <span className="text-sm text-zinc-200">
                              {option.option_text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={
                    sending ||
                    questions.length === 0 ||
                    blocked ||
                    Boolean(result)
                  }
                  onClick={handleSubmitExam}
                  className="rounded-full bg-[#f36b2a] px-7 py-3 text-sm font-black text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Enviando..." : "Finalizar prova"}
                </button>

                <a
                  href="/provas"
                  className="rounded-full border border-[#2d3a52] bg-white/5 px-7 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                >
                  Ver histórico de provas
                </a>

                {alreadyPassed && (
                  <a
                    href="/certificados"
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-7 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-500/20"
                  >
                    Ver certificado
                  </a>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
