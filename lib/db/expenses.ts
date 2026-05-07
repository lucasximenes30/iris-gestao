import { createClient } from '@/utils/supabase/server'

export async function getExpenses() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    
  if (error) throw error
  return data
}

export async function getExpensesByOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('order_id', orderId)
    .order('expense_date', { ascending: false })
    
  if (error) throw error
  return data
}

export async function createExpense(input: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('expenses')
    .insert([{ ...input, user_id: user.id }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateExpense(id: string, input: any) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
