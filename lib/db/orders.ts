import { createClient } from '@/utils/supabase/server'

export async function getOrders(filters?: { search?: string; status?: string; payment_status?: string }) {
  const supabase = await createClient()
  let query = supabase.from('orders').select('*')

  if (filters?.search) {
    query = query.or(`client_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%`)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.payment_status) {
    query = query.eq('payment_status', filters.payment_status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
    
  if (error) throw error
  return data
}

export async function getOrderById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  return data
}

export async function createOrder(input: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('orders')
    .insert([{ ...input, user_id: user.id }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateOrder(id: string, input: any) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteOrder(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
