'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActiveStore } from '@/lib/db/stores'
import { createClientRecord, updateClientRecord, deleteClientRecord } from '@/lib/db/clients'

export async function createClientAction(formData: FormData) {
  const activeStore = await getActiveStore()
  if (!activeStore?.store?.id) {
    return { error: 'Nenhuma loja ativa encontrada.' }
  }

  const name = formData.get('name') as string
  if (!name || !name.trim()) {
    return { error: 'O nome do cliente é obrigatório.' }
  }

  const phone = (formData.get('phone') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim() || null
  const address = (formData.get('address') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  try {
    const client = await createClientRecord({
      store_id: activeStore.store.id,
      name: name.trim(),
      phone,
      email,
      address,
      notes
    })

    revalidatePath('/dashboard/clientes')
    revalidatePath('/dashboard/pedidos/novo')
    return { success: true, client }
  } catch (err: any) {
    console.error('Erro ao cadastrar cliente:', err)
    return { error: 'Não foi possível salvar o cliente. Verifique os dados e tente novamente.' }
  }
}

export async function updateClientAction(id: string, formData: FormData) {
  const activeStore = await getActiveStore()
  if (!activeStore?.store?.id) {
    return { error: 'Nenhuma loja ativa encontrada.' }
  }

  const name = formData.get('name') as string
  if (!name || !name.trim()) {
    return { error: 'O nome do cliente é obrigatório.' }
  }

  const phone = (formData.get('phone') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim() || null
  const address = (formData.get('address') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  try {
    const client = await updateClientRecord(id, activeStore.store.id, {
      name: name.trim(),
      phone,
      email,
      address,
      notes
    })

    revalidatePath('/dashboard/clientes')
    revalidatePath(`/dashboard/clientes/${id}`)
    revalidatePath('/dashboard/pedidos')
    return { success: true, client }
  } catch (err: any) {
    console.error('Erro ao atualizar cliente:', err)
    return { error: 'Não foi possível atualizar o cliente.' }
  }
}

export async function deleteClientAction(id: string) {
  const activeStore = await getActiveStore()
  if (!activeStore?.store?.id) {
    return { error: 'Nenhuma loja ativa encontrada.' }
  }

  try {
    await deleteClientRecord(id, activeStore.store.id)
    revalidatePath('/dashboard/clientes')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao excluir cliente:', err)
    return { error: 'Não foi possível excluir o cliente.' }
  }
}
