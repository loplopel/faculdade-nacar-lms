'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../lib/auth';

type Role = 'admin' | 'gestor' | 'instrutor' | 'funcionario';
type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed' | 'approved' | 'failed';

type CurrentProfile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean | null;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  position: string | null;
  store: string | null;
  store_id?: string | null;
  stores?: { name: string; code: string | null } | { name: string; code: string | null }[] | null;
  region: string | null;
  situation: string | null;
  is_active: boolean | null;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_required: boolean | null;
};

type Lesson = {
  id: string;
  course_id: string;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus | string | null;
  progress: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
};

type LessonProgress = {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  is_completed: boolean | null;
};

type ExamAttempt = {
  id: string;
  user_id: string;
  course_id: string | null;
  score: number | null;
  status: string | null;
  finished_at: string | null;
};

type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string | null;
};

type UserReport = {
  profile: Profile;
  enrollments: Enrollment[];
  completedLessons: number;
  attempts: ExamAttempt[];
  certificates: Certificate[];
  averageScore: number;
  progressAverage: number;
};

type CourseReport = {
  course: Course;
  enrollments: Enrollment[];
  lessonsCount: number;
  completedLessons: number;
  attempts: ExamAttempt[];
  certificates: Certificate[];
  averageScore: number;
};

const statusLabels: Record<string, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  approved: 'Aprovado',
  failed: 'Reprovado',
};

const statusClasses: Record<string, string> = {
  not_started: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300',
  in_progress: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  completed: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  failed: 'border-red-500/40 bg-red-500/10 text-red-100',
};

function isAdminOrManager(profile: CurrentProfile | null) {
  return profile?.role === 'admin' || profile?.role === 'gestor' || profile?.role === 'instrutor';
}

function formatStatus(status: string | null | undefined) {
  return statusLabels[status || 'not_started'] || 'Não iniciado';
}

function statusBadgeClass(status: string | null | undefined) {
  return statusClasses[status || 'not_started'] || statusClasses.not_started;
}

