import { NextRequest, NextResponse } from 'next/server'
import { sendPushToSubscription } from '@/lib/push/web-push'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { subscription } = body

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Inscrição push inválida' }, { status: 400 })
    }

    const res = await sendPushToSubscription(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      {
        title: '🎉 Iris Gestão: Notificações Ativas!',
        body: 'Seu dispositivo está pronto para receber a agenda diária e alertas de encomendas.',
        url: '/dashboard/pedidos',
      }
    )

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Erro ao enviar notificação de teste:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
