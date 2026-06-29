'use client';

import { FormEvent, useState } from 'react';
import { getCurrentProfile, getDefaultRouteForRole, isActiveProfile } from '../../lib/auth';
import { supabase } from '../../lib/supabaseClient';

function getFriendlyLoginError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Este e-mail ainda não foi confirmado. Verifique o cadastro no Supabase Auth.';
  }

  if (normalized.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
  }

  return 'Não foi possível entrar agora. Confira seu acesso ou fale com um administrador.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Preencha o e-mail e a senha para acessar a Faculdade Nacar.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(getFriendlyLoginError(error.message));
      return;
    }

    const profile = await getCurrentProfile();

    if (!profile) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMessage('Login realizado, mas o perfil do usuário não foi encontrado. Fale com um administrador.');
      return;
    }

    if (!isActiveProfile(profile)) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMessage('Seu usuário está inativo. Fale com um administrador para reativar o acesso.');
      return;
    }

    window.location.href = getDefaultRouteForRole(profile.role);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 text-white sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,107,42,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(45,58,82,0.55),transparent_35%)]" />

      <section className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[#2d3a52] bg-[#101827]/95 shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden min-h-[640px] flex-col justify-between bg-[#080c18]/70 p-10 lg:flex">
          <div>
            <p className="text-sm uppercase tracking-[0.45em] text-[#f36b2a]">
              Grupo Nacar
            </p>

            <h1 className="mt-8 text-6xl font-black italic tracking-wide text-[#f36b2a] drop-shadow-[0_0_24px_rgba(243,107,42,0.45)]">
              NACAR
            </h1>

            <h2 className="mt-6 max-w-xl text-4xl font-black leading-tight">
              Faculdade corporativa para treinar, acompanhar e certificar colaboradores.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
              Plataforma oficial de cursos, provas, trilhas obrigatórias, materiais de apoio e certificados do Grupo Nacar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#2d3a52] bg-white/5 p-4">
              <p className="text-2xl font-black text-[#f36b2a]">LMS</p>
              <p className="mt-1 text-xs text-zinc-400">Treinamento interno</p>
            </div>
            <div className="rounded-2xl border border-[#2d3a52] bg-white/5 p-4">
              <p className="text-2xl font-black text-[#f36b2a]">RLS</p>
              <p className="mt-1 text-xs text-zinc-400">Segurança ativa</p>
            </div>
            <div className="rounded-2xl border border-[#2d3a52] bg-white/5 p-4">
              <p className="text-2xl font-black text-[#f36b2a]">Mobile</p>
              <p className="mt-1 text-xs text-zinc-400">Acesso pelo celular</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="w-full p-6 sm:p-8 lg:p-10">
          <div className="text-center lg:hidden">
            <p className="text-xs uppercase tracking-[0.35em] text-[#f36b2a]">
              Grupo Nacar
            </p>
            <h1 className="mt-5 text-5xl font-black italic text-[#f36b2a]">
              NACAR
            </h1>
          </div>

          <div className="mx-auto flex min-h-[560px] max-w-md flex-col justify-center">
            <p className="hidden text-sm uppercase tracking-[0.35em] text-[#f36b2a] lg:block">
              Faculdade Nacar
            </p>

            <h2 className="mt-6 text-3xl font-black sm:text-4xl">
              Entrar no LMS
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Use seu e-mail corporativo para acessar seus cursos, provas, trilhas e certificados.
            </p>

            {errorMessage && (
              <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                {errorMessage}
              </div>
            )}

            <div className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                  placeholder="seuemail@nacar.com.br"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#f36b2a] px-5 py-4 text-lg font-black text-white shadow-[0_0_28px_rgba(243,107,42,0.35)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Validando acesso...' : 'Entrar na Faculdade Nacar'}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-[#2d3a52] bg-white/5 p-4 text-xs leading-5 text-zinc-400">
              Acesso restrito a colaboradores autorizados. Em caso de erro, confirme se o usuário está ativo no painel administrativo.
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
