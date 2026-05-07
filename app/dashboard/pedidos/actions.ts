'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createOrder, updateOrder, deleteOrder } from '@/lib/db/orders'
import { parseCurrencyInput } from '@/lib/formatters'

export async function createOrderAction(formData: FormData) {
  const client_name = formData.get('client_name') as string
  const total_amount_str = formData.get('total_amount') as string
  const estimated_cost_str = formData.get('estimated_cost') as string
  
  if (!client_name) {
    return { error: 'O nome do cliente é obrigatório.' }
  }

  const title = (formData.get('title') as string) || `Pedido de ${client_name}`
  const total_amount = total_amount_str ? parseCurrencyInput(total_amount_str) : 0
  
  if (total_amount < 0) {
    return { error: 'O valor total deve ser maior ou igual a zero.' }
  }

  const estimated_cost = estimated_cost_str ? parseCurrencyInput(estimated_cost_str) : null
  const event_date = formData.get('event_date') as string || null

  const input = {
    client_name,
    client_phone: formData.get('client_phone') as string || null,
    client_email: formData.get('client_email') as string || null,
    title,
    event_date,
    event_time: formData.get('event_time') as string || null,
    event_location: formData.get('event_location') as string || null,
    total_amount,
    estimated_cost,
    status: formData.get('status') as string || 'draft',
    notes: formData.get('notes') as string || null,
  }

  let orderId: string | null = null

  try {
    const order = await createOrder(input)
    if (!order?.id) {
      return { error: 'Erro ao criar o pedido. Tente novamente.' }
    }
    orderId = order.id
  } catch (err: any) {
    console.error('Erro real ao criar pedido:', err)
    return { error: 'Erro ao criar o pedido. Tente novamente.' }
  }

  redirect(`/dashboard/pedidos/${orderId}`)
}

export async function updateOrderAction(id: string, formData: FormData) {
  const client_name = formData.get('client_name') as string
  const total_amount_str = formData.get('total_amount') as string
  const estimated_cost_str = formData.get('estimated_cost') as string
  
  if (!client_name) {
    return { error: 'O nome do cliente é obrigatório.' }
  }

  const title = (formData.get('title') as string) || `Pedido de ${client_name}`
  const total_amount = total_amount_str ? parseCurrencyInput(total_amount_str) : 0
  
  if (total_amount < 0) {
    return { error: 'O valor total deve ser maior ou igual a zero.' }
  }

  const estimated_cost = estimated_cost_str ? parseCurrencyInput(estimated_cost_str) : null
  const event_date = formData.get('event_date') as string || null

  const input = {
    client_name,
    client_phone: formData.get('client_phone') as string || null,
    client_email: formData.get('client_email') as string || null,
    title,
    event_date,
    event_time: formData.get('event_time') as string || null,
    event_location: formData.get('event_location') as string || null,
    total_amount,
    estimated_cost,
    status: formData.get('status') as string || 'draft',
    notes: formData.get('notes') as string || null,
  }

  let success = false

  try {
    await updateOrder(id, input)
    success = true
  } catch (err: any) {
    console.error('Erro real ao atualizar pedido:', err)
    return { error: 'Erro ao atualizar o pedido. Tente novamente.' }
  }

  if (success) {
    redirect(`/dashboard/pedidos/${id}`)
  }
}

export async function deleteOrderAction(id: string) {
  let success = false
  try {
    await deleteOrder(id)
    success = true
  } catch (err: any) {
    console.error('Erro real ao excluir pedido:', err)
    return { error: 'Erro ao excluir o pedido. Tente novamente.' }
  }

  if (success) {
    redirect('/dashboard/pedidos')
  }
}

import { createPayment, updatePayment, deletePayment } from '@/lib/db/payments'

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

