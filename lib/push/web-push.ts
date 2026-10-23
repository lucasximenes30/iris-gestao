import webpush from 'web-push'
import { getStorePushSubscriptions, removePushSubscription, type PushSubscriptionRecord } from '@/lib/db/push-subscriptions'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:contato@irisgestao.com'

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
}

export async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  onExpired: (endpoint: string) => Promise<void> = removePushSubscription
) {
  if (!publicKey || !privateKey) {
    console.warn('VAPID keys não configuradas. Pulando envio de push.')
    return { success: false, error: 'VAPID não configurado' }
  }

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  }

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao enviar push notification:', err.statusCode, err.message)
    // If subscription is expired or unsubscribed, remove from database
    if (err.statusCode === 404 || err.statusCode === 410) {
      try {
        await onExpired(sub.endpoint)
      } catch (cleanErr) {
        console.error('Erro ao remover subscription expirada:', cleanErr)
      }
    }
    return { success: false, error: err.message }
  }
}

export async function sendPushToStore(storeId: string, payload: PushPayload) {
  const subscriptions = await getStorePushSubscriptions(storeId)
  if (subscriptions.length === 0) return { sent: 0, total: 0 }

  let sent = 0
  for (const sub of subscriptions) {
    const res = await sendPushToSubscription(sub, payload)
    if (res.success) sent++
  }

  return { sent, total: subscriptions.length }
}
