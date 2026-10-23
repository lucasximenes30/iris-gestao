-- ============================================================
-- MIGRATION: 20261023100000_multi_tenant_and_core_schema.sql
-- Multi-tenant (stores, members), Clients, Products, Order Items,
-- Push Subscriptions, Activity Logs and updated triggers / RLS.
-- ============================================================

-- 1. STORES & STORE MEMBERS
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  document text,
  phone text,
  timezone text not null default 'America/Sao_Paulo',
  currency text not null default 'BRL',
  settings jsonb not null default '{"notify_daily": true, "notify_weekly": true, "daily_time": "07:30", "weekly_day": 0, "weekly_time": "08:00"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, user_id)
);

-- 1.1 SYSTEM ADMINS (Platform Super Admins)
create table if not exists public.system_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. CLIENTS (Centralized CRM)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. PRODUCTS CATALOG
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'outros',
  price numeric(12,2) not null default 0 check (price >= 0),
  cost_price numeric(12,2) default 0 check (cost_price is null or cost_price >= 0),
  unit text not null default 'un', -- un, kg, cento, kit, fatia, caixa
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. ORDER ITEMS
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_price numeric(12,2) not null default 0 check (total_price >= 0),
  notes text,
  created_at timestamptz not null default now()
);

-- 5. PUSH SUBSCRIPTIONS
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. ORDER ACTIVITY LOGS
create table if not exists public.order_activity_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. ALTER EXISTING TABLES
-- ============================================================

-- Add columns to orders
alter table public.orders
  add column if not exists store_id uuid references public.stores(id) on delete cascade,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists delivery_type text not null default 'pickup',
  add column if not exists delivery_address text,
  add column if not exists delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0);

-- Update status constraint on orders to support granular workflow
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'draft',
    'pending_confirmation',
    'confirmed',
    'in_production',
    'ready',
    'completed',
    'cancelled',
    'scheduled' -- Kept for backward compatibility during migration
  ));

-- Add store_id to payments, expenses, cash_movements
alter table public.payments
  add column if not exists store_id uuid references public.stores(id) on delete cascade;

alter table public.expenses
  add column if not exists store_id uuid references public.stores(id) on delete cascade;

alter table public.cash_movements
  add column if not exists store_id uuid references public.stores(id) on delete cascade;

-- ============================================================
-- 8. SAFE BACKFILL FOR EXISTING DATA
-- ============================================================

do $$
declare
  u record;
  new_store_id uuid;
begin
  -- For every user who has orders or expenses or exists in auth.users, ensure a store exists
  for u in select id, raw_user_meta_data from auth.users loop
    if not exists (select 1 from public.store_members where user_id = u.id) then
      insert into public.stores (name)
      values (coalesce(u.raw_user_meta_data->>'store_name', 'Minha Loja'))
      returning id into new_store_id;

      insert into public.store_members (store_id, user_id, role)
      values (new_store_id, u.id, 'owner');
    end if;
  end loop;
end $$;

-- Associate existing records to their user's store
update public.orders o
set store_id = sm.store_id
from public.store_members sm
where sm.user_id = o.user_id and o.store_id is null;

update public.payments p
set store_id = sm.store_id
from public.store_members sm
where sm.user_id = p.user_id and p.store_id is null;

update public.expenses e
set store_id = sm.store_id
from public.store_members sm
where sm.user_id = e.user_id and e.store_id is null;

update public.cash_movements cm
set store_id = sm.store_id
from public.store_members sm
where sm.user_id = cm.user_id and cm.store_id is null;

-- Populate clients table from distinct clients in existing orders
insert into public.clients (store_id, name, phone, email)
select distinct on (store_id, lower(trim(client_name)))
  store_id,
  trim(client_name),
  client_phone,
  client_email
from public.orders
where store_id is not null and client_name is not null and trim(client_name) <> ''
on conflict do nothing;

-- Link client_id back to existing orders
update public.orders o
set client_id = c.id
from public.clients c
where o.store_id = c.store_id
  and lower(trim(o.client_name)) = lower(c.name)
  and o.client_id is null;

-- Migrate legacy 'scheduled' status to 'confirmed'
update public.orders
set status = 'confirmed'
where status = 'scheduled';

-- ============================================================
-- 9. INDEXES (Foreign keys & Queries)
-- ============================================================

