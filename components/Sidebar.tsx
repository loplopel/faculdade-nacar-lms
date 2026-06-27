'use client';

import { supabase } from '../lib/supabaseClient';

const menuItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Meus cursos', href: '/cursos' },
  { label: 'Provas e notas', href: '/provas' },
  { label: 'Certificados', href: '/certificados' },
  { label: 'Biblioteca', href: '/biblioteca' },
  { label: 'Administração', href: '/admin' },
];

export default function Sidebar() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <aside className="hidden min-h-screen w-72 flex-col border-r border-[#2d3a52] bg-[#080c18]/90 p-6 shadow-2xl lg:flex">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.4em] text-[#f36b2a]">
          Grupo Nacar
        </p>

        <div className="mt-8 text-center">
          <h1 className="text-5xl font-black italic tracking-wider text-[#f36b2a] drop-shadow-[0_0_20px_rgba(243,107,42,0.45)]">
            NACAR
          </h1>
          <p className="mt-4 text-sm font-medium text-zinc-300">
            Faculdade Corporativa
          </p>
        </div>

        <p className="mt-6 text-sm leading-6 text-zinc-400">
          Portal de conhecimento, treinamentos, provas, certificados e evolução
          dos colaboradores.
        </p>
      </div>

      <nav className="space-y-2 text-sm">
        {menuItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="block rounded-xl px-4 py-3 font-semibold text-zinc-300 hover:bg-[#f36b2a] hover:text-white hover:shadow-[0_0_22px_rgba(243,107,42,0.35)]"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="mt-10 rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4">
        <p className="text-sm font-semibold text-[#ffb088]">Próxima missão</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Finalizar o treinamento de atendimento e realizar a prova final.
        </p>
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:border-red-400 hover:bg-red-500/20 hover:text-white"
        >
          Sair do LMS
        </button>

        <p className="mt-3 text-center text-xs text-zinc-500">
          Use para trocar de usuário com segurança.
        </p>
      </div>
    </aside>
  );
}
