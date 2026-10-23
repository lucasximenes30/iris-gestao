'use server'

import { revalidatePath } from 'next/cache'
import {
  checkIsAdmin,
  createAdminStore,
  updateAdminStore,
  deleteAdminStore,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleAdminRole,
} from '@/lib/db/admin'

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

export async function updateStoreAction(storeId: string, formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Acesso negado. Apenas administradores do sistema podem editar lojas.' }
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
    await updateAdminStore({
      id: storeId,
      name: name.trim(),
      slug,
      phone,
      document,
      owner_user_id: owner_user_id || undefined,
    })

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao editar loja via admin:', err)
    return { error: err.message || 'Erro ao editar loja.' }
  }
}

export async function deleteStoreAction(storeId: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Acesso negado. Apenas administradores do sistema podem excluir lojas.' }
  }

  if (!storeId) {
    return { error: 'ID de loja inválido.' }
  }

  try {
    await deleteAdminStore(storeId)
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao excluir loja via admin:', err)
    return { error: err.message || 'Erro ao excluir loja.' }
  }
}

export async function createUserAction(formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Acesso negado. Apenas administradores do sistema podem criar usuários.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const make_admin = formData.get('make_admin') === 'true' || formData.get('make_admin') === 'on'
  const initial_store_id = (formData.get('initial_store_id') as string)?.trim() || undefined

  if (!email || !email.includes('@')) {
    return { error: 'E-mail inválido.' }
  }
  if (!password || password.length < 6) {
    return { error: 'A senha deve conter pelo menos 6 caracteres.' }
  }

  try {
    const userId = await createAdminUser({
      name: name || '',
      email,
      password,
      make_admin,
      initial_store_id,
    })

    revalidatePath('/dashboard/admin')
    return { success: true, userId }
  } catch (err: any) {
    console.error('Erro ao criar usuário via admin:', err)
    return { error: err.message || 'Erro ao criar usuário.' }
  }
}

export async function updateUserAction(userId: string, formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Acesso negado. Apenas administradores do sistema podem editar usuários.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim() || undefined
  const make_admin_raw = formData.get('make_admin')
  const make_admin = make_admin_raw !== null ? (make_admin_raw === 'true' || make_admin_raw === 'on') : undefined

  if (!email || !email.includes('@')) {
    return { error: 'E-mail inválido.' }
  }
  if (password && password.length < 6) {
    return { error: 'A nova senha deve conter pelo menos 6 caracteres.' }
  }

  try {
    await updateAdminUser({
      id: userId,
      name: name || '',
      email,
      password: password || undefined,
      make_admin,
    })

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao editar usuário via admin:', err)
    return { error: err.message || 'Erro ao editar usuário.' }
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

