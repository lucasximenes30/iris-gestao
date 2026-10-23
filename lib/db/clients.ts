import { createClient } from '@/utils/supabase/server'

export type Client = {
  id: string
  store_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getClients(storeId: string, filters?: { search?: string }) {
  const supabase = await createClient()
  let query = supabase
    .from('clients')
    .select('*')
    .eq('store_id', storeId)

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('name', { ascending: true })

  if (error) throw error
  return data as Client[]
}

export async function getClientById(id: string, storeId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (error) throw error
  return data as Client
}

export async function getClientWithOrders(id: string, storeId: string) {
  const supabase = await createClient()
  
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (clientError || !client) throw clientError

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, title, event_date, total_amount, status, payment_status, created_at')
    .eq('client_id', id)
    .eq('store_id', storeId)
    .order('event_date', { ascending: false })

  if (ordersError) throw ordersError

  // Total gasto e pendências
  let totalPurchased = 0
  let pendingAmount = 0

  orders?.forEach((o: any) => {
    if (o.status !== 'cancelled') {
      totalPurchased += Number(o.total_amount) || 0
      if (o.payment_status === 'unpaid' || o.payment_status === 'partial') {
        // Calculamos estimativa ou buscamos pagamentos
      }
    }
  })

  return {
    ...client,
    orders: orders || [],
    totalPurchased
  }
}

export async function createClientRecord(input: {
  store_id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .insert([input])
    .select()
    .single()

  if (error) throw error
  return data as Client
}

export async function updateClientRecord(
  id: string,
  storeId: string,
  input: Partial<Pick<Client, 'name' | 'phone' | 'email' | 'address' | 'notes'>>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .update(input)
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) throw error
  return data as Client
}

export async function deleteClientRecord(id: string, storeId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('store_id', storeId)

  if (error) throw error
  return true
}
