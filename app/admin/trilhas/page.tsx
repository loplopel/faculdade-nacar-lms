'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../lib/auth';

type Role = 'admin' | 'gestor' | 'instrutor' | 'funcionario';
type AudienceType = 'all' | 'role' | 'store' | 'position' | 'group';

type CurrentProfile = {
  id: string;
  role: Role;
};

type TrainingPath = {
  id: string;
  name: string;
  description: string | null;
  audience_type: AudienceType;
  audience_role: string | null;
  audience_store_id: string | null;
  audience_position_id: string | null;
  audience_group_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  status: string | null;
};

type Store = {
  id: string;
  name: string;
  is_active: boolean | null;
};

type Position = {
  id: string;
  title: string;
  is_active: boolean | null;
};

type UserGroup = {
  id: string;
  name: string;
  is_active: boolean | null;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  store_id: string | null;
  position_id: string | null;
  group_id: string | null;
  situation: string | null;
  is_active: boolean | null;
};

type GroupMember = {
  group_id: string;
  user_id: string;
};

type PathCourse = {
  id: string;
  path_id: string;
  course_id: string;
  order_index: number | null;
  is_required: boolean | null;
  courses: Course | Course[] | null;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: string | null;
  progress: number | null;
};

const audienceOptions: { value: AudienceType; label: string; description: string }[] = [
  { value: 'all', label: 'Todos os usuários ativos', description: 'Libera a trilha para todos os colaboradores ativos.' },
  { value: 'role', label: 'Perfil', description: 'Ex.: todos os funcionários, gestores ou instrutores.' },
  { value: 'store', label: 'Loja', description: 'Ex.: todos os colaboradores de uma loja específica.' },
  { value: 'position', label: 'Cargo', description: 'Ex.: todos os vendedores ou equipe de garantia.' },
  { value: 'group', label: 'Grupo', description: 'Ex.: grupo Garantia, Vendas, Marketing ou Gestores.' },
];

const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'instrutor', label: 'Instrutor' },
  { value: 'funcionario', label: 'Funcionário' },
];

function canManage(profile: CurrentProfile | null) {
  return profile?.role === 'admin' || profile?.role === 'gestor' || profile?.role === 'instrutor';
}

function getCourse(pathCourse: PathCourse) {
  if (Array.isArray(pathCourse.courses)) return pathCourse.courses[0];
  return pathCourse.courses;
}

function isUserActive(profile: Profile) {
  const situation = (profile.situation || '').toLowerCase();
  return profile.is_active !== false && situation !== 'inactive' && situation !== 'inativo' && situation !== 'blocked' && situation !== 'bloqueado';
}

