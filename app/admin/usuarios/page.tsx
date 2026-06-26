'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../lib/auth';

type Role = 'admin' | 'gestor' | 'instrutor' | 'funcionario';
type Situation = 'active' | 'inactive' | 'blocked';

type StoreInfo = {
  id: string;
  name: string;
  code: string | null;
};

type ProfileStore = {
  name: string;
  code: string | null;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  position: string | null;
  store_id: string | null;
  region: string | null;
  seller_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  situation: Situation | null;
  is_active: boolean | null;
  created_at: string | null;
  stores: ProfileStore | ProfileStore[] | null;
};

type CurrentProfile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean | null;
};

const emptyForm = {
  id: '',
  fullName: '',
  email: '',
  role: 'funcionario' as Role,
  position: '',
  storeId: '',
  region: '',
  sellerName: '',
  phone: '',
  whatsapp: '',
  situation: 'active' as Situation,
  isActive: true,
};

const roleOptions: { value: Role; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Acesso administrativo completo ao LMS.',
  },
  {
    value: 'gestor',
    label: 'Gestor',
    description: 'Perfil para acompanhar equipe, cursos e evolução.',
  },
  {
    value: 'instrutor',
    label: 'Instrutor',
    description: 'Perfil para apoiar criação de conteúdos e treinamentos.',
  },
  {
    value: 'funcionario',
    label: 'Funcionário',
    description: 'Perfil padrão para realizar cursos, provas e certificados.',
  },
];

const situationOptions: { value: Situation; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'blocked', label: 'Bloqueado' },
];

function getStore(profile: Profile) {
  if (Array.isArray(profile.stores)) {
    return profile.stores[0];
  }

  return profile.stores;
}

function formatDate(value: string | null) {
  if (!value) return 'Não informado';

  return new Date(value).toLocaleDateString('pt-BR');
}

function roleLabel(role: string) {
  return roleOptions.find((option) => option.value === role)?.label || role;
}

function situationLabel(situation: string | null, isActive: boolean | null) {
  if (situation) {
    return situationOptions.find((option) => option.value === situation)?.label || situation;
  }

  return isActive ? 'Ativo' : 'Inativo';
}

function isAdminOrManager(profile: CurrentProfile | null) {
  return profile?.role === 'admin' || profile?.role === 'gestor';
}

