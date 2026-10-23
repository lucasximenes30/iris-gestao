import { createClient } from '@/utils/supabase/server'

export type OrderItem = {
  id?: string
  order_id?: string
  product_id?: string | null
  name: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string | null
}

export type Order = {
  id: string
  store_id?: string
  user_id: string
  client_id?: string | null
  client_name: string
  client_phone?: string | null
  client_email?: string | null
  title: string
  event_date?: string | null
  event_time?: string | null
  event_location?: string | null
  delivery_type?: 'pickup' | 'delivery'
  delivery_address?: string | null
  delivery_fee?: number
  discount_amount?: number
  total_amount: number
  estimated_cost?: number | null
  status: string
  payment_status: string
  notes?: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
  clients?: any
}

export async function getOrders(filters?: {
  storeId?: string
  search?: string
  status?: string
  payment_status?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  const supabase = await createClient()
  let query = supabase.from('orders').select('*, order_items(*)')

  if (filters?.storeId) {
    query = query.eq('store_id', filters.storeId)
  }

  if (filters?.search) {
    query = query.or(`client_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%`)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.payment_status) {
    query = query.eq('payment_status', filters.payment_status)
  }

  if (filters?.startDate) {
    query = query.gte('event_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('event_date', filters.endDate)
  }

  query = query.order('event_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query
    
  if (error) throw error
  return (data || []) as Order[]
}

export async function getOrderById(id: string, storeId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('orders')
    .select('*, order_items(*), clients(*)')
    .eq('id', id)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query.single()
    
  if (error) throw error
  return data as Order
}

export async function createOrder(input: any, items?: OrderItem[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Se não foi passado store_id, busca do usuário
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

  const { data: order, error } = await supabase
    .from('orders')
    .insert([{ ...input, user_id: user.id, store_id: storeId }])
    .select()
    .single()

  if (error) throw error

  // Inserção dos itens do pedido se fornecidos
  if (items && items.length > 0 && order?.id) {
    const itemsToInsert = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id || null,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price || (item.quantity * item.unit_price),
      notes: item.notes || null
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Erro ao inserir itens do pedido:', itemsError)
    }
  }

  // Registra atividade
  if (order?.id && storeId) {
    try {
      await supabase.from('order_activity_logs').insert([{
        order_id: order.id,
        user_id: user.id,
        action: 'created',
        details: { title: order.title, total_amount: order.total_amount }
      }])
    } catch {
      // Ignora erro de log para não abortar a criação do pedido
    }
  }

  return order
}

export async function updateOrder(id: string, input: any, items?: OrderItem[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: order, error } = await supabase
    .from('orders')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Se foram enviados itens para atualização completa
  if (items && Array.isArray(items)) {
    // Remove itens anteriores
    await supabase.from('order_items').delete().eq('order_id', id)

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        order_id: id,
        product_id: item.product_id || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price || (item.quantity * item.unit_price),
        notes: item.notes || null
      }))

      await supabase.from('order_items').insert(itemsToInsert)
    }
  }

  // Log de alteração
  if (user && order) {
    try {
      await supabase.from('order_activity_logs').insert([{
        order_id: id,
        user_id: user.id,
        action: 'updated',
        details: { status: input.status, total_amount: input.total_amount }
      }])
    } catch {
      // Ignora erro de log
    }
  }

  return order
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