create index if not exists idx_store_members_store_id on public.store_members(store_id);
create index if not exists idx_store_members_user_id on public.store_members(user_id);

create index if not exists idx_clients_store_id on public.clients(store_id);
create index if not exists idx_clients_name on public.clients(name);

create index if not exists idx_products_store_id on public.products(store_id);
create index if not exists idx_products_category on public.products(category);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

create index if not exists idx_orders_store_id on public.orders(store_id);
create index if not exists idx_orders_client_id on public.orders(client_id);
create index if not exists idx_orders_status on public.orders(status);

create index if not exists idx_payments_store_id on public.payments(store_id);
create index if not exists idx_expenses_store_id on public.expenses(store_id);
create index if not exists idx_cash_movements_store_id on public.cash_movements(store_id);

create index if not exists idx_push_subs_store_id on public.push_subscriptions(store_id);
create index if not exists idx_push_subs_user_id on public.push_subscriptions(user_id);
create index if not exists idx_order_activity_logs_order_id on public.order_activity_logs(order_id);

-- ============================================================
-- 10. TRIGGERS & UPDATED_AT
-- ============================================================

drop trigger if exists set_stores_updated_at on public.stores;
create trigger set_stores_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

drop trigger if exists set_store_members_updated_at on public.store_members;
create trigger set_store_members_updated_at
before update on public.store_members
for each row execute function public.set_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_push_subs_updated_at on public.push_subscriptions;
create trigger set_push_subs_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

-- Update Cash Movement Triggers to carry store_id
create or replace function public.sync_payment_cash_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_client_name text;
  order_event_date date;
  order_store_id uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.cash_movements
    where source = 'payment'
      and source_id = old.id;

    perform public.recalculate_order_payment_status(old.order_id);
    return old;
  end if;

  select client_name, event_date, store_id
  into order_client_name, order_event_date, order_store_id
  from public.orders
  where id = new.order_id;

  -- Ensure payment record has store_id
  if new.store_id is null and order_store_id is not null then
    new.store_id = order_store_id;
  end if;

  insert into public.cash_movements (
    user_id,
    store_id,
    order_id,
    type,
    source,
    source_id,
    description,
    amount,
    movement_date,
    payment_method
  )
  values (
    new.user_id,
    coalesce(new.store_id, order_store_id),
    new.order_id,
    'income',
    'payment',
    new.id,
    coalesce(new.description, 'Pagamento') || ' - ' || coalesce(order_client_name, 'Cliente') || ' - Festa/Pedido em ' || coalesce(order_event_date::text, 'data não informada'),
    new.amount,
    new.payment_date,
    new.payment_method
  )
  on conflict (source, source_id)
  do update set
    user_id = excluded.user_id,
    store_id = excluded.store_id,
    order_id = excluded.order_id,
    type = excluded.type,
    description = excluded.description,
    amount = excluded.amount,
    movement_date = excluded.movement_date,
    payment_method = excluded.payment_method,
    updated_at = now();

  if tg_op = 'UPDATE' and old.order_id <> new.order_id then
    perform public.recalculate_order_payment_status(old.order_id);
  end if;

  perform public.recalculate_order_payment_status(new.order_id);
  return new;
end;
$$;

create or replace function public.sync_expense_cash_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.cash_movements
    where source = 'expense'
      and source_id = old.id;

    return old;
  end if;

  insert into public.cash_movements (
    user_id,
    store_id,
    order_id,
    type,
    source,
    source_id,
    description,
    amount,
    movement_date,
    payment_method
  )
  values (
    new.user_id,
    new.store_id,
    new.order_id,
    'expense',
    'expense',
    new.id,
    new.description,
    new.amount,
    new.expense_date,
    new.payment_method
  )
  on conflict (source, source_id)
  do update set
    user_id = excluded.user_id,
    store_id = excluded.store_id,
    order_id = excluded.order_id,
    type = excluded.type,
    description = excluded.description,
    amount = excluded.amount,
    movement_date = excluded.movement_date,
    payment_method = excluded.payment_method,
    updated_at = now();

  return new;
end;
$$;

-- ============================================================
-- 11. SECURITY DEFINER HELPER FUNCTIONS FOR RLS
-- ============================================================

create or replace function public.is_system_admin(check_user_id uuid default null)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.system_admins
    where user_id = coalesce(check_user_id, (select auth.uid()))
  );