export default function AdminTrainingPathsPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [paths, setPaths] = useState<TrainingPath[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [pathCourses, setPathCourses] = useState<PathCourse[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [audienceRole, setAudienceRole] = useState<Role>('funcionario');
  const [audienceStoreId, setAudienceStoreId] = useState('');
  const [audiencePositionId, setAudiencePositionId] = useState('');
  const [audienceGroupId, setAudienceGroupId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const storeById = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const positionById = useMemo(() => new Map(positions.map((position) => [position.id, position])), [positions]);
  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

  const pathCoursesByPath = useMemo(() => {
    const map = new Map<string, PathCourse[]>();

    pathCourses.forEach((pathCourse) => {
      const current = map.get(pathCourse.path_id) || [];
      current.push(pathCourse);
      map.set(pathCourse.path_id, current);
    });

    map.forEach((items) => {
      items.sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
    });

    return map;
  }, [pathCourses]);

  const filteredPaths = useMemo(() => {
    const term = search.trim().toLowerCase();

    return paths.filter((path) => {
      if (!term) return true;

      return (
        path.name.toLowerCase().includes(term) ||
        (path.description || '').toLowerCase().includes(term) ||
        getAudienceLabel(path).toLowerCase().includes(term)
      );
    });
  }, [paths, search, stores, positions, groups]);

  function getAudienceLabel(path: TrainingPath) {
    if (path.audience_type === 'all') return 'Todos os usuários ativos';
    if (path.audience_type === 'role') return `Perfil: ${roleOptions.find((role) => role.value === path.audience_role)?.label || path.audience_role || 'Não definido'}`;
    if (path.audience_type === 'store') return `Loja: ${storeById.get(path.audience_store_id || '')?.name || 'Não definida'}`;
    if (path.audience_type === 'position') return `Cargo: ${positionById.get(path.audience_position_id || '')?.title || 'Não definido'}`;
    if (path.audience_type === 'group') return `Grupo: ${groupById.get(path.audience_group_id || '')?.name || 'Não definido'}`;
    return 'Público não definido';
  }

  function getUsersForPath(path: TrainingPath) {
    const activeProfiles = profiles.filter(isUserActive);

    if (path.audience_type === 'all') {
      return activeProfiles;
    }

    if (path.audience_type === 'role') {
      return activeProfiles.filter((profile) => profile.role === path.audience_role);
    }

    if (path.audience_type === 'store') {
      return activeProfiles.filter((profile) => profile.store_id === path.audience_store_id);
    }

    if (path.audience_type === 'position') {
      return activeProfiles.filter((profile) => profile.position_id === path.audience_position_id);
    }

    if (path.audience_type === 'group') {
      const memberIds = new Set(
        groupMembers
          .filter((member) => member.group_id === path.audience_group_id)
          .map((member) => member.user_id)
      );

      return activeProfiles.filter((profile) => profile.group_id === path.audience_group_id || memberIds.has(profile.id));
    }

    return [];
  }

  function getPathStats(path: TrainingPath) {
    const users = getUsersForPath(path);
    const coursesInPath = pathCoursesByPath.get(path.id) || [];
    const expectedEnrollments = users.length * coursesInPath.length;

    const courseIds = new Set(coursesInPath.map((course) => course.course_id));
    const userIds = new Set(users.map((profile) => profile.id));

    const existingEnrollments = enrollments.filter(
      (enrollment) => userIds.has(enrollment.user_id) && courseIds.has(enrollment.course_id)
    );

    const approved = existingEnrollments.filter((enrollment) => enrollment.status === 'approved' || enrollment.status === 'Aprovado').length;
    const completed = existingEnrollments.filter((enrollment) => ['completed', 'approved', 'Concluído', 'Aprovado'].includes(enrollment.status || '')).length;
    const averageProgress = existingEnrollments.length
      ? Math.round(existingEnrollments.reduce((total, item) => total + Number(item.progress || 0), 0) / existingEnrollments.length)
      : 0;

    return {
      users: users.length,
      courses: coursesInPath.length,
      expectedEnrollments,
      existingEnrollments: existingEnrollments.length,
      missingEnrollments: Math.max(expectedEnrollments - existingEnrollments.length, 0),
      completed,
      approved,
      averageProgress,
    };
  }

  async function loadData() {
    setLoading(true);
    setErrorMessage('');

    const userId = await getCurrentUserId();

    if (!userId) {
      window.location.href = '/login';
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profileData) {
      setErrorMessage(profileError?.message || 'Perfil do usuário logado não encontrado.');
      setLoading(false);
      return;
    }

    const normalizedProfile = profileData as CurrentProfile;
    setCurrentProfile(normalizedProfile);

    if (!canManage(normalizedProfile)) {
      setErrorMessage('Você não tem permissão para gerenciar trilhas.');
      setLoading(false);
      return;
    }

    const [pathsResult, coursesResult, storesResult, positionsResult, groupsResult, profilesResult, groupMembersResult, pathCoursesResult, enrollmentsResult] = await Promise.all([
      supabase
        .from('training_paths')
        .select('id, name, description, audience_type, audience_role, audience_store_id, audience_position_id, audience_group_id, is_active, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('courses')
        .select('id, title, slug, status')
        .order('title', { ascending: true }),
      supabase
        .from('stores')
        .select('id, name, is_active')
        .order('name', { ascending: true }),
      supabase
        .from('positions')
        .select('id, title, is_active')
        .order('title', { ascending: true }),
      supabase
        .from('user_groups')
        .select('id, name, is_active')
        .order('name', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, store_id, position_id, group_id, situation, is_active')
        .order('full_name', { ascending: true }),
      supabase
        .from('user_group_members')
        .select('group_id, user_id'),
      supabase
        .from('training_path_courses')
        .select(`
          id,
          path_id,
          course_id,
          order_index,
          is_required,
          courses (
            id,
            title,
            slug,
            status
          )
        `)
        .order('order_index', { ascending: true }),
      supabase
        .from('enrollments')
        .select('id, user_id, course_id, status, progress'),
    ]);

    const firstError =
      pathsResult.error ||
      coursesResult.error ||
      storesResult.error ||
      positionsResult.error ||
      groupsResult.error ||
      profilesResult.error ||
      groupMembersResult.error ||
      pathCoursesResult.error ||
      enrollmentsResult.error;

    if (firstError) {
      setErrorMessage(`Erro ao carregar trilhas: ${firstError.message}. Rode o SQL da v1.9 no Supabase.`);
      setLoading(false);
      return;
    }

    const normalizedPaths = (pathsResult.data || []) as TrainingPath[];

    setPaths(normalizedPaths);
    setCourses((coursesResult.data || []) as Course[]);
    setStores(((storesResult.data || []) as Store[]).filter((store) => store.is_active !== false));
    setPositions(((positionsResult.data || []) as Position[]).filter((position) => position.is_active !== false));
    setGroups(((groupsResult.data || []) as UserGroup[]).filter((group) => group.is_active !== false));
    setProfiles((profilesResult.data || []) as Profile[]);
    setGroupMembers((groupMembersResult.data || []) as GroupMember[]);
    setPathCourses((pathCoursesResult.data || []) as PathCourse[]);
    setEnrollments((enrollmentsResult.data || []) as Enrollment[]);
    setSelectedPathId((current) => current || normalizedPaths[0]?.id || '');
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setAudienceType('all');
    setAudienceRole('funcionario');
    setAudienceStoreId('');
    setAudiencePositionId('');
    setAudienceGroupId('');
    setIsActive(true);
  }

  function editPath(path: TrainingPath) {
    setEditingId(path.id);
    setName(path.name || '');
    setDescription(path.description || '');
    setAudienceType(path.audience_type || 'all');
    setAudienceRole((path.audience_role as Role) || 'funcionario');
    setAudienceStoreId(path.audience_store_id || '');
    setAudiencePositionId(path.audience_position_id || '');
    setAudienceGroupId(path.audience_group_id || '');
    setIsActive(path.is_active !== false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateAudience() {
    if (audienceType === 'role' && !audienceRole) return 'Selecione o perfil da trilha.';
    if (audienceType === 'store' && !audienceStoreId) return 'Selecione a loja da trilha.';
    if (audienceType === 'position' && !audiencePositionId) return 'Selecione o cargo da trilha.';
    if (audienceType === 'group' && !audienceGroupId) return 'Selecione o grupo da trilha.';
    return '';
  }

  async function savePath() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Informe o nome da trilha.');
      return;
    }

    const audienceError = validateAudience();

    if (audienceError) {
      setErrorMessage(audienceError);
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      audience_type: audienceType,
      audience_role: audienceType === 'role' ? audienceRole : null,
      audience_store_id: audienceType === 'store' ? audienceStoreId : null,
      audience_position_id: audienceType === 'position' ? audiencePositionId : null,
      audience_group_id: audienceType === 'group' ? audienceGroupId : null,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from('training_paths').update(payload).eq('id', editingId)
      : await supabase.from('training_paths').insert(payload);

    setSaving(false);

    if (error) {
      setErrorMessage(`Erro ao salvar trilha: ${error.message}`);
      return;
    }

    setSuccessMessage(editingId ? 'Trilha atualizada com sucesso.' : 'Trilha cadastrada com sucesso.');
    resetForm();
    await loadData();
  }

  async function togglePath(path: TrainingPath) {
    const { error } = await supabase
      .from('training_paths')
      .update({ is_active: !path.is_active, updated_at: new Date().toISOString() })
      .eq('id', path.id);

    if (error) {
      setErrorMessage(`Erro ao alterar trilha: ${error.message}`);
      return;
    }

    await loadData();
  }

  async function addCourseToPath() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!selectedPathId || !selectedCourseId) {
      setErrorMessage('Selecione uma trilha e um curso.');
      return;
    }

    const currentCourses = pathCoursesByPath.get(selectedPathId) || [];

    const { error } = await supabase.from('training_path_courses').upsert(
      {
        path_id: selectedPathId,
        course_id: selectedCourseId,
        order_index: currentCourses.length + 1,
        is_required: true,
      },
      {
        onConflict: 'path_id,course_id',
      }
    );

    if (error) {
      setErrorMessage(`Erro ao vincular curso: ${error.message}`);
      return;
    }

    setSuccessMessage('Curso vinculado à trilha com sucesso.');
    setSelectedCourseId('');
    await loadData();
  }

  async function removeCourseFromPath(pathCourse: PathCourse) {
    const course = getCourse(pathCourse);
    const confirmed = window.confirm(`Remover o curso ${course?.title || 'selecionado'} desta trilha?`);

    if (!confirmed) return;

    const { error } = await supabase
      .from('training_path_courses')
      .delete()
      .eq('id', pathCourse.id);

    if (error) {
      setErrorMessage(`Erro ao remover curso: ${error.message}`);
      return;
    }

    await loadData();
  }

  async function applyPath(path: TrainingPath) {
    setSuccessMessage('');
    setErrorMessage('');
    setApplying(true);

    const users = getUsersForPath(path);
    const coursesInPath = pathCoursesByPath.get(path.id) || [];

    if (!users.length) {
      setErrorMessage('Nenhum usuário ativo encontrado para o público desta trilha.');
      setApplying(false);
      return;
    }

    if (!coursesInPath.length) {
      setErrorMessage('Adicione pelo menos um curso antes de aplicar a trilha.');
      setApplying(false);
      return;
    }

    const rows = users.flatMap((profile) =>
      coursesInPath.map((pathCourse) => ({
        user_id: profile.id,
        course_id: pathCourse.course_id,
        status: 'not_started',
        progress: 0,
        updated_at: new Date().toISOString(),
      }))
    );

    const { error } = await supabase.from('enrollments').upsert(rows, {
      onConflict: 'user_id,course_id',
      ignoreDuplicates: false,
    });

    setApplying(false);

    if (error) {
      setErrorMessage(`Erro ao aplicar trilha: ${error.message}`);
      return;
    }

    setSuccessMessage(`Trilha aplicada com sucesso. ${users.length} usuário(s), ${coursesInPath.length} curso(s) e ${rows.length} matrícula(s) processadas.`);
    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando trilhas...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-6 shadow-2xl md:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#f36b2a] md:text-sm">
                LMS Corporativo
              </p>
              <h1 className="mt-4 text-3xl font-black md:text-5xl">Trilhas obrigatórias</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 md:text-base">
                Crie trilhas por loja, cargo, grupo ou perfil e matricule automaticamente os colaboradores nos cursos obrigatórios.
              </p>
            </div>

            <a
              href="/admin"
              className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-center text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
            >
              Voltar ao admin
            </a>
          </div>
        </section>

        {successMessage && (
          <div className="mb-5 rounded-3xl border border-green-500/40 bg-green-500/10 p-4 text-green-200">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-3xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {errorMessage}
          </div>
        )}

        {!canManage(currentProfile) ? (
          <section className="rounded-[2rem] border border-red-500/40 bg-red-500/10 p-6 text-red-100">
            Acesso restrito a administradores, gestores e instrutores.
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
            <div className="grid gap-6">
              <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-5 shadow-2xl md:p-7">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">{editingId ? 'Editar trilha' : 'Nova trilha'}</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Defina público, cursos e aplique a trilha para gerar matrículas.
                    </p>
                  </div>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Nome da trilha</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="Ex.: Integração Nacar"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Descrição</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="min-h-28 rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="Explique o objetivo da trilha"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Público da trilha</span>
                    <select
                      value={audienceType}
                      onChange={(event) => setAudienceType(event.target.value as AudienceType)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    >
                      {audienceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-zinc-500">
                      {audienceOptions.find((option) => option.value === audienceType)?.description}
                    </span>
                  </label>

                  {audienceType === 'role' && (
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-zinc-300">Perfil</span>
                      <select
                        value={audienceRole}
                        onChange={(event) => setAudienceRole(event.target.value as Role)}
                        className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {audienceType === 'store' && (
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-zinc-300">Loja</span>
                      <select
                        value={audienceStoreId}
                        onChange={(event) => setAudienceStoreId(event.target.value)}
                        className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      >
                        <option value="">Selecione</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {audienceType === 'position' && (
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-zinc-300">Cargo</span>
                      <select
                        value={audiencePositionId}
                        onChange={(event) => setAudiencePositionId(event.target.value)}
                        className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      >
                        <option value="">Selecione</option>
                        {positions.map((position) => (
                          <option key={position.id} value={position.id}>
                            {position.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {audienceType === 'group' && (
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-zinc-300">Grupo</span>
                      <select
                        value={audienceGroupId}
                        onChange={(event) => setAudienceGroupId(event.target.value)}
                        className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      >
                        <option value="">Selecione</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="flex items-center gap-3 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                      className="h-5 w-5"
                    />
                    <span className="text-sm font-bold text-zinc-300">Trilha ativa</span>
                  </label>

                  <button
                    type="button"
                    onClick={savePath}
                    disabled={saving}
                    className="rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white hover:bg-[#ff6a24] disabled:opacity-60"
                  >
                    {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar trilha'}
                  </button>
                </div>
              </section>

              <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-5 shadow-2xl md:p-7">
                <h2 className="text-2xl font-black">Cursos da trilha</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Vincule os cursos que fazem parte da trilha selecionada.
                </p>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Trilha</span>
                    <select
                      value={selectedPathId}
                      onChange={(event) => setSelectedPathId(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    >
                      <option value="">Selecione</option>
                      {paths.map((path) => (
                        <option key={path.id} value={path.id}>
                          {path.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Curso</span>
                    <select
                      value={selectedCourseId}
                      onChange={(event) => setSelectedCourseId(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    >
                      <option value="">Selecione</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title} {course.status !== 'published' ? `(${course.status})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={addCourseToPath}
                    className="rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white hover:bg-[#ff6a24]"
                  >
                    Adicionar curso à trilha
                  </button>
                </div>
              </section>
            </div>

            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-5 shadow-2xl md:p-7">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-black">Trilhas cadastradas</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {filteredPaths.length} de {paths.length} trilha(s).
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  placeholder="Buscar trilha"
                />
              </div>

              <div className="space-y-4">
                {filteredPaths.length === 0 && (
                  <div className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-6 text-zinc-400">
                    Nenhuma trilha encontrada.
                  </div>
                )}

                {filteredPaths.map((path) => {
                  const stats = getPathStats(path);
                  const coursesInPath = pathCoursesByPath.get(path.id) || [];

                  return (
                    <article key={path.id} className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-5">
                      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-xl font-black">{path.name}</h3>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                path.is_active
                                  ? 'border-green-500/40 bg-green-500/10 text-green-200'
                                  : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300'
                              }`}
                            >
                              {path.is_active ? 'Ativa' : 'Inativa'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">
                            {path.description || 'Sem descrição cadastrada.'}
                          </p>
                          <p className="mt-3 text-sm font-bold text-[#ffb088]">
                            {getAudienceLabel(path)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editPath(path)}
                            className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePath(path)}
                            className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a]"
                          >
                            {path.is_active ? 'Inativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPath(path)}
                            disabled={applying || path.is_active === false}
                            className="rounded-full bg-[#f36b2a] px-4 py-2 text-xs font-black text-white hover:bg-[#ff6a24] disabled:opacity-50"
                          >
                            {applying ? 'Aplicando...' : 'Aplicar trilha'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-[#2d3a52] bg-[#101827] p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Público</p>
                          <p className="mt-2 text-2xl font-black">{stats.users}</p>
                        </div>
                        <div className="rounded-2xl border border-[#2d3a52] bg-[#101827] p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cursos</p>
                          <p className="mt-2 text-2xl font-black">{stats.courses}</p>
                        </div>
                        <div className="rounded-2xl border border-[#2d3a52] bg-[#101827] p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Matrículas</p>
                          <p className="mt-2 text-2xl font-black">{stats.existingEnrollments}/{stats.expectedEnrollments}</p>
                        </div>
                        <div className="rounded-2xl border border-[#2d3a52] bg-[#101827] p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Progresso médio</p>
                          <p className="mt-2 text-2xl font-black">{stats.averageProgress}%</p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="mb-3 text-sm font-black text-zinc-300">Cursos vinculados</p>

                        {coursesInPath.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#2d3a52] p-4 text-sm text-zinc-500">
                            Nenhum curso vinculado a esta trilha.
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {coursesInPath.map((pathCourse) => {
                              const course = getCourse(pathCourse);

                              return (
                                <div key={pathCourse.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-[#2d3a52] bg-[#101827] p-3 text-sm md:flex-row md:items-center">
                                  <div className="min-w-0">
                                    <p className="truncate font-bold text-white">
                                      {Number(pathCourse.order_index || 1)}. {course?.title || 'Curso sem título'}
                                    </p>
                                    <p className="truncate text-xs text-zinc-500">
                                      {course?.status || 'status não informado'}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {course?.slug && (
                                      <a
                                        href={`/cursos/${course.slug}`}
                                        className="rounded-full border border-[#2d3a52] bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a]"
                                      >
                                        Ver curso
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removeCourseFromPath(pathCourse)}
                                      className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
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
