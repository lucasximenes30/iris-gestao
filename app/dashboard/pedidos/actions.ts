'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createOrder, updateOrder, deleteOrder, type OrderItem } from '@/lib/db/orders'
import { createClientRecord } from '@/lib/db/clients'
import { getActiveStore } from '@/lib/db/stores'
import { parseCurrencyInput } from '@/lib/formatters'
import { createPayment, updatePayment, deletePayment } from '@/lib/db/payments'

export async function createOrderAction(formData: FormData) {
  const activeStore = await getActiveStore()
  const storeId = activeStore?.store?.id

  let client_id = formData.get('client_id') as string || null
  let client_name = (formData.get('client_name') as string)?.trim()
  const client_phone = (formData.get('client_phone') as string)?.trim() || null
  const client_email = (formData.get('client_email') as string)?.trim() || null
  
  if (!client_name && !client_id) {
    return { error: 'O nome do cliente é obrigatório.' }
  }

  // Se o cliente não existir no CRM ainda, cria automaticamente
  if (!client_id && storeId && client_name) {
    try {
      const newClient = await createClientRecord({
        store_id: storeId,
        name: client_name,
        phone: client_phone,
        email: client_email
      })
      if (newClient?.id) {
        client_id = newClient.id
      }
    } catch {
      // Continua mesmo se der erro no auto-cadastro de cliente
    }
  }

  // Geração de título inteligente se não preenchido
  let title = (formData.get('title') as string)?.trim()
  const total_amount_str = formData.get('total_amount') as string
  const estimated_cost_str = formData.get('estimated_cost') as string
  const delivery_fee_str = formData.get('delivery_fee') as string
  const discount_amount_str = formData.get('discount_amount') as string

  const total_amount = total_amount_str ? parseCurrencyInput(total_amount_str) : 0
  const estimated_cost = estimated_cost_str ? parseCurrencyInput(estimated_cost_str) : null
  const delivery_fee = delivery_fee_str ? parseCurrencyInput(delivery_fee_str) : 0
  const discount_amount = discount_amount_str ? parseCurrencyInput(discount_amount_str) : 0

  const delivery_type = (formData.get('delivery_type') as string) || 'pickup'
  const delivery_address = (formData.get('delivery_address') as string)?.trim() || null

  const event_date = (formData.get('event_date') as string)?.trim() || null
  const event_time = (formData.get('event_time') as string)?.trim() || null
  const event_location = (formData.get('event_location') as string)?.trim() || null

  const status = (formData.get('status') as string) || 'confirmed'
  const notes = (formData.get('notes') as string)?.trim() || null

  // Itens do pedido (JSON)
  let items: OrderItem[] = []
  const itemsJson = formData.get('items') as string
  if (itemsJson) {
    try {
      items = JSON.parse(itemsJson)
    } catch (e) {
      console.error('Erro ao fazer parse dos itens do pedido:', e)
    }
  }

  if (!title) {
    if (items.length > 0) {
      const summaryItems = items.map(i => i.name).slice(0, 2).join(' + ')
      title = `${client_name} — ${summaryItems}`
    } else {
      title = `Encomenda de ${client_name}`
    }
  }

  const input = {
    store_id: storeId,
    client_id,
    client_name,
    client_phone,
    client_email,
    title,
    event_date,
    event_time,
    event_location,
    delivery_type,
    delivery_address,
    delivery_fee,
    discount_amount,
    total_amount,
    estimated_cost,
    status,
    notes,
  }

  let orderId: string | null = null

  try {
    const order = await createOrder(input, items)
    if (!order?.id) {
      return { error: 'Erro ao criar o pedido. Tente novamente.' }
    }
    orderId = order.id

    // Registro opcional imediato do sinal (50% ou valor customizado)
    const registerInitialPayment = formData.get('register_initial_payment') === 'true'
    const initialPaymentAmountStr = formData.get('initial_payment_amount') as string
    const initialPaymentMethod = (formData.get('initial_payment_method') as string) || 'pix'

    if (registerInitialPayment && initialPaymentAmountStr) {
      const paymentAmount = parseCurrencyInput(initialPaymentAmountStr)
      if (paymentAmount > 0) {
        try {
          await createPayment({
            order_id: order.id,
            store_id: storeId,
            amount: paymentAmount,
            payment_method: initialPaymentMethod,
            payment_date: new Date().toISOString().split('T')[0],
            description: 'Sinal 50% de confirmação (Entrada)'
          })
        } catch (payErr) {
          console.error('Erro ao lançar sinal inicial automático:', payErr)
        }
      }
    }
  } catch (err: any) {
    console.error('Erro real ao criar pedido:', err)
    return { error: 'Erro ao criar o pedido. Tente novamente.' }
  }

  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard')
  if (client_id) revalidatePath(`/dashboard/clientes/${client_id}`)

  redirect(`/dashboard/pedidos/${orderId}`)
}

