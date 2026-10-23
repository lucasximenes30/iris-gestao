import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToSubscription } from '@/lib/push/web-push'

export const dynamic = 'force-dynamic'

// Initialize Supabase admin/anon client for cron processing
function getCronSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  return createClient(url, key)
}

function verifyCronSecret(req: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) return true // Allow if no secret is configured yet

  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.replace(/^Bearer\s+/i, '') === expectedSecret) {
    return true
  }

  const querySecret = req.nextUrl.searchParams.get('secret')
  if (querySecret && querySecret === expectedSecret) {
    return true
  }

  return false
}

export async function GET(req: NextRequest) {
  return handleDispatch(req)
}

export async function POST(req: NextRequest) {
  return handleDispatch(req)
}

async function handleDispatch(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Acesso não autorizado. Secret inválido.' }, { status: 401 })
  }

  const supabase = getCronSupabase()

  try {
    // 1. Fetch stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, timezone, settings')

    if (storesError) throw storesError

    let totalNotificationsSent = 0
    const summary: any[] = []

    // Current date and day of week in Brazil timezone (America/Sao_Paulo / America/Fortaleza)
    const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const dayOfWeek = nowInTz.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isSunday = dayOfWeek === 0

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

    // Upcoming week range (Monday through Sunday) for Sunday weekly planning
    const nextMonday = new Date(nowInTz)
    nextMonday.setDate(nextMonday.getDate() + 1)
    const nextMondayStr = nextMonday.toISOString().slice(0, 10)

    const nextSunday = new Date(nowInTz)
    nextSunday.setDate(nextSunday.getDate() + 7)
    const nextSundayStr = nextSunday.toISOString().slice(0, 10)

    for (const store of (stores || [])) {
      // Push subscriptions for this store
      const { data: subscriptions, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('store_id', store.id)

      if (subsError || !subscriptions || subscriptions.length === 0) {
        summary.push({ store: store.name, subscribers: 0, sent: 0 })
        continue
      }

      let storeSent = 0

      // 2. DAILY NOTIFICATION: Orders scheduled for TODAY
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('id, client_name, title, event_time, status')
        .eq('store_id', store.id)
        .eq('event_date', today)
        .not('status', 'in', '("cancelled","completed")')

      if (!todayError && todayOrders && todayOrders.length > 0) {
        const orderCount = todayOrders.length
        const clientNames = todayOrders.map((o) => o.client_name).filter(Boolean)
        const preview = clientNames.slice(0, 3).join(', ') + (clientNames.length > 3 ? '...' : '')

        const dailyPayload = {
          title: `🎂 ${store.name}: ${orderCount} encomenda(s) hoje!`,
          body: `Clientes: ${preview}. Toque para conferir horários e detalhes de entrega.`,
          url: '/dashboard/pedidos',
          tag: `daily-agenda-${today}`,
        }

        for (const sub of subscriptions) {
          const res = await sendPushToSubscription(sub, dailyPayload)
          if (res.success) {
            storeSent++
            totalNotificationsSent++
          }
        }
      }

      // 3. SUNDAY WEEKLY NOTIFICATION: Agenda for the upcoming week
      if (isSunday) {
        const { data: weekOrders, error: weekError } = await supabase
          .from('orders')
          .select('id, client_name, title, event_date, status')
          .eq('store_id', store.id)
          .gte('event_date', nextMondayStr)
          .lte('event_date', nextSundayStr)
          .not('status', 'in', '("cancelled","completed")')

        if (!weekError && weekOrders && weekOrders.length > 0) {
          const weekCount = weekOrders.length
          const weeklyPayload = {
            title: `📅 ${store.name}: Agenda da Semana (${weekCount} encomendas)`,
            body: `Planeje sua produção! Você tem ${weekCount} encomenda(s) agendadas para esta semana. Toque para ver o calendário.`,
            url: '/dashboard/pedidos',
            tag: `weekly-agenda-${today}`,
          }

          for (const sub of subscriptions) {
            const res = await sendPushToSubscription(sub, weeklyPayload)
            if (res.success) {
              storeSent++
              totalNotificationsSent++
            }
          }
        }
      }

      summary.push({
        store: store.name,
        isSunday,
        subscribers: subscriptions.length,
        sent: storeSent,
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dateChecked: today,
      isSunday,
      totalNotificationsSent,
      summary,
    })
  } catch (err: any) {
    console.error('Erro na execução do Cron Dispatch:', err)
    return NextResponse.json({ error: err.message || 'Erro no processamento do cron' }, { status: 500 })
  }
}
