import { createClient } from '@/utils/supabase/server'

export type Product = {
  id: string
  store_id: string
  name: string
  description: string | null
  category: string
  price: number
  cost_price: number | null
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getProducts(
  storeId: string,
  filters?: { search?: string; category?: string; activeOnly?: boolean }
) {
  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)

  if (filters?.activeOnly) {
    query = query.eq('is_active', true)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('name', { ascending: true })

  if (error) throw error
  return data as Product[]
}

export async function getProductById(id: string, storeId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (error) throw error
  return data as Product
}

export async function createProductRecord(input: {
  store_id: string
  name: string
  description?: string | null
  category?: string
  price: number
  cost_price?: number | null
  unit?: string
  is_active?: boolean
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .insert([input])
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProductRecord(
  id: string,
  storeId: string,
  input: Partial<Pick<Product, 'name' | 'description' | 'category' | 'price' | 'cost_price' | 'unit' | 'is_active'>>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function deleteProductRecord(id: string, storeId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('store_id', storeId)

  if (error) throw error
  return true
}
