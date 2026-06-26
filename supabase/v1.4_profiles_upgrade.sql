-- =====================================================
-- FACULDADE NACAR LMS - v1.4
-- Upgrade da tabela profiles para cadastro completo
-- Rode este script no Supabase SQL Editor antes de testar /admin/usuarios
-- =====================================================

alter table profiles
  add column if not exists region text,
  add column if not exists seller_name text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists situation text default 'active';

update profiles
set situation = case
  when is_active = true then 'active'
  else 'inactive'
end
where situation is null;

grant select, insert, update, delete on table profiles to anon;
grant select, insert, update, delete on table profiles to authenticated;

grant select on table stores to anon;
grant select on table stores to authenticated;

-- Durante desenvolvimento, se necessário:
-- alter table profiles disable row level security;
-- alter table stores disable row level security;
