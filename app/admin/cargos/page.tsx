'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../lib/auth';

type Position = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type CurrentProfile = {
  id: string;
  role: string;
};

function canManage(profile: CurrentProfile | null) {
  return profile?.role === 'admin' || profile?.role === 'gestor';
}

export default function AdminPositionsPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const filteredPositions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return positions.filter((position) => {
      if (!term) return true;

      return (
        position.title.toLowerCase().includes(term) ||
        (position.description || '').toLowerCase().includes(term)
      );
    });
  }, [positions, search]);

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
      setErrorMessage('Você não tem permissão para gerenciar cargos.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('positions')
      .select('id, title, description, is_active, created_at')
      .order('title', { ascending: true });

    if (error) {
      setErrorMessage(`Erro ao buscar cargos: ${error.message}. Rode o SQL da v1.8 no Supabase.`);
      setLoading(false);
      return;
    }

    setPositions((data || []) as Position[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setIsActive(true);
  }

  function editPosition(position: Position) {
    setEditingId(position.id);
    setTitle(position.title || '');
    setDescription(position.description || '');
    setIsActive(Boolean(position.is_active));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function savePosition() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Informe o nome do cargo.');
      return;
    }

    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from('positions').update(payload).eq('id', editingId)
      : await supabase.from('positions').insert(payload);

    setSaving(false);

    if (error) {
      setErrorMessage(`Erro ao salvar cargo: ${error.message}`);
      return;
    }

    setSuccessMessage(editingId ? 'Cargo atualizado com sucesso.' : 'Cargo cadastrado com sucesso.');
    resetForm();
    await loadData();
  }

  async function togglePosition(position: Position) {
    const { error } = await supabase
      .from('positions')
      .update({
        is_active: !position.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', position.id);

    if (error) {
      setErrorMessage(`Erro ao alterar cargo: ${error.message}`);
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando cargos...
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
          <h1 className="mt-4 text-3xl font-black md:text-5xl">Cargos e funções</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 md:text-base">
            Padronize os cargos usados nos usuários e prepare trilhas obrigatórias por função.
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
            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-5 shadow-2xl md:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">
                    {editingId ? 'Editar cargo' : 'Novo cargo'}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Use nomes padronizados para facilitar relatórios e trilhas.
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
                  <span className="text-sm font-bold text-zinc-300">Cargo</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    placeholder="Ex.: Vendedor"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-zinc-300">Descrição</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-28 rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                    placeholder="Descreva a função ou aplicação desse cargo"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-5 w-5"
                  />
                  <span className="text-sm font-bold text-zinc-300">Cargo ativo</span>
                </label>

                <button
                  type="button"
                  onClick={savePosition}
                  disabled={saving}
                  className="rounded-full bg-[#f36b2a] px-6 py-4 text-sm font-black text-white hover:bg-[#ff6a24] disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar cargo'}
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-5 shadow-2xl md:p-7">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-black">Cargos cadastrados</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {filteredPositions.length} de {positions.length} cargo(s).
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="rounded-2xl border border-[#2d3a52] bg-[#080c18] px-4 py-3 text-white outline-none focus:border-[#f36b2a]"
                  placeholder="Buscar cargo"
                />
              </div>

              <div className="space-y-3">
                {filteredPositions.map((position) => (
                  <article
                    key={position.id}
                    className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="min-w-0">
                        <h3 className="break-words text-xl font-black">{position.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {position.description || 'Sem descrição cadastrada.'}
                        </p>
                        <span
                          className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            position.is_active
                              ? 'border-green-500/40 bg-green-500/10 text-green-200'
                              : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300'
                          }`}
                        >
                          {position.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editPosition(position)}
                          className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePosition(position)}
                          className="rounded-full border border-[#2d3a52] bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[#f36b2a]"
                        >
                          {position.is_active ? 'Inativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