$$;

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_members
    where store_id = target_store_id
      and user_id = (select auth.uid())
  ) or public.is_system_admin((select auth.uid()));
$$;

create or replace function public.is_store_admin(target_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_members
    where store_id = target_store_id
      and user_id = (select auth.uid())
      and role in ('owner', 'admin')
  ) or public.is_system_admin((select auth.uid()));
$$;

-- ============================================================
-- 12. ROW LEVEL SECURITY POLICIES
-- ============================================================

alter table public.system_admins enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.order_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.order_activity_logs enable row level security;

-- SYSTEM ADMINS
drop policy if exists "System admins can view admins" on public.system_admins;
create policy "System admins can view admins"
on public.system_admins for select to authenticated
using (public.is_system_admin((select auth.uid())));

drop policy if exists "System admins can manage admins" on public.system_admins;
create policy "System admins can manage admins"
on public.system_admins for all to authenticated
using (public.is_system_admin((select auth.uid())))
with check (public.is_system_admin((select auth.uid())));

-- STORES
drop policy if exists "System admins can manage all stores" on public.stores;
create policy "System admins can manage all stores"
on public.stores for all to authenticated
using (public.is_system_admin((select auth.uid())))
with check (public.is_system_admin((select auth.uid())));

drop policy if exists "Members can view their stores" on public.stores;
create policy "Members can view their stores"
on public.stores for select to authenticated
using (public.is_store_member(id));

drop policy if exists "Users can create a store" on public.stores;
create policy "Users can create a store"
on public.stores for insert to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Admins can update their store" on public.stores;
create policy "Admins can update their store"
on public.stores for update to authenticated
using (public.is_store_admin(id))
with check (public.is_store_admin(id));

-- STORE MEMBERS
drop policy if exists "Members can view store members" on public.store_members;
create policy "Members can view store members"
on public.store_members for select to authenticated
using (public.is_store_member(store_id));

drop policy if exists "Admins can manage store members" on public.store_members;
create policy "Admins can manage store members"
on public.store_members for all to authenticated
using (public.is_store_admin(store_id))
with check (public.is_store_admin(store_id));

-- CLIENTS
drop policy if exists "Members can manage clients" on public.clients;
create policy "Members can manage clients"
on public.clients for all to authenticated
using (public.is_store_member(store_id))
with check (public.is_store_member(store_id));

-- PRODUCTS
drop policy if exists "Members can manage products" on public.products;
create policy "Members can manage products"
on public.products for all to authenticated
using (public.is_store_member(store_id))
with check (public.is_store_member(store_id));

-- ORDERS
drop policy if exists "Users can manage own orders" on public.orders;
drop policy if exists "Members can manage store orders" on public.orders;
create policy "Members can manage store orders"
on public.orders for all to authenticated
using (
  (store_id is not null and public.is_store_member(store_id))
  or (store_id is null and user_id = (select auth.uid()))
)
with check (
  (store_id is not null and public.is_store_member(store_id))
  or (store_id is null and user_id = (select auth.uid()))
);

-- ORDER ITEMS
drop policy if exists "Members can manage order items" on public.order_items;
create policy "Members can manage order items"
on public.order_items for all to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        (o.store_id is not null and public.is_store_member(o.store_id))
        or (o.store_id is null and o.user_id = (select auth.uid()))
      )
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        (o.store_id is not null and public.is_store_member(o.store_id))
        or (o.store_id is null and o.user_id = (select auth.uid()))
      )
  )
);

-- PAYMENTS
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Users can insert own payments" on public.payments;
drop policy if exists "Users can update own payments" on public.payments;
drop policy if exists "Users can delete own payments" on public.payments;
drop policy if exists "Members can manage store payments" on public.payments;
create policy "Members can manage store payments"
on public.payments for all to authenticated
using (
  (store_id is not null and public.is_store_member(store_id))
  or (store_id is null and user_id = (select auth.uid()))
)
with check (
  (store_id is not null and public.is_store_member(store_id))
  or (store_id is null and user_id = (select auth.uid()))
);

