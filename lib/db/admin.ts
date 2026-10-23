import { createClient } from '@/utils/supabase/server'

export type AdminUser = {
  id: string
  email: string
  name: string
  is_admin: boolean
  created_at: string
  last_sign_in_at: string | null
  stores: {
    store_id: string
    store_name: string
    role: string
  }[]
}

export type AdminStore = {
  id: string
  name: string
  slug: string | null
  phone: string | null
  document: string | null
  created_at: string
  members_count: number
  owner_email: string | null
}

export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('system_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return false
  return true
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_get_users')
  if (error) throw error
  return (data || []) as AdminUser[]
}

export async function getAdminStores(): Promise<AdminStore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_get_all_stores')
  if (error) throw error
  return (data || []) as AdminStore[]
}

export async function createAdminStore(input: {
  name: string
  owner_user_id?: string
  slug?: string
  phone?: string
  document?: string
}): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_create_store', {
    store_name: input.name,
    owner_user_id: input.owner_user_id || null,
    store_slug: input.slug || null,
    store_phone: input.phone || null,
    store_document: input.document || null,
  })

  if (error) throw error
  return data as string
}

export async function deleteAdminUser(targetUserId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_delete_user', {
    target_user_id: targetUserId,
  })
  if (error) throw error
}

export async function toggleAdminRole(targetUserId: string, makeAdmin: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_toggle_system_admin', {
    target_user_id: targetUserId,
    make_admin: makeAdmin,
  })
  if (error) throw error
}
