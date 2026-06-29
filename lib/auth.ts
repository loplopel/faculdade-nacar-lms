import { supabase } from './supabaseClient';

export type UserRole = 'admin' | 'gestor' | 'instrutor' | 'funcionario';

export type CurrentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean | null;
  situation: string | null;
  store_id?: string | null;
  position_id?: string | null;
  group_id?: string | null;
};

export async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export function normalizeRole(role?: string | null): UserRole {
  if (role === 'admin' || role === 'gestor' || role === 'instrutor') {
    return role;
  }

  return 'funcionario';
}

export function isActiveProfile(profile?: Pick<CurrentProfile, 'is_active' | 'situation'> | null) {
  if (!profile) return false;

  const situation = String(profile.situation || '').toLowerCase();

  if (profile.is_active === false) return false;
  if (situation === 'inativo' || situation === 'inactive' || situation === 'bloqueado') return false;

  return true;
}

export function canAccessAdmin(role?: string | null) {
  return ['admin', 'gestor', 'instrutor'].includes(normalizeRole(role));
}

export function canManageUsers(role?: string | null) {
  return ['admin', 'gestor'].includes(normalizeRole(role));
}

export function canManageContent(role?: string | null) {
  return ['admin', 'instrutor'].includes(normalizeRole(role));
}

export function canManageSecurity(role?: string | null) {
  return normalizeRole(role) === 'admin';
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, situation, store_id, position_id, group_id')
    .eq('id', currentUserId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    role: normalizeRole(data.role),
  } as CurrentProfile;
}

export function getDefaultRouteForRole(role?: string | null) {
  if (canAccessAdmin(role)) {
    return '/admin';
  }

  return '/cursos';
}
