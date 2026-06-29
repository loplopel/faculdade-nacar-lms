'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { canAccessAdmin, getCurrentProfile, isActiveProfile, type CurrentProfile } from '../lib/auth';

type GuardState = 'loading' | 'allowed' | 'blocked' | 'inactive';

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 text-center shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">Faculdade Nacar</p>
        <h1 className="mt-4 text-3xl font-black">Validando acesso</h1>
        <p className="mt-3 text-sm text-zinc-400">Aguarde enquanto conferimos sua sessão e suas permissões.</p>
      </section>
    </main>
  );
}

function BlockedScreen({ profile }: { profile: CurrentProfile | null }) {
  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-red-500/30 bg-red-500/10 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-red-200">Acesso restrito</p>
        <h1 className="mt-4 text-3xl font-black">Você não tem permissão para acessar esta área.</h1>
        <p className="mt-4 leading-7 text-zinc-300">
          Seu perfil atual é <strong>{profile?.role || 'não identificado'}</strong>. As telas administrativas são liberadas apenas para admin, gestor ou instrutor.
        </p>
        <a href="/cursos" className="mt-6 inline-block rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white">
          Voltar para meus cursos
        </a>
      </section>
    </main>
  );
}

function InactiveScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-yellow-500/30 bg-yellow-500/10 p-8 text-center shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-yellow-200">Acesso pausado</p>
        <h1 className="mt-4 text-3xl font-black">Seu usuário está inativo.</h1>
        <p className="mt-4 leading-7 text-zinc-300">
          Fale com um administrador para reativar seu acesso à Faculdade Nacar.
        </p>
        <a href="/login" className="mt-6 inline-block rounded-full border border-[#2d3a52] px-5 py-3 text-sm font-bold text-white">
          Voltar ao login
        </a>
      </section>
    </main>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const [guardState, setGuardState] = useState<GuardState>('loading');
  const [profile, setProfile] = useState<CurrentProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function validateAccess() {
      if (isLogin) {
        setGuardState('allowed');
        return;
      }

      const currentProfile = await getCurrentProfile();

      if (!mounted) return;

      if (!currentProfile) {
        window.location.href = '/login';
        return;
      }

      setProfile(currentProfile);

      if (!isActiveProfile(currentProfile)) {
        setGuardState('inactive');
        return;
      }

      if (pathname.startsWith('/admin') && !canAccessAdmin(currentProfile.role)) {
        setGuardState('blocked');
        return;
      }

      setGuardState('allowed');
    }

    validateAccess();

    return () => {
      mounted = false;
    };
  }, [isLogin, pathname]);

  if (isLogin) {
    return <>{children}</>;
  }

  if (guardState === 'loading') {
    return <LoadingScreen />;
  }

  if (guardState === 'inactive') {
    return <InactiveScreen />;
  }

  if (guardState === 'blocked') {
    return <BlockedScreen profile={profile} />;
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar currentProfile={profile} />

      <div className="min-h-screen min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
