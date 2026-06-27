'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../lib/auth';

type Group = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean | null;
};

type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  profiles: Profile | Profile[] | null;
};

type CurrentProfile = {
  id: string;
  role: string;
};

function canManage(profile: CurrentProfile | null) {
  return profile?.role === 'admin' || profile?.role === 'gestor';
}

function getMemberProfile(member: GroupMember) {
  if (Array.isArray(member.profiles)) {
    return member.profiles[0];
  }

  return member.profiles;
}

export default function AdminGroupsPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();

    return groups.filter((group) => {
      if (!term) return true;

      return (
        group.name.toLowerCase().includes(term) ||
        (group.description || '').toLowerCase().includes(term)
      );
    });
  }, [groups, search]);

  const membersByGroup = useMemo(() => {
    const map = new Map<string, GroupMember[]>();

    members.forEach((member) => {
      const current = map.get(member.group_id) || [];
      current.push(member);
      map.set(member.group_id, current);
    });

    return map;
  }, [members]);

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
      setErrorMessage('Você não tem permissão para gerenciar grupos.');
      setLoading(false);
      return;
    }

    const [groupsResult, profilesResult, membersResult] = await Promise.all([
      supabase
        .from('user_groups')
        .select('id, name, description, is_active, created_at')
        .order('name', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active')
        .order('full_name', { ascending: true }),
      supabase
        .from('user_group_members')
        .select(
          `
          id,
          group_id,
          user_id,
          profiles (
            id,
            full_name,
            email,
            role,
            is_active
          )
        `
        )
        .order('created_at', { ascending: false }),
    ]);

    const firstError = groupsResult.error || profilesResult.error || membersResult.error;

    if (firstError) {
      setErrorMessage(`Erro ao carregar grupos: ${firstError.message}. Rode o SQL da v1.8 no Supabase.`);
      setLoading(false);
      return;
    }

    const normalizedGroups = (groupsResult.data || []) as Group[];

    setGroups(normalizedGroups);
    setProfiles((profilesResult.data || []) as Profile[]);
    setMembers((membersResult.data || []) as GroupMember[]);
    setSelectedGroupId((current) => current || normalizedGroups[0]?.id || '');
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setIsActive(true);
  }

  function editGroup(group: Group) {
    setEditingId(group.id);
    setName(group.name || '');
    setDescription(group.description || '');
    setIsActive(Boolean(group.is_active));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveGroup() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Informe o nome do grupo.');
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from('user_groups').update(payload).eq('id', editingId)
      : await supabase.from('user_groups').insert(payload);

    setSaving(false);

    if (error) {
      setErrorMessage(`Erro ao salvar grupo: ${error.message}`);
      return;
    }

    setSuccessMessage(editingId ? 'Grupo atualizado com sucesso.' : 'Grupo cadastrado com sucesso.');
    resetForm();
    await loadData();
  }

  async function toggleGroup(group: Group) {
    const { error } = await supabase
      .from('user_groups')
      .update({
        is_active: !group.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', group.id);

    if (error) {
      setErrorMessage(`Erro ao alterar grupo: ${error.message}`);
      return;
    }

    await loadData();
  }

  async function addMember() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!selectedGroupId || !selectedUserId) {
      setErrorMessage('Selecione um grupo e um usuário.');
      return;
    }

    const { error } = await supabase.from('user_group_members').upsert(
      {
        group_id: selectedGroupId,
        user_id: selectedUserId,
      },
      {
        onConflict: 'group_id,user_id',
      }
    );

    if (error) {
      setErrorMessage(`Erro ao vincular usuário ao grupo: ${error.message}`);
      return;
    }

    await supabase
      .from('profiles')
      .update({
        group_id: selectedGroupId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedUserId);

    setSuccessMessage('Usuário vinculado ao grupo com sucesso.');
    setSelectedUserId('');
    await loadData();
  }

  async function removeMember(member: GroupMember) {
    const profile = getMemberProfile(member);
    const confirmed = window.confirm(`Remover ${profile?.full_name || 'usuário'} deste grupo?`);

    if (!confirmed) return;

    const { error } = await supabase
      .from('user_group_members')
      .delete()
      .eq('id', member.id);

    if (error) {
      setErrorMessage(`Erro ao remover usuário do grupo: ${error.message}`);
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando grupos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-6 shadow-2xl md:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#f36b2a] md:text-sm">
            Organização
          </p>
          <h1 className="mt-4 text-3xl font-black md:text-5xl">Grupos de usuários</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 md:text-base">
            Organize colaboradores por grupo para preparar trilhas obrigatórias por equipe, setor ou função.
          </p>
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
            Acesso restrito a administradores e gestores.
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="grid gap-6">
              <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-5 shadow-2xl md:p-7">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">
                      {editingId ? 'Editar grupo' : 'Novo grupo'}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Ex.: Vendas, Garantia, Marketing, Gestores.
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
                    <span className="text-sm font-bold text-zinc-300">Nome do grupo</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="Ex.: Vendas e Atendimento"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Descrição</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="min-h-28 rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                      placeholder="Descreva para que esse grupo será usado"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                      className="h-5 w-5"
                    />
                    <span className="text-sm font-bold text-zinc-300">Grupo ativo</span>
                  </label>

                  <button
                    type="button"
                    onClick={saveGroup}
                    disabled={saving}
                    className="rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white hover:bg-[#ff6a24] disabled:opacity-60"
                  >
                    {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar grupo'}
                  </button>
                </div>
              </section>

              <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-5 shadow-2xl md:p-7">
                <h2 className="text-2xl font-black">Vincular usuário</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Adicione colaboradores a um grupo para facilitar relatórios e futuras trilhas obrigatórias.
                </p>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Grupo</span>
                    <select
                      value={selectedGroupId}
                      onChange={(event) => setSelectedGroupId(event.target.value)}
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

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-300">Usuário</span>
                    <select
                      value={selectedUserId}
                      onChange={(event) => setSelectedUserId(event.target.value)}
                      className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    >
                      <option value="">Selecione</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.full_name} — {profile.email}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={addMember}
                    className="rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white hover:bg-[#ff6a24]"
                  >
                    Vincular usuário ao grupo
                  </button>
                </div>
              </section>
            </div>

            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-5 shadow-2xl md:p-7">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-black">Grupos cadastrados</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {filteredGroups.length} de {groups.length} grupo(s).
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  placeholder="Buscar grupo"
                />
              </div>

              <div className="space-y-4">
                {filteredGroups.map((group) => {
                  const groupMembers = membersByGroup.get(group.id) || [];

                  return (
                    <article
                      key={group.id}
                      className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div className="min-w-0">
                          <h3 className="break-words text-xl font-black">{group.name}</h3>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">
                            {group.description || 'Sem descrição cadastrada.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                                group.is_active
                                  ? 'border-green-500/40 bg-green-500/10 text-green-200'
                                  : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300'
                              }`}
                            >
                              {group.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                            <span className="inline-flex rounded-full border border-[#2d3a52] bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300">
                              {groupMembers.length} membro(s)
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editGroup(group)}
                            className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleGroup(group)}
                            className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a]"
                          >
                            {group.is_active ? 'Inativar' : 'Ativar'}
                          </button>
                        </div>
                      </div>

                      {groupMembers.length > 0 && (
                        <div className="mt-5 grid gap-2">
                          {groupMembers.map((member) => {
                            const profile = getMemberProfile(member);

                            return (
                              <div
                                key={member.id}
                                className="flex flex-col justify-between gap-3 rounded-2xl border border-[#2d3a52] bg-[#101827] p-3 text-sm md:flex-row md:items-center"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-bold text-white">
                                    {profile?.full_name || 'Usuário sem nome'}
                                  </p>
                                  <p className="truncate text-xs text-zinc-400">
                                    {profile?.email || 'E-mail não informado'}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeMember(member)}
                                  className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200"
                                >
                                  Remover
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
