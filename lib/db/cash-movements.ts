import { createClient } from '@/utils/supabase/server'

export async function getCashMovements() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_movements')
    .select('*')
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return data
}

export async function createManualCashMovement(input: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('cash_movements')
    .insert([{ ...input, user_id: user.id, source: 'manual' }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateManualCashMovement(id: string, input: any) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_movements')
    .update(input)
    .eq('id', id)
    .eq('source', 'manual')
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteManualCashMovement(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cash_movements')
    .delete()
    .eq('id', id)
    .eq('source', 'manual')

  if (error) throw error
  return true
}
