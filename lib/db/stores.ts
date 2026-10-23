import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export type Store = {
  id: string
  name: string
  slug: string | null
  document: string | null
  phone: string | null
  timezone: string
  currency: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export type StoreMember = {
  id: string
  store_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
  updated_at: string
}

export const ACTIVE_STORE_COOKIE = 'iris_active_store_id'

/**
 * Obtém todas as lojas às quais o usuário tem acesso
 */
export async function getUserStores(): Promise<(Store & { role: string })[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('store_members')
    .select(`
      role,
      stores (*)
    `)
    .eq('user_id', user.id)

  if (error || !data) return []

  return data
    .filter(item => item.stores)
    .map(item => ({
      ...(item.stores as unknown as Store),
      role: item.role
    }))
}

/**
 * Retorna a loja ativa atual do usuário (com verificação estrita de autorização)
 * Se o usuário não tiver nenhuma loja, cria automaticamente uma loja padrão ('Minha Confeitaria')
 */
export async function getActiveStore(): Promise<{ store: Store; role: string; stores: (Store & { role: string })[] } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const stores = await getUserStores()

  // Se o usuário não tem nenhuma loja, provisiona a primeira
  if (stores.length === 0) {
    const storeName = user.user_metadata?.store_name || 'Minha Loja'
    
    // Insere a loja
    const { data: newStore, error: storeError } = await supabase
      .from('stores')
      .insert([{ name: storeName }])
      .select()
      .single()

    if (storeError || !newStore) {
      console.error('Erro ao provisionar loja padrão:', storeError)
      return null
    }

    // Insere como owner
    const { error: memberError } = await supabase
      .from('store_members')
      .insert([{ store_id: newStore.id, user_id: user.id, role: 'owner' }])

    if (memberError) {
      console.error('Erro ao vincular membro na loja:', memberError)
    }

    const createdStore = { ...newStore, role: 'owner' }
    return {
      store: createdStore,
      role: 'owner',
      stores: [createdStore]
    }
  }

  // Verifica se há preferência salva no cookie
  const cookieStore = await cookies()
  const savedStoreId = cookieStore.get(ACTIVE_STORE_COOKIE)?.value

  let active = stores.find(s => s.id === savedStoreId)
  if (!active) {
    active = stores[0]
  }

  return {
    store: active,
    role: active.role,
    stores
  }
}

/**
 * Atualiza configurações da loja (nome, documento, telefone, preferências de notificação)
 */
export async function updateStore(storeId: string, input: Partial<Pick<Store, 'name' | 'document' | 'phone' | 'timezone' | 'settings'>>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('stores')
    .update(input)
    .eq('id', storeId)
    .select()
    .single()

  if (error) throw error
  return data as Store
}