export default function AdminUsersPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const [id, setId] = useState(emptyForm.id);
  const [fullName, setFullName] = useState(emptyForm.fullName);
  const [email, setEmail] = useState(emptyForm.email);
  const [role, setRole] = useState<Role>(emptyForm.role);
  const [position, setPosition] = useState(emptyForm.position);
  const [storeId, setStoreId] = useState(emptyForm.storeId);
  const [region, setRegion] = useState(emptyForm.region);
  const [sellerName, setSellerName] = useState(emptyForm.sellerName);
  const [phone, setPhone] = useState(emptyForm.phone);
  const [whatsapp, setWhatsapp] = useState(emptyForm.whatsapp);
  const [situation, setSituation] = useState<Situation>(emptyForm.situation);
  const [isActive, setIsActive] = useState(emptyForm.isActive);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [situationFilter, setSituationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return profiles.filter((profile) => {
      const store = getStore(profile);
      const matchesSearch =
        !normalizedSearch ||
        profile.full_name.toLowerCase().includes(normalizedSearch) ||
        profile.email.toLowerCase().includes(normalizedSearch) ||
        (profile.position || '').toLowerCase().includes(normalizedSearch) ||
        (profile.region || '').toLowerCase().includes(normalizedSearch) ||
        (store?.name || '').toLowerCase().includes(normalizedSearch);

      const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
      const profileSituation = profile.situation || (profile.is_active ? 'active' : 'inactive');
      const matchesSituation = situationFilter === 'all' || profileSituation === situationFilter;

      return matchesSearch && matchesRole && matchesSituation;
    });
  }, [profiles, roleFilter, search, situationFilter]);

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
      .select('id, full_name, email, role, is_active')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      setErrorMessage(
        profileError?.message ||
          'Seu usuário não tem perfil cadastrado na tabela profiles. Cadastre o perfil antes de acessar esta área.'
      );
      setLoading(false);
      return;
    }

    const normalizedCurrentProfile = profileData as CurrentProfile;
    setCurrentProfile(normalizedCurrentProfile);

    if (!isAdminOrManager(normalizedCurrentProfile)) {
      setErrorMessage('Você não tem permissão para acessar o cadastro de usuários.');
      setLoading(false);
      return;
    }

    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('id, name, code')
      .order('name', { ascending: true });

    if (storesError) {
      setErrorMessage(`Erro ao buscar lojas: ${storesError.message}`);
      setLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        email,
        role,
        position,
        store_id,
        region,
        seller_name,
        phone,
        whatsapp,
        situation,
        is_active,
        created_at,
        stores (
          name,
          code
        )
      `
      )
      .order('full_name', { ascending: true });

    if (profilesError) {
      setErrorMessage(
        `Erro ao buscar usuários: ${profilesError.message}. Se aparecer coluna não encontrada, rode o SQL da v1.4 no Supabase.`
      );
      setLoading(false);
      return;
    }

    setStores((storesData || []) as StoreInfo[]);
    setProfiles((profilesData || []) as Profile[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingProfileId(null);
    setId('');
    setFullName('');
    setEmail('');
    setRole('funcionario');
    setPosition('');
    setStoreId('');
    setRegion('');
    setSellerName('');
    setPhone('');
    setWhatsapp('');
    setSituation('active');
    setIsActive(true);
  }

  function handleEditProfile(profile: Profile) {
    setSuccessMessage('');
    setErrorMessage('');
    setEditingProfileId(profile.id);
    setId(profile.id || '');
    setFullName(profile.full_name || '');
    setEmail(profile.email || '');
    setRole(profile.role || 'funcionario');
    setPosition(profile.position || '');
    setStoreId(profile.store_id || '');
    setRegion(profile.region || '');
    setSellerName(profile.seller_name || '');
    setPhone(profile.phone || '');
    setWhatsapp(profile.whatsapp || '');
    setSituation(profile.situation || (profile.is_active ? 'active' : 'inactive'));
    setIsActive(Boolean(profile.is_active));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSaveProfile() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!id.trim()) {
      setErrorMessage('Informe o User UID do usuário criado no Supabase Auth.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Informe o nome do usuário.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Informe o e-mail do usuário.');
      return;
    }

    setSaving(true);

    const payload = {
      id: id.trim(),
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      position: position.trim() || null,
      store_id: storeId || null,
      region: region.trim() || null,
      seller_name: sellerName.trim() || null,
      phone: phone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      situation,
      is_active: isActive && situation === 'active',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(payload, {
      onConflict: 'id',
    });

    setSaving(false);

    if (error) {
      setErrorMessage(
        `Erro ao salvar usuário: ${error.message}. Confirme se o User UID existe em Authentication > Users e se o SQL da v1.4 foi rodado.`
      );
      return;
    }

    setSuccessMessage(editingProfileId ? 'Usuário atualizado com sucesso.' : 'Perfil cadastrado com sucesso.');
    resetForm();
    await loadData();
  }

  async function handleToggleActive(profile: Profile) {
    setSuccessMessage('');
    setErrorMessage('');

    const nextActive = !profile.is_active;
    const nextSituation: Situation = nextActive ? 'active' : 'inactive';

    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: nextActive,
        situation: nextSituation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      setErrorMessage(`Erro ao alterar situação: ${error.message}`);
      return;
    }

    setSuccessMessage(nextActive ? 'Usuário ativado com sucesso.' : 'Usuário inativado com sucesso.');
    await loadData();
  }

  async function handleDeleteProfile(profile: Profile) {
    if (profile.id === currentProfile?.id) {
      setErrorMessage('Você não pode excluir seu próprio perfil por esta tela.');
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o perfil de ${profile.full_name}? Isso não exclui o login em Authentication, apenas o cadastro interno do LMS.`
    );

    if (!confirmed) return;

    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);

    if (error) {
      setErrorMessage(`Erro ao excluir perfil: ${error.message}`);
      return;
    }

    setSuccessMessage('Perfil excluído com sucesso. O usuário do Supabase Auth não foi removido.');
    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando usuários...
        </div>
      </main>
    );
  }

  const canManage = isAdminOrManager(currentProfile);

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
                Administração de usuários
              </p>
              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                Usuários e perfis
              </h1>
              <p className="mt-4 max-w-3xl text-zinc-300">
                Cadastre e organize os perfis internos da Faculdade Nacar por cargo, loja,
                região, perfil de acesso e situação.
              </p>
            </div>

            <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-5 text-sm leading-6 text-[#ffcfbd] lg:max-w-md">
              <strong className="text-white">Importante:</strong> nesta versão, o login ainda deve ser criado em
              <span className="font-bold"> Supabase &gt; Authentication &gt; Users</span>. Depois copie o
              <span className="font-bold"> User UID</span> e cadastre o perfil aqui.
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

        {!canManage ? (
          <section className="rounded-[2rem] border border-red-500/40 bg-red-500/10 p-8 text-red-100">
            <h2 className="text-2xl font-black">Acesso restrito</h2>
            <p className="mt-3 text-sm leading-6">
              Esta área está disponível apenas para administradores e gestores.
            </p>
          </section>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">
                    {editingProfileId ? 'Editar usuário' : 'Novo perfil de usuário'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {editingProfileId
                      ? 'Atualize as informações internas do colaborador.'
                      : 'Crie o perfil interno após criar o login no Supabase Auth.'}
                  </p>
                </div>

                {editingProfileId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div className="grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-zinc-300">User UID do Supabase Auth</span>
                  <input
                    value={id}
                    onChange={(event) => setId(event.target.value)}
                    disabled={Boolean(editingProfileId)}
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a] disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="Cole o User UID do usuário criado no Auth"
                  />
                  <span className="text-xs leading-5 text-zinc-500">
                    O ID precisa existir em Authentication &gt; Users. Esta tela não cria a senha do usuário.
                  </span>
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Nome</span>
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="Nome completo"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">E-mail</span>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="email@nacar.com.br"
                    />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Perfil</span>
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value as Role)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Situação</span>
                    <select
                      value={situation}
                      onChange={(event) => {
                        const value = event.target.value as Situation;
                        setSituation(value);
                        setIsActive(value === 'active');
                      }}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    >
                      {situationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-zinc-300">Cargo</span>
                  <input
                    value={position}
                    onChange={(event) => setPosition(event.target.value)}
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    placeholder="Ex.: Vendedor, Gerente, Administrativo, Marketing"
                  />
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Loja</span>
                    <select
                      value={storeId}
                      onChange={(event) => setStoreId(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    >
                      <option value="">Sem loja vinculada</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.code ? `${store.code} - ${store.name}` : store.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Região</span>
                    <input
                      value={region}
                      onChange={(event) => setRegion(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="Ex.: São Paulo, Campinas, Vale do Paraíba"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-zinc-300">Vendedor que atende</span>
                  <input
                    value={sellerName}
                    onChange={(event) => setSellerName(event.target.value)}
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    placeholder="Nome do vendedor da distribuição vinculado"
                  />
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Telefone</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="(00) 0000-0000"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">WhatsApp</span>
                    <input
                      value={whatsapp}
                      onChange={(event) => setWhatsapp(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="(00) 00000-0000"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => {
                      setIsActive(event.target.checked);
                      setSituation(event.target.checked ? 'active' : 'inactive');
                    }}
                    className="h-5 w-5"
                  />
                  <span className="text-sm font-bold text-zinc-300">Usuário ativo no LMS</span>
                </label>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editingProfileId ? 'Salvar alterações' : 'Cadastrar perfil'}
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
              <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-2xl font-black">Usuários cadastrados</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {filteredProfiles.length} de {profiles.length} perfil(is) encontrado(s).
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

              <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  placeholder="Buscar por nome, e-mail, cargo, região ou loja"
                />

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                >
                  <option value="all">Todos os perfis</option>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={situationFilter}
                  onChange={(event) => setSituationFilter(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                >
                  <option value="all">Todas situações</option>
                  {situationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {filteredProfiles.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#2d3a52] bg-[#080c18]/50 p-6 text-zinc-400">
                  Nenhum usuário encontrado com os filtros atuais.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProfiles.map((profile) => {
                    const store = getStore(profile);
                    const profileSituation = profile.situation || (profile.is_active ? 'active' : 'inactive');

                    return (
                      <article
                        key={profile.id}
                        className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-black text-white">{profile.full_name}</h3>
                              <span className="rounded-full border border-[#f36b2a]/40 bg-[#f36b2a]/10 px-3 py-1 text-xs font-bold text-[#ffb088]">
                                {roleLabel(profile.role)}
                              </span>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                  profileSituation === 'active'
                                    ? 'border-green-500/40 bg-green-500/10 text-green-200'
                                    : profileSituation === 'blocked'
                                      ? 'border-red-500/40 bg-red-500/10 text-red-200'
                                      : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300'
                                }`}
                              >
                                {situationLabel(profile.situation, profile.is_active)}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-zinc-400">{profile.email}</p>
                            <p className="mt-2 text-sm text-zinc-500 break-all">UID: {profile.id}</p>

                            <div className="mt-4 grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
                              <p>
                                <strong className="text-zinc-100">Cargo:</strong>{' '}
                                {profile.position || 'Não informado'}
                              </p>
                              <p>
                                <strong className="text-zinc-100">Loja:</strong>{' '}
                                {store?.name || 'Sem loja'}
                              </p>
                              <p>
                                <strong className="text-zinc-100">Região:</strong>{' '}
                                {profile.region || 'Não informada'}
                              </p>
                              <p>
                                <strong className="text-zinc-100">Vendedor:</strong>{' '}
                                {profile.seller_name || 'Não informado'}
                              </p>
                              <p>
                                <strong className="text-zinc-100">Telefone:</strong>{' '}
                                {profile.phone || 'Não informado'}
                              </p>
                              <p>
                                <strong className="text-zinc-100">WhatsApp:</strong>{' '}
                                {profile.whatsapp || 'Não informado'}
                              </p>
                            </div>

                            <p className="mt-4 text-xs text-zinc-500">
                              Criado em {formatDate(profile.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            <button
                              type="button"
                              onClick={() => handleEditProfile(profile)}
                              className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(profile)}
                              className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                            >
                              {profile.is_active ? 'Inativar' : 'Ativar'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteProfile(profile)}
                              className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20"
                            >
                              Excluir perfil
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
