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

type ProfileInfo = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  position: string | null;
  situation: string | null;
  is_active: boolean | null;
};

type CourseInfo = {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_required: boolean | null;
};

type EnrollmentProfile = {
  full_name: string;
  email: string;
  role: Role;
  position: string | null;
};

type EnrollmentCourse = {
  title: string;
  slug: string;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  progress: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  profiles: EnrollmentProfile | EnrollmentProfile[] | null;
  courses: EnrollmentCourse | EnrollmentCourse[] | null;
};

const statusOptions: { value: EnrollmentStatus; label: string; description: string }[] = [
  { value: 'not_started', label: 'Não iniciado', description: 'Curso liberado, mas ainda não começou.' },
  { value: 'in_progress', label: 'Em andamento', description: 'Aluno já iniciou o treinamento.' },
  { value: 'completed', label: 'Concluído', description: 'Todas as aulas foram concluídas.' },
  { value: 'approved', label: 'Aprovado', description: 'Aluno aprovado na avaliação.' },
  { value: 'failed', label: 'Reprovado', description: 'Aluno reprovado ou pendente de nova tentativa.' },
];

function getProfile(enrollment: Enrollment) {
  if (Array.isArray(enrollment.profiles)) return enrollment.profiles[0];
  return enrollment.profiles;
}

function getCourse(enrollment: Enrollment) {
  if (Array.isArray(enrollment.courses)) return enrollment.courses[0];
  return enrollment.courses;
}

function statusLabel(status: string | null) {
  return statusOptions.find((option) => option.value === status)?.label || 'Não iniciado';
}

function isAdminOrManager(profile: CurrentProfile | null) {
  return profile?.role === 'admin' || profile?.role === 'gestor' || profile?.role === 'instrutor';
}

