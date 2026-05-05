create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  client_name text not null,
  client_phone text,
  client_email text,

  title text,
  event_date date not null,
  event_time time,
  event_location text,

  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  estimated_cost numeric(12,2) check (estimated_cost is null or estimated_cost >= 0),

  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'completed', 'cancelled')),

  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid', 'overpaid')),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,

  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null default 'pix',
  description text not null default 'Pagamento do pedido',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,

  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  category text not null default 'outros',
  payment_method text not null default 'pix',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,

  type text not null check (type in ('income', 'expense')),
  source text not null check (source in ('payment', 'expense', 'manual')),
  source_id uuid,

  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  movement_date date not null default current_date,
  payment_method text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source, source_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_event_date on public.orders(event_date);
create index if not exists idx_orders_payment_status on public.orders(payment_status);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_payments_payment_date on public.payments(payment_date);

create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_order_id on public.expenses(order_id);
create index if not exists idx_expenses_expense_date on public.expenses(expense_date);

create index if not exists idx_cash_movements_user_id on public.cash_movements(user_id);
create index if not exists idx_cash_movements_order_id on public.cash_movements(order_id);
create index if not exists idx_cash_movements_date on public.cash_movements(movement_date);
create index if not exists idx_cash_movements_type on public.cash_movements(type);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

drop trigger if exists set_cash_movements_updated_at on public.cash_movements;
create trigger set_cash_movements_updated_at
before update on public.cash_movements
for each row
execute function public.set_updated_at();

-- ============================================================
-- PAYMENT STATUS RECALCULATION
-- ============================================================

create or replace function public.recalculate_order_payment_status(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_total numeric(12,2);
  paid_total numeric(12,2);
begin
  select total_amount
  into order_total
  from public.orders
  where id = target_order_id;

  if order_total is null then
    return;
  end if;

  select coalesce(sum(amount), 0)
  into paid_total
  from public.payments
  where order_id = target_order_id;

  update public.orders
  set
    payment_status = case
      when paid_total <= 0 then 'unpaid'
      when paid_total < order_total then 'partial'
      when paid_total = order_total then 'paid'
      else 'overpaid'
    end,
    updated_at = now()
  where id = target_order_id;
end;
$$;

-- ============================================================
-- PAYMENT → CASH MOVEMENT SYNC
-- ============================================================

create or replace function public.sync_payment_cash_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_client_name text;
  order_event_date date;
begin
  if tg_op = 'DELETE' then
    delete from public.cash_movements
    where source = 'payment'
      and source_id = old.id;

    perform public.recalculate_order_payment_status(old.order_id);
    return old;
  end if;

  select client_name, event_date
  into order_client_name, order_event_date
  from public.orders
  where id = new.order_id;

  insert into public.cash_movements (
    user_id,
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

drop trigger if exists sync_payment_cash_movement_trigger on public.payments;
create trigger sync_payment_cash_movement_trigger
after insert or update or delete on public.payments
for each row
execute function public.sync_payment_cash_movement();

-- ============================================================
-- EXPENSE → CASH MOVEMENT SYNC
-- ============================================================

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

drop trigger if exists sync_expense_cash_movement_trigger on public.expenses;
create trigger sync_expense_cash_movement_trigger
after insert or update or delete on public.expenses
for each row
execute function public.sync_expense_cash_movement();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.cash_movements enable row level security;

-- orders
drop policy if exists "Users can manage own orders" on public.orders;
create policy "Users can manage own orders"
on public.orders
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- payments
drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
on public.payments
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own payments" on public.payments;
create policy "Users can insert own payments"
on public.payments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.orders
    where orders.id = payments.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own payments" on public.payments;
create policy "Users can update own payments"
on public.payments
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.orders
    where orders.id = payments.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own payments" on public.payments;
create policy "Users can delete own payments"
on public.payments
for delete
to authenticated
using (auth.uid() = user_id);

-- expenses
drop policy if exists "Users can view own expenses" on public.expenses;
create policy "Users can view own expenses"
on public.expenses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own expenses" on public.expenses;
create policy "Users can insert own expenses"
on public.expenses
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    order_id is null
    or exists (
      select 1
      from public.orders
      where orders.id = expenses.order_id
        and orders.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update own expenses" on public.expenses;
create policy "Users can update own expenses"
on public.expenses
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    order_id is null
    or exists (
      select 1
      from public.orders
      where orders.id = expenses.order_id
        and orders.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can delete own expenses" on public.expenses;
create policy "Users can delete own expenses"
on public.expenses
for delete
to authenticated
using (auth.uid() = user_id);

-- cash_movements
drop policy if exists "Users can view own cash movements" on public.cash_movements;
create policy "Users can view own cash movements"
on public.cash_movements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own manual cash movements" on public.cash_movements;
create policy "Users can insert own manual cash movements"
on public.cash_movements
for insert
to authenticated
with check (
  auth.uid() = user_id
  and source = 'manual'
);

drop policy if exists "Users can update own manual cash movements" on public.cash_movements;
create policy "Users can update own manual cash movements"
on public.cash_movements
for update
to authenticated
using (
  auth.uid() = user_id
  and source = 'manual'
)
with check (
  auth.uid() = user_id
  and source = 'manual'
);

drop policy if exists "Users can delete own manual cash movements" on public.cash_movements;
create policy "Users can delete own manual cash movements"
on public.cash_movements
for delete
to authenticated
using (
  auth.uid() = user_id
  and source = 'manual'
);
