import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

type Role = 'admin' | 'gestor' | 'instrutor' | 'funcionario';
type Situation = 'active' | 'inactive' | 'blocked';

const allowedRoles: Role[] = ['admin', 'gestor', 'instrutor', 'funcionario'];
const allowedSituations: Situation[] = ['active', 'inactive', 'blocked'];

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

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
    return { error: 'Você não tem permissão para criar usuários.', profile: null };
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
    const fullName = normalizeText(body.fullName);
    const email = normalizeText(body.email).toLowerCase();
    const password = normalizeText(body.password);
    const role = allowedRoles.includes(body.role) ? (body.role as Role) : 'funcionario';
    const situation = allowedSituations.includes(body.situation) ? (body.situation as Situation) : 'active';

    if (!fullName) {
      return NextResponse.json({ error: 'Informe o nome do usuário.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Informe uma senha inicial com pelo menos 6 caracteres.' }, { status: 400 });
    }

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        name: fullName,
      },
    });

    if (createError || !createdUser.user) {
      const message = createError?.message || 'Não foi possível criar o login do usuário.';
      return NextResponse.json(
        {
          error:
            message.includes('already') || message.includes('registered')
              ? 'Já existe um login cadastrado com este e-mail no Supabase Auth.'
              : message,
        },
        { status: 400 }
      );
    }

    const profilePayload = {
      id: createdUser.user.id,
      full_name: fullName,
      email,
      role,
      position: normalizeNullableText(body.position),
      store_id: normalizeNullableText(body.storeId),
      region: normalizeNullableText(body.region),
      seller_name: normalizeNullableText(body.sellerName),
      phone: normalizeNullableText(body.phone),
      whatsapp: normalizeNullableText(body.whatsapp),
      situation,
      is_active: situation === 'active',
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(profilePayload, {
      onConflict: 'id',
    });

    if (profileError) {
      return NextResponse.json(
        {
          error: `Login criado, mas houve erro ao criar o perfil interno: ${profileError.message}`,
          userId: createdUser.user.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: createdUser.user.id,
      message: 'Usuário criado com login e perfil interno.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao criar usuário.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
