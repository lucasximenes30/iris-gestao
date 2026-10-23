import { createClient } from '@/utils/supabase/server'

export type CashMovement = {
  id: string
  store_id?: string
  user_id: string
  order_id?: string | null
  type: 'income' | 'expense'
  source: 'payment' | 'expense' | 'manual'
  source_id?: string | null
  description: string
  amount: number
  movement_date: string
  payment_method?: string | null
  created_at: string
  updated_at: string
}

export async function getCashMovements(filters?: {
  storeId?: string
  startDate?: string
  endDate?: string
  type?: 'income' | 'expense'
  source?: 'payment' | 'expense' | 'manual'
  limit?: number
}) {
  const supabase = await createClient()
  let query = supabase
    .from('cash_movements')
    .select('*')

  if (filters?.storeId) {
    query = query.eq('store_id', filters.storeId)
  }

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.source) {
    query = query.eq('source', filters.source)
  }

  if (filters?.startDate) {
    query = query.gte('movement_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('movement_date', filters.endDate)
  }

  query = query
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
    
  const { data, error } = await query
  if (error) throw error
  return (data || []) as CashMovement[]
}

export async function createManualCashMovement(input: {
  store_id?: string
  type: 'income' | 'expense'
  description: string
  amount: number
  movement_date?: string
  payment_method?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  let storeId = input.store_id
  if (!storeId) {
    const { data: member } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (member) storeId = member.store_id
  }

  const { data, error } = await supabase
    .from('cash_movements')
    .insert([{
      ...input,
      user_id: user.id,
      store_id: storeId,
      source: 'manual',
      movement_date: input.movement_date || new Date().toISOString().split('T')[0]
    }])
    .select()
    .single()

  if (error) throw error
  return data as CashMovement
}

export async function updateManualCashMovement(id: string, input: any) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_movements')
    .update(input)
    .eq('id', id)
    .eq('source', 'manual')
    .select()
    .single()

  if (error) throw error
  return data as CashMovement
}

export async function deleteManualCashMovement(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cash_movements')
    .delete()
    .eq('id', id)
    .eq('source', 'manual')

  if (error) throw error
  return true
}
