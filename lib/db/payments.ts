import { createClient } from '@/utils/supabase/server'
import { getOrderById } from './orders'

export async function getPaymentsByOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('payment_date', { ascending: false })
    
  if (error) throw error
  return data
}

export async function getPaymentById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  return data
}

export async function createPayment(input: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Verifica se o pedido pertence ao usuário
  const order = await getOrderById(input.order_id)
  if (!order || order.user_id !== user.id) {
    throw new Error('Pedido não encontrado ou sem permissão.')
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([{ ...input, user_id: user.id }])
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
    // RLS já garante que só edita do próprio usuário, mas explicitamos:
    .eq('user_id', user.id)
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
    .eq('user_id', user.id)

  if (error) throw error
  return true
}
