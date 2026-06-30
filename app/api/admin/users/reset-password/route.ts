import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

function isActiveProfile(profile: { is_active: boolean | null; situation: string | null }) {
  const situation = String(profile.situation || '').toLowerCase();
  return profile.is_active !== false && !['inactive', 'inativo', 'blocked', 'bloqueado'].includes(situation);
}

async function getRequesterProfile(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace('Bearer ', '').trim();

  if (!supabaseUrl || !anonKey || !token) {
    return { error: 'Sessão não encontrada. Faça login novamente.', profile: null };
  }

  const requesterClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await requesterClient.auth.getUser(token);

  if (userError || !user) {
    return { error: 'Sessão inválida. Faça login novamente.', profile: null };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, is_active, situation')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: 'Perfil do administrador não encontrado.', profile: null };
  }

  if (!['admin', 'gestor'].includes(profile.role) || !isActiveProfile(profile)) {
    return { error: 'Você não tem permissão para redefinir senhas.', profile: null };
  }

  return { error: null, profile };
}

export async function POST(request: NextRequest) {
  try {
    const requester = await getRequesterProfile(request);

    if (requester.error) {
      return NextResponse.json({ error: requester.error }, { status: 403 });
    }

    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não informado.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Informe uma nova senha com pelo menos 6 caracteres.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao redefinir senha.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
