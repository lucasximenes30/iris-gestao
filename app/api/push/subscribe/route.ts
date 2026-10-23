import { NextRequest, NextResponse } from 'next/server'
import { savePushSubscription, removePushSubscription } from '@/lib/db/push-subscriptions'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { store_id, subscription } = body

    if (!store_id || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Parâmetros de inscrição inválidos' }, { status: 400 })
    }

    const userAgent = req.headers.get('user-agent') || undefined

    const record = await savePushSubscription({
      store_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent,
    })

    return NextResponse.json({ success: true, id: record.id })
  } catch (err: any) {
    console.error('Erro ao salvar push subscription:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint não fornecido' }, { status: 400 })
    }

    await removePushSubscription(endpoint)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Erro ao remover push subscription:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