-- EXPENSES
drop policy if exists "Users can view own expenses" on public.expenses;
drop policy if exists "Users can insert own expenses" on public.expenses;
drop policy if exists "Users can update own expenses" on public.expenses;
drop policy if exists "Users can delete own expenses" on public.expenses;
drop policy if exists "Members can manage store expenses" on public.expenses;
create policy "Members can manage store expenses"
on public.expenses for all to authenticated
using (
  (store_id is not null and public.is_store_member(store_id))
  or (store_id is null and user_id = (select auth.uid()))
)
with check (
  (store_id is not null and public.is_store_member(store_id))
  or (store_id is null and user_id = (select auth.uid()))
);

-- CASH MOVEMENTS
drop policy if exists "Users can view own cash movements" on public.cash_movements;
drop policy if exists "Users can insert own manual cash movements" on public.cash_movements;
drop policy if exists "Users can update own manual cash movements" on public.cash_movements;
drop policy if exists "Users can delete own manual cash movements" on public.cash_movements;

create policy "Members can view store cash movements"
on public.cash_movements for select to authenticated
using (
  (store_id is not null and public.is_store_member(store_id))
  or (store_id is null and user_id = (select auth.uid()))
);

create policy "Members can insert manual cash movements"
on public.cash_movements for insert to authenticated
with check (
  source = 'manual'
  and (
    (store_id is not null and public.is_store_member(store_id))
    or (store_id is null and user_id = (select auth.uid()))
  )
);

create policy "Members can update manual cash movements"
on public.cash_movements for update to authenticated
using (
  source = 'manual'
  and (
    (store_id is not null and public.is_store_member(store_id))
    or (store_id is null and user_id = (select auth.uid()))
  )
)
with check (
  source = 'manual'
  and (
    (store_id is not null and public.is_store_member(store_id))
    or (store_id is null and user_id = (select auth.uid()))
  )
);

create policy "Members can delete manual cash movements"
on public.cash_movements for delete to authenticated
using (
  source = 'manual'
  and (
    (store_id is not null and public.is_store_member(store_id))
    or (store_id is null and user_id = (select auth.uid()))
  )
);

-- PUSH SUBSCRIPTIONS
drop policy if exists "Users can manage own push subscriptions" on public.push_subscriptions;
create policy "Users can manage own push subscriptions"
on public.push_subscriptions for all to authenticated
using (
  user_id = (select auth.uid())
  and public.is_store_member(store_id)
)
with check (
  user_id = (select auth.uid())
  and public.is_store_member(store_id)
);

-- ACTIVITY LOGS
drop policy if exists "Members can view activity logs" on public.order_activity_logs;
create policy "Members can view activity logs"
on public.order_activity_logs for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_activity_logs.order_id
      and public.is_store_member(o.store_id)
  )
);

drop policy if exists "Members can insert activity logs" on public.order_activity_logs;
create policy "Members can insert activity logs"
on public.order_activity_logs for insert to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_activity_logs.order_id
      and public.is_store_member(o.store_id)
  )
);

-- STORE MEMBERS: Allow system admin full control
drop policy if exists "System admins can manage all store members" on public.store_members;
create policy "System admins can manage all store members"
on public.store_members for all to authenticated
using (public.is_system_admin((select auth.uid())))
with check (public.is_system_admin((select auth.uid())));

-- ============================================================
-- 13. SUPER ADMIN PLATFORM RPC FUNCTIONS
-- ============================================================

-- List all registered platform users with their store memberships and admin status
create or replace function public.admin_get_users()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  name text,
  is_admin boolean,
  stores jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem listar usuários.';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    coalesce(u.raw_user_meta_data->>'name', '')::text as name,
    exists(select 1 from public.system_admins sa where sa.user_id = u.id) as is_admin,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'store_id', s.id,
          'store_name', s.name,
          'role', sm.role
        ))
        from public.store_members sm
        join public.stores s on s.id = sm.store_id
        where sm.user_id = u.id
      ),
      '[]'::jsonb
    ) as stores
  from auth.users u
  order by u.created_at desc;
end;
$$;

-- Delete a user from auth.users (cascades to members, stores if single owner, etc.)
create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem excluir usuários.';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'Você não pode excluir sua própria conta enquanto estiver logado nela.';
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

