'use server'

import { revalidatePath } from 'next/cache'
import { checkIsAdmin, createAdminStore, deleteAdminUser, toggleAdminRole } from '@/lib/db/admin'

export async function createStoreAction(formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Acesso negado. Apenas administradores do sistema podem criar lojas.' }
  }

  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string)?.trim() || undefined
  const phone = (formData.get('phone') as string)?.trim() || undefined
  const document = (formData.get('document') as string)?.trim() || undefined
  const owner_user_id = (formData.get('owner_user_id') as string)?.trim() || undefined

  if (!name || name.trim().length === 0) {
    return { error: 'O nome da loja é obrigatório.' }
  }

  try {
    const storeId = await createAdminStore({
      name: name.trim(),
      slug,
      phone,
      document,
      owner_user_id: owner_user_id || undefined,
    })

    revalidatePath('/dashboard/admin')
    return { success: true, storeId }
  } catch (err: any) {
    console.error('Erro ao criar loja via admin:', err)
    return { error: err.message || 'Erro ao criar loja.' }
  }
}

export async function deleteUserAction(targetUserId: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Acesso negado. Apenas administradores do sistema podem excluir usuários.' }
  }

  if (!targetUserId) {
    return { error: 'ID de usuário inválido.' }
  }

  try {
    await deleteAdminUser(targetUserId)
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao excluir usuário:', err)
    return { error: err.message || 'Erro ao excluir usuário.' }
  }
}

export async function toggleAdminAction(targetUserId: string, makeAdmin: boolean) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Acesso negado. Apenas administradores do sistema podem alterar permissões.' }
  }

  if (!targetUserId) {
    return { error: 'ID de usuário inválido.' }
  }

  try {
    await toggleAdminRole(targetUserId, makeAdmin)
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao alterar permissão de admin:', err)
    return { error: err.message || 'Erro ao alterar permissão de admin.' }
  }
}
