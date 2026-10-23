'use server'

import { revalidatePath } from 'next/cache'
import { getActiveStore, updateStore } from '@/lib/db/stores'

export async function updateStoreSettingsAction(formData: FormData) {
  const active = await getActiveStore()
  if (!active?.store?.id) {
    return { error: 'Nenhuma loja ativa selecionada.' }
  }

  const name = formData.get('name') as string
  const phone = (formData.get('phone') as string)?.trim() || null
  const document = (formData.get('document') as string)?.trim() || null
  const timezone = (formData.get('timezone') as string)?.trim() || 'America/Sao_Paulo'

  if (!name || name.trim().length === 0) {
    return { error: 'O nome da loja é obrigatório.' }
  }

  try {
    await updateStore(active.store.id, {
      name: name.trim(),
      phone,
      document,
      timezone,
    })

    revalidatePath('/dashboard/configuracoes')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao atualizar configurações da loja:', err)
    return { error: err.message || 'Erro ao salvar configurações.' }
  }
}