-- Grant or revoke system admin role
create or replace function public.admin_toggle_system_admin(target_user_id uuid, make_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem alterar permissões de admin.';
  end if;

  if make_admin then
    insert into public.system_admins (user_id) values (target_user_id)
    on conflict (user_id) do nothing;
  else
    if target_user_id = (select auth.uid()) then
      raise exception 'Você não pode revogar seus próprios privilégios de administrador.';
    end if;
    delete from public.system_admins where user_id = target_user_id;
  end if;
end;
$$;

-- List all stores across the entire platform
create or replace function public.admin_get_all_stores()
returns table (
  id uuid,
  name text,
  slug text,
  phone text,
  document text,
  created_at timestamptz,
  members_count bigint,
  owner_email text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem visualizar todas as lojas.';
  end if;

  return query
  select
    s.id,
    s.name,
    s.slug,
    s.phone,
    s.document,
    s.created_at,
    (select count(*) from public.store_members sm where sm.store_id = s.id) as members_count,
    (
      select u.email::text
      from public.store_members sm
      join auth.users u on u.id = sm.user_id
      where sm.store_id = s.id and sm.role = 'owner'
      limit 1
    ) as owner_email
  from public.stores s
  order by s.created_at desc;
end;
$$;

-- Manually create a store and assign owner
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
  assigned_user_id uuid;
begin
  if not public.is_system_admin((select auth.uid())) then
    raise exception 'Acesso negado: apenas administradores do sistema podem criar lojas.';
  end if;

  assigned_user_id := coalesce(owner_user_id, (select auth.uid()));

  insert into public.stores (name, slug, phone, document)
  values (trim(store_name), nullif(trim(store_slug), ''), nullif(trim(store_phone), ''), nullif(trim(store_document), ''))
  returning id into new_id;

  insert into public.store_members (store_id, user_id, role)
  values (new_id, assigned_user_id, 'owner')
  on conflict (store_id, user_id) do nothing;

  return new_id;
end;
$$;

-- ============================================================
-- 14. SEED INITIAL SUPER ADMIN
-- ============================================================

create extension if not exists "pgcrypto";

do $$
declare
  admin_id uuid;
  admin_store_id uuid;
  inst_id uuid;
  id_is_uuid boolean;
begin
  -- Resolve valid instance_id
  select coalesce(instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
  into inst_id
  from auth.users
  where instance_id is not null
  limit 1;

  if inst_id is null then
    inst_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  -- Check if admin user already exists
  select id into admin_id from auth.users where email = 'admin@irisgestao.com';

  if admin_id is null then
    admin_id := gen_random_uuid();
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
      created_at,
      updated_at
    ) values (
      admin_id,
      inst_id,
      'admin@irisgestao.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Super Admin","store_name":"Loja Matriz Admin"}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now()
    );

    -- Ensure auth.identities has matching entry for GoTrue authentication
    if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'identities') then
      select (data_type = 'uuid') into id_is_uuid
      from information_schema.columns
      where table_schema = 'auth' and table_name = 'identities' and column_name = 'id';

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
        if coalesce(id_is_uuid, true) then
          execute 'insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) values ($1, $2, $3, $4, $5, now(), now(), now()) on conflict do nothing'
          using admin_id, admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'admin@irisgestao.com'), 'email', admin_id::text;
        else
          execute 'insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) values ($1, $2, $3, $4, $5, now(), now(), now()) on conflict do nothing'
          using admin_id::text, admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'admin@irisgestao.com'), 'email', admin_id::text;
        end if;
      else
        if coalesce(id_is_uuid, true) then
          execute 'insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values ($1, $2, $3, $4, now(), now(), now()) on conflict do nothing'
          using admin_id, admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'admin@irisgestao.com'), 'email';
        else
          execute 'insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values ($1, $2, $3, $4, now(), now(), now()) on conflict do nothing'
          using admin_id::text, admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'admin@irisgestao.com'), 'email';
        end if;
      end if;
    end if;
  end if;

  -- Ensure user is marked in system_admins
  insert into public.system_admins (user_id)
  values (admin_id)
  on conflict (user_id) do nothing;

  -- Ensure admin has a store for standard testing
  if not exists (select 1 from public.store_members where user_id = admin_id) then
    insert into public.stores (name, slug)
    values ('Loja Matriz Admin', 'admin-matriz')
    returning id into admin_store_id;

    insert into public.store_members (store_id, user_id, role)
    values (admin_store_id, admin_id, 'owner');
  end if;
end $$;
