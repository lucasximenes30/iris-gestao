import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToSubscription, type PushPayload } from '@/lib/push/web-push'

export const dynamic = 'force-dynamic'

type DispatchStore = {
  store_id: string
  store_name: string
  settings: Record<string, unknown> | null
  subscriptions: { endpoint: string; p256dh: string; auth: string }[]
  today_orders: { id: string; client_name: string | null; event_time: string | null }[]
  week_orders_count: number
}

const TIMEZONE = 'America/Sao_Paulo'

/** Data de hoje (YYYY-MM-DD) e dia da semana no fuso do Brasil, independente do fuso do servidor. */
function getLocalToday() {
  const now = new Date()
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' }).format(now)
  return { today, isSunday: weekday === 'Sun' }
}

/** Soma dias a uma data YYYY-MM-DD usando aritmética UTC pura (sem desvio de fuso). */
function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

function getCronSecretFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader) return authHeader.replace(/^Bearer\s+/i, '')
  return req.nextUrl.searchParams.get('secret')
}

export async function GET(req: NextRequest) {
  return handleDispatch(req)
}

export async function POST(req: NextRequest) {
  return handleDispatch(req)
}

async function handleDispatch(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
  const providedSecret = getCronSecretFromRequest(req)

  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado no servidor.' }, { status: 500 })
  }
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Acesso não autorizado. Secret inválido.' }, { status: 401 })
  }

  // Cliente sem sessão: o acesso aos dados é liberado pelas RPCs SECURITY DEFINER,
  // que validam o mesmo segredo no banco (sem service_role).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { today, isSunday } = getLocalToday()
  const weekStart = addDays(today, 1) // segunda
  const weekEnd = addDays(today, 7)   // domingo seguinte

  const { data, error } = await supabase.rpc('cron_get_dispatch_data', {
    p_secret: providedSecret,
    p_today: today,
    p_week_start: weekStart,
    p_week_end: weekEnd,
  })

  if (error) {
    console.error('Erro ao buscar dados do cron:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const removeExpired = async (endpoint: string) => {
    await supabase.rpc('cron_remove_push_subscription', { p_secret: providedSecret, p_endpoint: endpoint })
  }

  const stores = (data || []) as DispatchStore[]
  let totalNotificationsSent = 0
  const summary: Record<string, unknown>[] = []

  for (const store of stores) {
    const settings = store.settings || {}
    const notifications: PushPayload[] = []

    // Resumo diário (todos os dias)
    if (settings.notify_daily !== false && store.today_orders.length > 0) {
      const count = store.today_orders.length
      const names = store.today_orders.map((o) => o.client_name).filter(Boolean) as string[]
      const preview = names.slice(0, 3).join(', ') + (names.length > 3 ? '...' : '')
      notifications.push({
        title: `🎂 ${store.store_name}: ${count} encomenda(s) hoje!`,
        body: `Clientes: ${preview}. Toque para conferir horários e detalhes de entrega.`,
        url: '/dashboard/pedidos',
        tag: `daily-agenda-${today}`,
      })
    }

    // Agenda da semana (somente domingo) — enviada mesmo com semana vazia, para ela saber
    if (isSunday && settings.notify_weekly !== false) {
      const count = Number(store.week_orders_count || 0)
      notifications.push({
        title: `📅 ${store.store_name}: Agenda da semana`,
        body:
          count > 0
            ? `Você tem ${count} encomenda(s) de segunda a domingo. Toque para planejar a produção.`
            : 'Nenhuma encomenda agendada para esta semana até agora.',
        url: '/dashboard/pedidos',
        tag: `weekly-agenda-${today}`,
      })
    }

    let sent = 0
    for (const payload of notifications) {
      for (const sub of store.subscriptions) {
        const res = await sendPushToSubscription(sub, payload, removeExpired)
        if (res.success) sent++
      }
    }
    totalNotificationsSent += sent

    summary.push({
      store: store.store_name,
      subscribers: store.subscriptions.length,
      ordersToday: store.today_orders.length,
      ordersThisWeek: isSunday ? store.week_orders_count : undefined,
      sent,
    })
  }

  return NextResponse.json({
    success: true,
    dateChecked: today,
    isSunday,
    storesWithSubscribers: stores.length,
    totalNotificationsSent,
    summary,
  })
}
