import { createClient } from '@/utils/supabase/server'

export type PushSubscriptionRecord = {
  id: string
  store_id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
  updated_at: string
}

export async function savePushSubscription(input: {
  store_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      [
        {
          store_id: input.store_id,
          user_id: user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.user_agent || null,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'endpoint' }
    )
    .select()
    .single()

  if (error) throw error
  return data as PushSubscriptionRecord
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) throw error
}

export async function getStorePushSubscriptions(storeId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('store_id', storeId)

  if (error) throw error
  return (data || []) as PushSubscriptionRecord[]
}
