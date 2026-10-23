import { createClient } from '@/utils/supabase/server'

export type Expense = {
  id: string
  store_id?: string
  user_id: string
  order_id?: string | null
  description: string
  amount: number
  expense_date: string
  category: string
  payment_method: string
  notes?: string | null
  created_at: string
  updated_at: string
}

export async function getExpenses(filters?: {
  storeId?: string
  category?: string
  startDate?: string
  endDate?: string
  orderId?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('expenses')
    .select('*, orders(title, client_name)')

  if (filters?.storeId) {
    query = query.eq('store_id', filters.storeId)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.orderId) {
    query = query.eq('order_id', filters.orderId)
  }

  if (filters?.startDate) {
    query = query.gte('expense_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('expense_date', filters.endDate)
  }

  const { data, error } = await query
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return (data || []) as (Expense & { orders?: { title: string; client_name: string } | null })[]
}

export async function getExpenseById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Expense
}

export async function getExpensesByOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('order_id', orderId)
    .order('expense_date', { ascending: false })
    
  if (error) throw error
  return (data || []) as Expense[]
}

export async function createExpense(input: any) {
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
    .from('expenses')
    .insert([{ ...input, user_id: user.id, store_id: storeId }])
    .select()
    .single()

  if (error) throw error
  return data as Expense
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
  return data as Expense
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
