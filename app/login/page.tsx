'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin() {
    setErrorMessage('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    window.location.href = '/';
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.45em] text-[#f36b2a]">
            Grupo Nacar
          </p>

          <h1 className="mt-6 text-5xl font-black text-[#f36b2a]">
            NACAR
          </h1>

          <p className="mt-3 text-sm font-bold text-zinc-300">
            Faculdade Corporativa
          </p>

          <p className="mt-5 text-sm leading-6 text-zinc-400">
            Acesse o portal de treinamentos, provas, notas e certificados.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              E-mail
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-[#2d3a52] bg-[#080c18]/80 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#f36b2a]"
              placeholder="seuemail@nacar.com.br"
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
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-[#f36b2a] px-5 py-4 text-lg font-black text-white shadow-[0_0_28px_rgba(243,107,42,0.35)] hover:bg-[#ff6a24] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </section>
    </main>
  );
}