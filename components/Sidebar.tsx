'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const menuItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Meus cursos', href: '/cursos' },
  { label: 'Provas e notas', href: '/provas' },
  { label: 'Certificados', href: '/certificados' },
  { label: 'Biblioteca', href: '/biblioteca' },
  { label: 'Administração', href: '/admin' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  const navigation = (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-[#f36b2a]">
          Grupo Nacar
        </p>

        <div className="mt-7 text-center">
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
        {menuItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <a
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              className={`block rounded-xl px-4 py-3 font-semibold transition ${
                active
                  ? 'bg-[#f36b2a] text-white shadow-[0_0_22px_rgba(243,107,42,0.35)]'
                  : 'text-zinc-300 hover:bg-[#f36b2a] hover:text-white hover:shadow-[0_0_22px_rgba(243,107,42,0.35)]'
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4">
        <p className="text-sm font-semibold text-[#ffb088]">Próxima missão</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Finalizar os treinamentos liberados e acompanhar seu progresso.
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
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#2d3a52] bg-[#080c18]/95 px-4 py-3 shadow-xl backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <a href="/" className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-[#f36b2a]">
              Grupo Nacar
            </p>
            <p className="truncate text-lg font-black italic text-white">
              Faculdade Nacar
            </p>
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-[#2d3a52] bg-white/5 px-4 py-2 text-sm font-bold text-white"
            aria-label="Abrir menu"
          >
            Menu
          </button>
        </div>
      </header>

      <aside className="hidden min-h-screen w-72 flex-col border-r border-[#2d3a52] bg-[#080c18]/90 p-6 shadow-2xl lg:flex">
        {navigation}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Fechar menu"
            onClick={closeMobileMenu}
          />

          <aside className="relative flex h-full w-[86vw] max-w-sm flex-col overflow-y-auto border-r border-[#2d3a52] bg-[#080c18] p-5 shadow-2xl">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-xl border border-[#2d3a52] bg-white/5 px-4 py-2 text-sm font-bold text-zinc-200"
              >
                Fechar
              </button>
            </div>

            {navigation}
          </aside>
        </div>
      )}
    </>
  );
}