export default function AdminEnrollmentsPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [userId, setUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState<EnrollmentStatus>('not_started');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const filteredEnrollments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return enrollments.filter((enrollment) => {
      const profile = getProfile(enrollment);
      const course = getCourse(enrollment);
      const matchesSearch =
        !normalizedSearch ||
        (profile?.full_name || '').toLowerCase().includes(normalizedSearch) ||
        (profile?.email || '').toLowerCase().includes(normalizedSearch) ||
        (course?.title || '').toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enrollments, search, statusFilter]);

  async function loadData() {
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
      setErrorMessage('Você não tem permissão para gerenciar matrículas.');
      setLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, position, situation, is_active')
      .order('full_name', { ascending: true });

    if (profilesError) {
      setErrorMessage(`Erro ao buscar usuários: ${profilesError.message}`);
      setLoading(false);
      return;
    }

    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, slug, status, is_required')
      .order('title', { ascending: true });

    if (coursesError) {
      setErrorMessage(`Erro ao buscar cursos: ${coursesError.message}`);
      setLoading(false);
      return;
    }

    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        user_id,
        course_id,
        status,
        progress,
        started_at,
        completed_at,
        created_at,
        profiles (
          full_name,
          email,
          role,
          position
        ),
        courses (
          title,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (enrollmentsError) {
      setErrorMessage(`Erro ao buscar matrículas: ${enrollmentsError.message}. Rode o SQL da v1.5 no Supabase.`);
      setLoading(false);
      return;
    }

    const activeProfiles = ((profilesData || []) as ProfileInfo[]).filter(
      (profile) => profile.is_active !== false && profile.situation !== 'blocked'
    );

    setProfiles(activeProfiles);
    setCourses((coursesData || []) as CourseInfo[]);
    setEnrollments((enrollmentsData || []) as Enrollment[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveEnrollment() {
    setErrorMessage('');
    setSuccessMessage('');

    if (!userId || !courseId) {
      setErrorMessage('Selecione um usuário e um curso antes de salvar a matrícula.');
      return;
    }

    setSaving(true);

    const payload = {
      user_id: userId,
      course_id: courseId,
      status,
      progress: 0,
      started_at: status === 'not_started' ? null : new Date().toISOString(),
      completed_at: status === 'completed' || status === 'approved' ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from('enrollments').upsert(payload, {
      onConflict: 'user_id,course_id',
    });

    setSaving(false);

    if (error) {
      setErrorMessage(`Erro ao salvar matrícula: ${error.message}`);
      return;
    }

    setSuccessMessage('Matrícula salva com sucesso.');
    setUserId('');
    setCourseId('');
    setStatus('not_started');
    await loadData();
  }

  async function handleUpdateStatus(enrollment: Enrollment, newStatus: EnrollmentStatus) {
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('enrollments')
      .update({
        status: newStatus,
        started_at: newStatus === 'not_started' ? null : enrollment.started_at || new Date().toISOString(),
        completed_at: newStatus === 'completed' || newStatus === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', enrollment.id);

    if (error) {
      setErrorMessage(`Erro ao atualizar status: ${error.message}`);
      return;
    }

    setSuccessMessage('Status da matrícula atualizado.');
    await loadData();
  }

  async function handleDeleteEnrollment(enrollment: Enrollment) {
    const profile = getProfile(enrollment);
    const course = getCourse(enrollment);

    const confirmed = window.confirm(
      `Remover a matrícula de ${profile?.full_name || 'usuário'} no curso ${course?.title || 'curso'}?`
    );

    if (!confirmed) return;

    const { error } = await supabase.from('enrollments').delete().eq('id', enrollment.id);

    if (error) {
      setErrorMessage(`Erro ao remover matrícula: ${error.message}`);
      return;
    }

    setSuccessMessage('Matrícula removida com sucesso.');
    await loadData();
  }

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
                Matrículas e acessos
              </h1>
              <p className="mt-3 max-w-3xl text-zinc-300">
                Vincule colaboradores aos cursos, controle status de acesso e acompanhe a jornada de aprendizagem.
              </p>
            </div>

            <a
              href="/admin"
              className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
            >
              Voltar ao admin
            </a>
          </div>
        </section>

        {errorMessage && (
          <div className="mb-6 rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-emerald-100">
            {successMessage}
          </div>
        )}

        {loading && (
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
            Carregando matrículas...
          </div>
        )}

        {!loading && isAdminOrManager(currentProfile) && (
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/90 p-6 shadow-xl">
              <h2 className="text-2xl font-black">Nova matrícula</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Libere um curso para um colaborador. Se a matrícula já existir, o status será atualizado.
              </p>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-bold">Usuário</span>
                  <select
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-4 text-white outline-none focus:border-[#f36b2a]"
                  >
                    <option value="">Selecione um usuário</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name} — {profile.email}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold">Curso</span>
                  <select
                    value={courseId}
                    onChange={(event) => setCourseId(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-4 text-white outline-none focus:border-[#f36b2a]"
                  >
                    <option value="">Selecione um curso</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} {course.status !== 'published' ? `(${course.status})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold">Status inicial</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as EnrollmentStatus)}
                    className="mt-2 w-full rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-4 text-white outline-none focus:border-[#f36b2a]"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEnrollment}
                  className="w-full rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar matrícula'}
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4 text-sm leading-6 text-[#ffb088]">
                Na v1.5, funcionário visualiza apenas cursos matriculados. Admin, gestor e instrutor continuam vendo todos os cursos.
              </div>
            </section>

            <section className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/90 p-6 shadow-xl">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-2xl font-black">Matrículas cadastradas</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {filteredEnrollments.length} de {enrollments.length} matrícula(s) encontrada(s).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                >
                  Atualizar lista
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por aluno, e-mail ou curso"
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-4 text-white outline-none focus:border-[#f36b2a]"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-4 text-white outline-none focus:border-[#f36b2a]"
                >
                  <option value="all">Todos os status</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 space-y-4">
                {filteredEnrollments.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/60 p-6 text-sm text-zinc-400">
                    Nenhuma matrícula encontrada.
                  </div>
                )}

                {filteredEnrollments.map((enrollment) => {
                  const profile = getProfile(enrollment);
                  const course = getCourse(enrollment);

                  return (
                    <article
                      key={enrollment.id}
                      className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black">
                              {profile?.full_name || 'Usuário sem nome'}
                            </h3>
                            <span className="rounded-full border border-[#f36b2a]/40 bg-[#f36b2a]/10 px-3 py-1 text-xs font-bold text-[#ffb088]">
                              {statusLabel(enrollment.status)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-zinc-400">
                            {profile?.email || 'E-mail não informado'}
                          </p>

                          <p className="mt-3 text-sm text-zinc-200">
                            <strong>Curso:</strong> {course?.title || 'Curso não encontrado'}
                          </p>

                          <p className="mt-2 text-sm text-zinc-400">
                            Progresso salvo: {Math.round(Number(enrollment.progress || 0))}%
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <select
                            value={enrollment.status}
                            onChange={(event) =>
                              handleUpdateStatus(enrollment, event.target.value as EnrollmentStatus)
                            }
                            className="rounded-full border border-[#2d3a52] bg-[#111827] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#f36b2a]"
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {course?.slug && (
                            <a
                              href={`/cursos/${course.slug}`}
                              className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                            >
                              Ver curso
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteEnrollment(enrollment)}
                            className="rounded-full border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
