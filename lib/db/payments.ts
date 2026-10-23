import { createClient } from '@/utils/supabase/server'
import { getOrderById } from './orders'

export type Payment = {
  id: string
  store_id?: string
  user_id: string
  order_id: string
  amount: number
  payment_date: string
  payment_method: string
  description: string
  notes?: string | null
  created_at: string
  updated_at: string
}

export async function getPaymentsByOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('payment_date', { ascending: false })
    
  if (error) throw error
  return (data || []) as Payment[]
}

export async function getPaymentById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  return data as Payment
}

export async function createPayment(input: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Verifica se o pedido existe e obtém store_id
  const order = await getOrderById(input.order_id)
  if (!order) {
    throw new Error('Pedido não encontrado ou sem permissão.')
  }

  const storeId = input.store_id || order.store_id || null

  const { data, error } = await supabase
    .from('payments')
    .insert([{ ...input, user_id: user.id, store_id: storeId }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePayment(id: string, input: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('payments')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePayment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
