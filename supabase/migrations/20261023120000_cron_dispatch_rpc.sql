-- ============================================================
-- MIGRATION: 20261023120000_cron_dispatch_rpc.sql
-- Permite que a rota /api/cron/dispatch leia as agendas e as
-- inscrições push de todas as lojas SEM usar a service_role key.
--
-- A rota roda sem sessão de usuário (chamada pelo cron-job.org),
-- então o RLS bloqueia tudo. Estas funções SECURITY DEFINER só
-- liberam os dados se receberem o segredo correto, que fica
-- guardado num schema privado (não exposto pela API).
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Valida o segredo do cron
create or replace function private.is_valid_cron_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_secret is not null
    and exists (
      select 1 from private.app_config
      where key = 'cron_secret' and value = p_secret
    );
$$;

-- Retorna, por loja: inscrições push, pedidos do dia e pedidos da semana
create or replace function public.cron_get_dispatch_data(
  p_secret text,
  p_today date,
  p_week_start date,
  p_week_end date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_cron_secret(p_secret) then
    raise exception 'Segredo do cron inválido' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'store_id', s.id,
      'store_name', s.name,
      'settings', s.settings,
      'subscriptions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth
        )), '[]'::jsonb)
        from public.push_subscriptions ps
        where ps.store_id = s.id
      ),
      'today_orders', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', o.id, 'client_name', o.client_name, 'event_time', o.event_time
        ) order by o.event_time nulls last), '[]'::jsonb)
        from public.orders o
        where o.store_id = s.id
          and o.event_date = p_today
          and o.status not in ('cancelled', 'completed', 'draft')
      ),
      'week_orders_count', (
        select count(*)
        from public.orders o
        where o.store_id = s.id
          and o.event_date between p_week_start and p_week_end
          and o.status not in ('cancelled', 'completed', 'draft')
      )
    ))
    from public.stores s
    where exists (select 1 from public.push_subscriptions ps where ps.store_id = s.id)
  ), '[]'::jsonb);
end;
$$;

-- Remove inscrições expiradas (endpoint retornou 404/410)
create or replace function public.cron_remove_push_subscription(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_cron_secret(p_secret) then
    raise exception 'Segredo do cron inválido' using errcode = '42501';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke all on function public.cron_get_dispatch_data(text, date, date, date) from public;
revoke all on function public.cron_remove_push_subscription(text, text) from public;
grant execute on function public.cron_get_dispatch_data(text, date, date, date) to anon, authenticated;
grant execute on function public.cron_remove_push_subscription(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- IMPORTANTE: o valor do segredo NÃO fica neste arquivo (ele vai
-- para o GitHub). Rode separadamente no SQL Editor, com o mesmo
-- valor da variável CRON_SECRET:
--
--   insert into private.app_config (key, value)
--   values ('cron_secret', 'SEU_CRON_SECRET')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
-- ------------------------------------------------------------
