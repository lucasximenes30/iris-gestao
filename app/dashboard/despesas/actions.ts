'use server'

import { revalidatePath } from 'next/cache'
import { createExpense, updateExpense, deleteExpense } from '@/lib/db/expenses'
import { getActiveStore } from '@/lib/db/stores'
import { parseCurrencyInput, getTodayISO } from '@/lib/formatters'

export async function createExpenseAction(formData: FormData) {
  const active = await getActiveStore()
  const storeId = active?.store?.id

  const description = formData.get('description') as string
  const rawAmount = formData.get('amount') as string
  const expense_date = formData.get('expense_date') as string
  const category = (formData.get('category') as string) || 'outros'
  const payment_method = (formData.get('payment_method') as string) || 'pix'
  const notes = (formData.get('notes') as string)?.trim() || null
  const order_id = (formData.get('order_id') as string)?.trim() || null

  if (!description || description.trim().length === 0) {
    return { error: 'A descrição da despesa é obrigatória.' }
  }

  const amount = parseCurrencyInput(rawAmount)
  if (amount <= 0) {
    return { error: 'O valor da despesa deve ser maior que zero.' }
  }

  try {
    await createExpense({
      store_id: storeId,
      description: description.trim(),
      amount,
      expense_date: expense_date || getTodayISO(),
      category,
      payment_method,
      notes,
      order_id: order_id || null,
    })

    revalidatePath('/dashboard/despesas')
    revalidatePath('/dashboard/caixa')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao cadastrar despesa:', err)
    return { error: err.message || 'Erro ao cadastrar despesa.' }
  }
}

export async function updateExpenseAction(expenseId: string, formData: FormData) {
  const description = formData.get('description') as string
  const rawAmount = formData.get('amount') as string
  const expense_date = formData.get('expense_date') as string
  const category = (formData.get('category') as string) || 'outros'
  const payment_method = (formData.get('payment_method') as string) || 'pix'
  const notes = (formData.get('notes') as string)?.trim() || null
  const order_id = (formData.get('order_id') as string)?.trim() || null

  if (!description || description.trim().length === 0) {
    return { error: 'A descrição da despesa é obrigatória.' }
  }

  const amount = parseCurrencyInput(rawAmount)
  if (amount <= 0) {
    return { error: 'O valor da despesa deve ser maior que zero.' }
  }

  try {
    await updateExpense(expenseId, {
      description: description.trim(),
      amount,
      expense_date: expense_date || getTodayISO(),
      category,
      payment_method,
      notes,
      order_id: order_id || null,
    })

    revalidatePath('/dashboard/despesas')
    revalidatePath('/dashboard/caixa')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao atualizar despesa:', err)
    return { error: err.message || 'Erro ao atualizar despesa.' }
  }
}

export async function deleteExpenseAction(expenseId: string) {
  try {
    await deleteExpense(expenseId)
    revalidatePath('/dashboard/despesas')
    revalidatePath('/dashboard/caixa')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao excluir despesa:', err)
    return { error: err.message || 'Erro ao excluir despesa.' }
  }
}
