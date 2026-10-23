-- ============================================================
-- MIGRATION: 20261023130000_admin_crud_users_and_stores.sql
-- Funções administrativas completas (CRUD de Usuários e Lojas)
-- ============================================================

create extension if not exists "pgcrypto" with schema extensions;

-- 0. Correção de compatibilidade no auth.users (evita o erro 'converting NULL to string')
update auth.users
set 
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone = coalesce(phone, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  is_sso_user = coalesce(is_sso_user, false),
  is_anonymous = coalesce(is_anonymous, false)
where confirmation_token is null or recovery_token is null or is_anonymous is null;

-- 1. CRIAR USUÁRIO VIA ADMIN
create or replace function public.admin_create_user(
  user_email text,
  user_password text,
  user_name text,
  make_admin boolean default false,
  initial_store_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'extensions', 'auth'
as $$
declare
  new_user_id uuid := gen_random_uuid();
  clean_email text := lower(trim(user_email));
  clean_name text := trim(coalesce(user_name, ''));
  clean_pwd text := trim(user_password);
  inst_id uuid;
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem criar usuários.';
  end if;

  if clean_email = '' or clean_email is null then
    raise exception 'E-mail é obrigatório.';
  end if;

  if clean_pwd = '' or length(clean_pwd) < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres.';
  end if;

  if exists (select 1 from auth.users where email = clean_email) then
    raise exception 'Já existe um usuário cadastrado com este e-mail.';
  end if;

  select instance_id
  into inst_id
  from auth.users
  where instance_id is not null
  limit 1;

  if inst_id is null then
    inst_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token,
    is_sso_user,
    is_anonymous,
    created_at,
    updated_at
  ) values (
    new_user_id,
    inst_id,
    clean_email,
    extensions.crypt(clean_pwd, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', clean_name, 'email', clean_email),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false,
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    new_user_id,
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', clean_email),
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  ) on conflict do nothing;

  if coalesce(make_admin, false) then
    insert into public.system_admins (user_id)
    values (new_user_id)
    on conflict (user_id) do nothing;
  end if;

  if initial_store_id is not null then
    insert into public.store_members (store_id, user_id, role)
    values (initial_store_id, new_user_id, 'owner')
    on conflict (store_id, user_id) do update set role = 'owner';
  end if;

  return new_user_id;
end;
$$;

-- 2. ATUALIZAR USUÁRIO VIA ADMIN
create or replace function public.admin_update_user(
  target_user_id uuid,
  new_name text,
  new_email text,
  new_password text default null,
  make_admin boolean default null
)
returns void
language plpgsql
security definer
set search_path = 'public', 'extensions', 'auth'
as $$
declare
  clean_email text := lower(trim(new_email));
  clean_name text := trim(coalesce(new_name, ''));
  clean_pwd text := trim(coalesce(new_password, ''));
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem editar usuários.';
  end if;

  if clean_email = '' or clean_email is null then
    raise exception 'E-mail é obrigatório.';
  end if;

  if exists (select 1 from auth.users where email = clean_email and id <> target_user_id) then
    raise exception 'Já existe outro usuário cadastrado com este e-mail.';
  end if;

  update auth.users
  set
    email = clean_email,
    raw_user_meta_data = raw_user_meta_data || jsonb_build_object('name', clean_name, 'email', clean_email),
    encrypted_password = case
      when clean_pwd <> '' then extensions.crypt(clean_pwd, extensions.gen_salt('bf'))
      else encrypted_password
    end,
    updated_at = now()
  where id = target_user_id;

  update auth.identities
  set
    identity_data = jsonb_build_object('sub', target_user_id::text, 'email', clean_email),
    updated_at = now()
  where user_id = target_user_id and provider = 'email';

  if make_admin is not null then
    if make_admin then
      insert into public.system_admins (user_id)
      values (target_user_id)
      on conflict (user_id) do nothing;
    else
      if target_user_id = (select auth.uid()) then
        raise exception 'Você não pode revogar seus próprios privilégios de administrador.';
      end if;
      delete from public.system_admins where user_id = target_user_id;
    end if;
  end if;
end;
$$;

-- 3. ATUALIZAR LOJA VIA ADMIN
create or replace function public.admin_update_store(
  target_store_id uuid,
  new_name text,
  new_slug text default null,
  new_phone text default null,
  new_document text default null,
  new_owner_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := trim(new_name);
  clean_slug text := nullif(trim(coalesce(new_slug, '')), '');
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem editar lojas.';
  end if;

  if clean_name = '' or clean_name is null then
    raise exception 'O nome da loja é obrigatório.';
  end if;

  if clean_slug is not null and exists (select 1 from public.stores where slug = clean_slug and id <> target_store_id) then
    raise exception 'Já existe outra loja com este identificador (slug).';
  end if;

  update public.stores
  set
    name = clean_name,
    slug = clean_slug,
    phone = nullif(trim(coalesce(new_phone, '')), ''),
    document = nullif(trim(coalesce(new_document, '')), ''),
    updated_at = now()
  where id = target_store_id;

  if new_owner_id is not null then
    update public.store_members
    set role = 'admin'
    where store_id = target_store_id and role = 'owner';

    insert into public.store_members (store_id, user_id, role)
    values (target_store_id, new_owner_id, 'owner')
    on conflict (store_id, user_id) do update set role = 'owner';
  end if;
end;
$$;

-- 4. CRIAR LOJA VIA ADMIN (Permite criar com ou sem proprietário inicial)
create or replace function public.admin_create_store(
  store_name text,
  owner_user_id uuid default null,
  store_slug text default null,
  store_phone text default null,
  store_document text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem criar lojas.';
  end if;

  insert into public.stores (name, slug, phone, document)
  values (trim(store_name), nullif(trim(store_slug), ''), nullif(trim(store_phone), ''), nullif(trim(store_document), ''))
  returning id into new_id;

  if owner_user_id is not null then
    insert into public.store_members (store_id, user_id, role)
    values (new_id, owner_user_id, 'owner')
    on conflict (store_id, user_id) do nothing;
  end if;

  return new_id;
end;
$$;

-- 5. EXCLUIR LOJA VIA ADMIN
create or replace function public.admin_delete_store(target_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem excluir lojas.';
  end if;

  delete from public.stores where id = target_store_id;
end;
$$;

grant execute on function public.admin_create_user(text, text, text, boolean, uuid) to authenticated;
grant execute on function public.admin_update_user(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.admin_update_store(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_delete_store(uuid) to authenticated;
grant execute on function public.admin_create_store(text, uuid, text, text, text) to authenticated;
