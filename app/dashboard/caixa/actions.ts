'use server'

import { revalidatePath } from 'next/cache'
import { createManualCashMovement, deleteManualCashMovement } from '@/lib/db/cash-movements'
import { getActiveStore } from '@/lib/db/stores'
import { parseCurrencyInput } from '@/lib/formatters'

export async function createManualMovementAction(formData: FormData) {
  const active = await getActiveStore()
  const storeId = active?.store?.id

  const type = formData.get('type') as 'income' | 'expense'
  const description = formData.get('description') as string
  const rawAmount = formData.get('amount') as string
  const movement_date = formData.get('movement_date') as string
  const payment_method = (formData.get('payment_method') as string) || 'pix'

  if (!description || description.trim().length === 0) {
    return { error: 'A descrição da movimentação é obrigatória.' }
  }

  const amount = parseCurrencyInput(rawAmount)
  if (amount <= 0) {
    return { error: 'O valor deve ser maior que zero.' }
  }

  try {
    await createManualCashMovement({
      store_id: storeId,
      type,
      description: description.trim(),
      amount,
      movement_date: movement_date || new Date().toISOString().split('T')[0],
      payment_method,
    })

    revalidatePath('/dashboard/caixa')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao criar lançamento manual:', err)
    return { error: err.message || 'Erro ao registrar movimentação.' }
  }
}

export async function deleteManualMovementAction(movementId: string) {
  try {
    await deleteManualCashMovement(movementId)
    revalidatePath('/dashboard/caixa')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao excluir movimentação manual:', err)
    return { error: err.message || 'Erro ao excluir movimentação manual.' }
  }
}
