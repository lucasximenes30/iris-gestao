'use server'

import { revalidatePath } from 'next/cache'
import { getActiveStore } from '@/lib/db/stores'
import { createProductRecord, updateProductRecord, deleteProductRecord } from '@/lib/db/products'
import { parseCurrencyInput } from '@/lib/formatters'

export async function createProductAction(formData: FormData) {
  const activeStore = await getActiveStore()
  if (!activeStore?.store?.id) {
    return { error: 'Nenhuma loja ativa encontrada.' }
  }

  const name = formData.get('name') as string
  if (!name || !name.trim()) {
    return { error: 'O nome do produto é obrigatório.' }
  }

  const category = (formData.get('category') as string) || 'outros'
  const priceStr = formData.get('price') as string
  const costPriceStr = formData.get('cost_price') as string
  const unit = (formData.get('unit') as string) || 'un'
  const description = (formData.get('description') as string)?.trim() || null
  const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true'

  const price = parseCurrencyInput(priceStr)
  if (price < 0) {
    return { error: 'O preço de venda deve ser maior ou igual a zero.' }
  }

  const cost_price = costPriceStr ? parseCurrencyInput(costPriceStr) : null

  try {
    const product = await createProductRecord({
      store_id: activeStore.store.id,
      name: name.trim(),
      category,
      price,
      cost_price,
      unit,
      description,
      is_active
    })

    revalidatePath('/dashboard/produtos')
    revalidatePath('/dashboard/pedidos/novo')
    return { success: true, product }
  } catch (err: any) {
    console.error('Erro ao cadastrar produto:', err)
    return { error: 'Não foi possível salvar o produto.' }
  }
}

export async function updateProductAction(id: string, formData: FormData) {
  const activeStore = await getActiveStore()
  if (!activeStore?.store?.id) {
    return { error: 'Nenhuma loja ativa encontrada.' }
  }

  const name = formData.get('name') as string
  if (!name || !name.trim()) {
    return { error: 'O nome do produto é obrigatório.' }
  }

  const category = (formData.get('category') as string) || 'outros'
  const priceStr = formData.get('price') as string
  const costPriceStr = formData.get('cost_price') as string
  const unit = (formData.get('unit') as string) || 'un'
  const description = (formData.get('description') as string)?.trim() || null
  const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true'

  const price = parseCurrencyInput(priceStr)
  if (price < 0) {
    return { error: 'O preço de venda deve ser maior ou igual a zero.' }
  }

  const cost_price = costPriceStr ? parseCurrencyInput(costPriceStr) : null

  try {
    const product = await updateProductRecord(id, activeStore.store.id, {
      name: name.trim(),
      category,
      price,
      cost_price,
      unit,
      description,
      is_active
    })

    revalidatePath('/dashboard/produtos')
    revalidatePath('/dashboard/pedidos')
    return { success: true, product }
  } catch (err: any) {
    console.error('Erro ao atualizar produto:', err)
    return { error: 'Não foi possível atualizar o produto.' }
  }
}

export async function toggleProductActiveAction(id: string, is_active: boolean) {
  const activeStore = await getActiveStore()
  if (!activeStore?.store?.id) {
    return { error: 'Nenhuma loja ativa encontrada.' }
  }

  try {
    await updateProductRecord(id, activeStore.store.id, { is_active })
    revalidatePath('/dashboard/produtos')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao alternar status do produto:', err)
    return { error: 'Não foi possível alterar a disponibilidade.' }
  }
}

export async function deleteProductAction(id: string) {
  const activeStore = await getActiveStore()
  if (!activeStore?.store?.id) {
    return { error: 'Nenhuma loja ativa encontrada.' }
  }

  try {
    await deleteProductRecord(id, activeStore.store.id)
    revalidatePath('/dashboard/produtos')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao excluir produto:', err)
    return { error: 'Não foi possível excluir o produto.' }
  }
}