export async function updateOrderAction(id: string, formData: FormData) {
  const activeStore = await getActiveStore()
  const storeId = activeStore?.store?.id

  const client_id = formData.get('client_id') as string || null
  const client_name = (formData.get('client_name') as string)?.trim()
  const client_phone = (formData.get('client_phone') as string)?.trim() || null
  const client_email = (formData.get('client_email') as string)?.trim() || null
  
  if (!client_name) {
    return { error: 'O nome do cliente é obrigatório.' }
  }

  const title = (formData.get('title') as string)?.trim() || `Pedido de ${client_name}`
  const total_amount_str = formData.get('total_amount') as string
  const estimated_cost_str = formData.get('estimated_cost') as string
  const delivery_fee_str = formData.get('delivery_fee') as string
  const discount_amount_str = formData.get('discount_amount') as string

  const total_amount = total_amount_str ? parseCurrencyInput(total_amount_str) : 0
  const estimated_cost = estimated_cost_str ? parseCurrencyInput(estimated_cost_str) : null
  const delivery_fee = delivery_fee_str ? parseCurrencyInput(delivery_fee_str) : 0
  const discount_amount = discount_amount_str ? parseCurrencyInput(discount_amount_str) : 0

  const delivery_type = (formData.get('delivery_type') as string) || 'pickup'
  const delivery_address = (formData.get('delivery_address') as string)?.trim() || null

  const event_date = (formData.get('event_date') as string)?.trim() || null
  const event_time = (formData.get('event_time') as string)?.trim() || null
  const event_location = (formData.get('event_location') as string)?.trim() || null

  const status = (formData.get('status') as string) || 'confirmed'
  const notes = (formData.get('notes') as string)?.trim() || null

  // Itens do pedido (JSON)
  let items: OrderItem[] | undefined = undefined
  const itemsJson = formData.get('items') as string
  if (itemsJson) {
    try {
      items = JSON.parse(itemsJson)
    } catch (e) {
      console.error('Erro ao fazer parse dos itens do pedido na edição:', e)
    }
  }

  const input = {
    client_id,
    client_name,
    client_phone,
    client_email,
    title,
    event_date,
    event_time,
    event_location,
    delivery_type,
    delivery_address,
    delivery_fee,
    discount_amount,
    total_amount,
    estimated_cost,
    status,
    notes,
  }

  try {
    await updateOrder(id, input, items)
  } catch (err: any) {
    console.error('Erro real ao atualizar pedido:', err)
    return { error: 'Erro ao atualizar o pedido. Tente novamente.' }
  }

  revalidatePath(`/dashboard/pedidos/${id}`)
  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard')
  if (client_id) revalidatePath(`/dashboard/clientes/${client_id}`)

  redirect(`/dashboard/pedidos/${id}`)
}

export async function updateOrderStatusAction(id: string, newStatus: string) {
  try {
    await updateOrder(id, { status: newStatus })
    revalidatePath(`/dashboard/pedidos/${id}`)
    revalidatePath('/dashboard/pedidos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao atualizar status do pedido:', err)
    return { error: 'Não foi possível alterar o status.' }
  }
}

export async function deleteOrderAction(id: string) {
  try {
    await deleteOrder(id)
  } catch (err: any) {
    console.error('Erro real ao excluir pedido:', err)
    return { error: 'Erro ao excluir o pedido. Tente novamente.' }
  }

  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard/caixa')
  revalidatePath('/dashboard')
  redirect('/dashboard/pedidos')
}

export async function createPaymentAction(formData: FormData) {
  const order_id = formData.get('order_id') as string
  const amount_str = formData.get('amount') as string
  const payment_date = formData.get('payment_date') as string
  const payment_method = formData.get('payment_method') as string
  const description = formData.get('description') as string
  const notes = formData.get('notes') as string || null

  const amount = parseCurrencyInput(amount_str)

  if (!order_id || amount <= 0 || !payment_date || !description) {
    return { error: 'Preencha todos os campos obrigatórios corretamente.' }
  }

  try {
    await createPayment({
      order_id,
      amount,
      payment_date,
      payment_method,
      description,
      notes
    })
    
    revalidatePath(`/dashboard/pedidos/${order_id}`)
    revalidatePath(`/dashboard/pedidos`)
    revalidatePath(`/dashboard/caixa`)
    revalidatePath(`/dashboard`)
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao registrar pagamento:', err)
    return { error: 'Erro ao registrar o pagamento. Tente novamente.' }
  }
}

export async function updatePaymentAction(id: string, formData: FormData) {
  const order_id = formData.get('order_id') as string
  const amount_str = formData.get('amount') as string
  const payment_date = formData.get('payment_date') as string
  const payment_method = formData.get('payment_method') as string
  const description = formData.get('description') as string
  const notes = formData.get('notes') as string || null

  const amount = parseCurrencyInput(amount_str)

  if (!order_id || amount <= 0 || !payment_date || !description) {
    return { error: 'Preencha todos os campos obrigatórios corretamente.' }
  }

  try {
    await updatePayment(id, {
      amount,
      payment_date,
      payment_method,
      description,
      notes
    })
    
    revalidatePath(`/dashboard/pedidos/${order_id}`)
    revalidatePath(`/dashboard/pedidos`)
    revalidatePath(`/dashboard/caixa`)
    revalidatePath(`/dashboard`)
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao atualizar pagamento:', err)
    return { error: 'Erro ao atualizar o pagamento. Tente novamente.' }
  }
}

export async function deletePaymentAction(id: string, orderId: string) {
  try {
    await deletePayment(id)
    revalidatePath(`/dashboard/pedidos/${orderId}`)
    revalidatePath(`/dashboard/pedidos`)
    revalidatePath(`/dashboard/caixa`)
    revalidatePath(`/dashboard`)
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao excluir pagamento:', err)
    return { error: 'Erro ao excluir o pagamento. Tente novamente.' }
  }
}