function getProfileStore(profile: Profile) {
  const storeRelation = profile.stores;

  if (Array.isArray(storeRelation)) {
    return storeRelation[0]?.name || profile.store || 'Sem loja';
  }

  return storeRelation?.name || profile.store || 'Sem loja';
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export default function AdminReportsPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  async function loadReports() {
    setLoading(true);
    setErrorMessage('');

    const loggedUserId = await getCurrentUserId();

    if (!loggedUserId) {
      window.location.href = '/login';
      return;
    }

    const { data: currentProfileData, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', loggedUserId)
      .single();

    if (currentProfileError || !currentProfileData) {
      setErrorMessage(currentProfileError?.message || 'Seu perfil não foi encontrado.');
      setLoading(false);
      return;
    }

    const normalizedCurrentProfile = currentProfileData as CurrentProfile;
    setCurrentProfile(normalizedCurrentProfile);

    if (!isAdminOrManager(normalizedCurrentProfile)) {
      setErrorMessage('Você não tem permissão para visualizar relatórios do LMS.');
      setLoading(false);
      return;
    }

    const [profilesResult, coursesResult, lessonsResult, enrollmentsResult, progressResult, attemptsResult, certificatesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, position, store_id, store, region, situation, is_active, stores ( name, code )')
        .order('full_name', { ascending: true }),
      supabase
        .from('courses')
        .select('id, title, slug, status, is_required')
        .order('title', { ascending: true }),
      supabase
        .from('lessons')
        .select('id, course_id'),
      supabase
        .from('enrollments')
        .select('id, user_id, course_id, status, progress, started_at, completed_at, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('lesson_progress')
        .select('id, user_id, course_id, lesson_id, is_completed')
        .eq('is_completed', true),
      supabase
        .from('exam_attempts')
        .select('id, user_id, course_id, score, status, finished_at')
        .order('finished_at', { ascending: false }),
      supabase
        .from('certificates')
        .select('id, user_id, course_id, issued_at')
        .order('issued_at', { ascending: false }),
    ]);

    const firstError =
      profilesResult.error ||
      coursesResult.error ||
      lessonsResult.error ||
      enrollmentsResult.error ||
      progressResult.error ||
      attemptsResult.error ||
      certificatesResult.error;

    if (firstError) {
      setErrorMessage(`Erro ao carregar relatórios: ${firstError.message}. Confira permissões no Supabase.`);
      setLoading(false);
      return;
    }

    setProfiles((profilesResult.data || []) as Profile[]);
    setCourses((coursesResult.data || []) as Course[]);
    setLessons((lessonsResult.data || []) as Lesson[]);
    setEnrollments((enrollmentsResult.data || []) as Enrollment[]);
    setLessonProgress((progressResult.data || []) as LessonProgress[]);
    setAttempts((attemptsResult.data || []) as ExamAttempt[]);
    setCertificates((certificatesResult.data || []) as Certificate[]);
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    profiles.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [profiles]);

  const courseById = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((course) => map.set(course.id, course));
    return map;
  }, [courses]);

  const lessonsByCourse = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    lessons.forEach((lesson) => {
      const current = map.get(lesson.course_id) || [];
      current.push(lesson);
      map.set(lesson.course_id, current);
    });
    return map;
  }, [lessons]);

  const stores = useMemo(() => {
    const uniqueStores = Array.from(
      new Set(
        profiles
          .map((profile) => getProfileStore(profile))
          .filter(Boolean)
      )
    );

    return uniqueStores.sort((a, b) => a.localeCompare(b));
  }, [profiles]);

  const userReports = useMemo<UserReport[]>(() => {
    return profiles.map((profile) => {
      const userEnrollments = enrollments.filter((enrollment) => enrollment.user_id === profile.id);
      const userProgress = lessonProgress.filter((progress) => progress.user_id === profile.id);
      const userAttempts = attempts.filter((attempt) => attempt.user_id === profile.id);
      const userCertificates = certificates.filter((certificate) => certificate.user_id === profile.id);
      const progressAverage = average(userEnrollments.map((enrollment) => Number(enrollment.progress || 0)));
      const averageScore = average(userAttempts.map((attempt) => Number(attempt.score || 0)));

      return {
        profile,
        enrollments: userEnrollments,
        completedLessons: userProgress.length,
        attempts: userAttempts,
        certificates: userCertificates,
        averageScore,
        progressAverage,
      };
    });
  }, [profiles, enrollments, lessonProgress, attempts, certificates]);

  const courseReports = useMemo<CourseReport[]>(() => {
    return courses.map((course) => {
      const courseEnrollments = enrollments.filter((enrollment) => enrollment.course_id === course.id);
      const courseProgress = lessonProgress.filter((progress) => progress.course_id === course.id);
      const courseAttempts = attempts.filter((attempt) => attempt.course_id === course.id);
      const courseCertificates = certificates.filter((certificate) => certificate.course_id === course.id);
      const averageScore = average(courseAttempts.map((attempt) => Number(attempt.score || 0)));

      return {
        course,
        enrollments: courseEnrollments,
        lessonsCount: lessonsByCourse.get(course.id)?.length || 0,
        completedLessons: courseProgress.length,
        attempts: courseAttempts,
        certificates: courseCertificates,
        averageScore,
      };
    });
  }, [courses, enrollments, lessonProgress, attempts, certificates, lessonsByCourse]);

  const filteredUserReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return userReports.filter((report) => {
      const profile = report.profile;
      const matchesSearch =
        !normalizedSearch ||
        profile.full_name.toLowerCase().includes(normalizedSearch) ||
        profile.email.toLowerCase().includes(normalizedSearch) ||
        (profile.position || '').toLowerCase().includes(normalizedSearch) ||
        getProfileStore(profile).toLowerCase().includes(normalizedSearch) ||
        (profile.region || '').toLowerCase().includes(normalizedSearch);

      const matchesStore = storeFilter === 'all' || (getProfileStore(profile)) === storeFilter;
      const matchesStatus = statusFilter === 'all' || report.enrollments.some((enrollment) => enrollment.status === statusFilter);

      return matchesSearch && matchesStore && matchesStatus;
    });
  }, [userReports, search, storeFilter, statusFilter]);

  const totalActiveUsers = profiles.filter((profile) => profile.is_active !== false && profile.situation !== 'Inativo').length;
  const totalEnrollments = enrollments.length;
  const totalApproved = enrollments.filter((enrollment) => enrollment.status === 'approved').length;
  const totalPending = enrollments.filter((enrollment) => enrollment.status === 'not_started' || enrollment.status === 'in_progress').length;
  const totalFailed = enrollments.filter((enrollment) => enrollment.status === 'failed').length;
  const averageEnrollmentProgress = average(enrollments.map((enrollment) => Number(enrollment.progress || 0)));
  const approvalRate = percent(totalApproved, totalEnrollments);
  const completionRate = percent(
    enrollments.filter((enrollment) => enrollment.status === 'completed' || enrollment.status === 'approved').length,
    totalEnrollments
  );
  const averageScore = average(attempts.map((attempt) => Number(attempt.score || 0)));

  const latestAttempts = attempts.slice(0, 6);
  const latestCertificates = certificates.slice(0, 6);
  const topCourses = [...courseReports]
    .sort((a, b) => b.enrollments.length - a.enrollments.length)
    .slice(0, 6);

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
                Gestão do LMS
              </p>
              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                Relatórios e acompanhamento
              </h1>
              <p className="mt-3 max-w-3xl text-zinc-300">
                Acompanhe matrículas, progresso, aprovações, pendências, certificados e desempenho dos colaboradores.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadReports}
                className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
              >
                Atualizar dados
              </button>

              <a
                href="/admin"
                className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
              >
                Voltar ao admin
              </a>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="mb-6 rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
            Carregando relatórios...
          </div>
        )}

        {!loading && isAdminOrManager(currentProfile) && !errorMessage && (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Usuários ativos</p>
                <p className="mt-2 text-4xl font-black">{totalActiveUsers}</p>
                <p className="mt-2 text-xs text-zinc-500">{profiles.length} perfil(is) cadastrados</p>
              </div>

              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Matrículas</p>
                <p className="mt-2 text-4xl font-black">{totalEnrollments}</p>
                <p className="mt-2 text-xs text-zinc-500">Cursos liberados para colaboradores</p>
              </div>

              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Taxa de aprovação</p>
                <p className="mt-2 text-4xl font-black text-[#f36b2a]">{approvalRate}%</p>
                <p className="mt-2 text-xs text-zinc-500">{totalApproved} aprovado(s)</p>
              </div>

              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <p className="text-sm text-zinc-400">Média das provas</p>
                <p className="mt-2 text-4xl font-black">{averageScore}%</p>
                <p className="mt-2 text-xs text-zinc-500">{attempts.length} tentativa(s)</p>
              </div>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl xl:col-span-2">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div>
                    <h2 className="text-2xl font-black">Saúde geral do LMS</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Indicadores principais para acompanhar a operação dos treinamentos.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#f36b2a]/30 bg-[#f36b2a]/10 px-4 py-2 text-sm font-bold text-[#ffb088]">
                    Conclusão geral: {completionRate}%
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                    <p className="text-sm text-zinc-400">Progresso médio</p>
                    <p className="mt-2 text-3xl font-black">{averageEnrollmentProgress}%</p>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-[#f36b2a]" style={{ width: `${averageEnrollmentProgress}%` }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                    <p className="text-sm text-zinc-400">Pendentes</p>
                    <p className="mt-2 text-3xl font-black text-amber-200">{totalPending}</p>
                    <p className="mt-2 text-xs text-zinc-500">Não iniciado ou em andamento</p>
                  </div>

                  <div className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                    <p className="text-sm text-zinc-400">Reprovados</p>
                    <p className="mt-2 text-3xl font-black text-red-200">{totalFailed}</p>
                    <p className="mt-2 text-xs text-zinc-500">Precisam de nova atenção</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6 shadow-xl">
                <h2 className="text-2xl font-black text-[#ffb088]">Ações rápidas</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Use os atalhos abaixo para agir sobre pendências, matrículas e cadastros.
                </p>
                <div className="mt-5 grid gap-3">
                  <a href="/admin/matriculas" className="rounded-2xl border border-[#f36b2a]/30 bg-[#080c18]/50 px-4 py-3 text-sm font-bold text-white hover:bg-[#f36b2a]">
                    Gerenciar matrículas
                  </a>
                  <a href="/admin/usuarios" className="rounded-2xl border border-[#f36b2a]/30 bg-[#080c18]/50 px-4 py-3 text-sm font-bold text-white hover:bg-[#f36b2a]">
                    Gerenciar usuários
                  </a>
                  <a href="/admin/cursos" className="rounded-2xl border border-[#f36b2a]/30 bg-[#080c18]/50 px-4 py-3 text-sm font-bold text-white hover:bg-[#f36b2a]">
                    Gerenciar cursos
                  </a>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                  <h2 className="text-2xl font-black">Colaboradores</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {filteredUserReports.length} de {userReports.length} colaborador(es) encontrado(s).
                  </p>
                </div>

                <div className="grid w-full gap-3 lg:w-auto lg:grid-cols-[260px_180px_190px]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar colaborador, loja, cargo"
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  />

                  <select
                    value={storeFilter}
                    onChange={(event) => setStoreFilter(event.target.value)}
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  >
                    <option value="all">Todas as lojas</option>
                    {stores.map((store) => (
                      <option key={store} value={store}>
                        {store}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  >
                    <option value="all">Todos os status</option>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[960px] border-separate border-spacing-y-3 text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <tr>
                      <th className="px-4 py-2">Colaborador</th>
                      <th className="px-4 py-2">Loja/Cargo</th>
                      <th className="px-4 py-2">Matrículas</th>
                      <th className="px-4 py-2">Progresso</th>
                      <th className="px-4 py-2">Provas</th>
                      <th className="px-4 py-2">Certificados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUserReports.length === 0 && (
                      <tr>
                        <td colSpan={6} className="rounded-2xl border border-dashed border-[#2d3a52] bg-[#080c18]/60 px-4 py-6 text-center text-zinc-400">
                          Nenhum colaborador encontrado com os filtros atuais.
                        </td>
                      </tr>
                    )}

                    {filteredUserReports.map((report) => (
                      <tr key={report.profile.id} className="rounded-2xl bg-[#080c18]/60">
                        <td className="rounded-l-2xl border-y border-l border-[#2d3a52] px-4 py-4">
                          <p className="font-black text-white">{report.profile.full_name}</p>
                          <p className="mt-1 text-xs text-zinc-400">{report.profile.email}</p>
                          <p className="mt-2 text-xs text-[#ffb088]">{report.profile.role}</p>
                        </td>
                        <td className="border-y border-[#2d3a52] px-4 py-4">
                          <p>{getProfileStore(report.profile)}</p>
                          <p className="mt-1 text-xs text-zinc-400">{report.profile.position || 'Sem cargo'}</p>
                          <p className="mt-1 text-xs text-zinc-500">{report.profile.region || 'Sem região'}</p>
                        </td>
                        <td className="border-y border-[#2d3a52] px-4 py-4">
                          <p className="font-black">{report.enrollments.length}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {report.enrollments.slice(0, 3).map((enrollment) => (
                              <span key={enrollment.id} className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(enrollment.status)}`}>
                                {formatStatus(enrollment.status)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="border-y border-[#2d3a52] px-4 py-4">
                          <p className="font-black text-[#f36b2a]">{report.progressAverage}%</p>
                          <p className="mt-1 text-xs text-zinc-400">{report.completedLessons} aula(s) concluídas</p>
                        </td>
                        <td className="border-y border-[#2d3a52] px-4 py-4">
                          <p className="font-black">{report.attempts.length}</p>
                          <p className="mt-1 text-xs text-zinc-400">Média {report.averageScore}%</p>
                        </td>
                        <td className="rounded-r-2xl border-y border-r border-[#2d3a52] px-4 py-4">
                          <p className="font-black text-emerald-200">{report.certificates.length}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <h2 className="text-2xl font-black">Cursos com mais matrículas</h2>
                <div className="mt-5 space-y-4">
                  {topCourses.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#2d3a52] bg-[#080c18]/60 p-5 text-sm text-zinc-400">
                      Nenhum curso encontrado.
                    </div>
                  )}
                  {topCourses.map((report) => {
                    const courseProgress = Math.min(100, Math.max(0, percent(report.certificates.length, report.enrollments.length)));
                    return (
                      <article key={report.course.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-5">
                        <div className="flex min-w-0 flex-col justify-between gap-3 md:flex-row md:items-center">
                          <div className="min-w-0">
                            <h3 className="break-words font-black">{report.course.title}</h3>
                            <p className="mt-1 text-xs text-zinc-400">
                              {report.enrollments.length} matrícula(s) • {report.lessonsCount} aula(s) • média {report.averageScore}%
                            </p>
                          </div>
                          <a href={`/cursos/${report.course.slug}`} className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white">
                            Ver curso
                          </a>
                        </div>
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-2 max-w-full rounded-full bg-[#f36b2a]" style={{ width: `${courseProgress}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">{courseProgress}% das matrículas com certificado emitido</p>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
                <h2 className="text-2xl font-black">Últimas atividades</h2>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div>
                    <h3 className="font-black text-[#ffb088]">Provas recentes</h3>
                    <div className="mt-3 space-y-3">
                      {latestAttempts.length === 0 && <p className="text-sm text-zinc-400">Nenhuma prova realizada.</p>}
                      {latestAttempts.map((attempt) => {
                        const profile = profileById.get(attempt.user_id);
                        const course = attempt.course_id ? courseById.get(attempt.course_id) : null;
                        return (
                          <div key={attempt.id} className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                            <p className="text-sm font-bold">{profile?.full_name || 'Usuário não encontrado'}</p>
                            <p className="mt-1 text-xs text-zinc-400">{course?.title || 'Curso não vinculado'}</p>
                            <p className="mt-2 text-xs text-zinc-500">Nota {Number(attempt.score || 0)}% • {attempt.status === 'passed' ? 'Aprovado' : 'Reprovado/Pendente'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-[#ffb088]">Certificados recentes</h3>
                    <div className="mt-3 space-y-3">
                      {latestCertificates.length === 0 && <p className="text-sm text-zinc-400">Nenhum certificado emitido.</p>}
                      {latestCertificates.map((certificate) => {
                        const profile = profileById.get(certificate.user_id);
                        const course = courseById.get(certificate.course_id);
                        return (
                          <div key={certificate.id} className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/60 p-4">
                            <p className="text-sm font-bold">{profile?.full_name || 'Usuário não encontrado'}</p>
                            <p className="mt-1 text-xs text-zinc-400">{course?.title || 'Curso não encontrado'}</p>
                            <p className="mt-2 text-xs text-zinc-500">Emitido em {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString('pt-BR') : 'data não registrada'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
