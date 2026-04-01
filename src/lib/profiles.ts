import { supabase } from './supabase'

export async function upsertProfile({
  id,
  email,
  username,
  role = 'user',
  balance,
  createdAt,
}: {
  id: string
  email: string
  username: string
  role?: 'user' | 'admin'
  balance?: number
  createdAt?: string
}) {
  const payload: any = {
    id,
    email,
    username,
    role,
    created_at: createdAt || new Date().toISOString(),
  }

  if (balance !== undefined) {
    payload.balance = balance
  }

  const { error } = await supabase.from('profiles').upsert(payload)

  if (error) throw error
}

export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()

  if (error) throw error
  return data
}

export async function updateProfileBalance(id: string, balance: number) {
  const { error } = await supabase
    .from('profiles')
    .update({ balance })
    .eq('id', id)

  if (error) throw error
}

export async function incrementProfileBalance(id: string, amount: number) {
  const { error } = await supabase.rpc('increment_profile_balance', {
    profile_id: id,
    amount_to_add: amount,
  })

  if (error) throw error

  const profile = await getProfileById(id)
  return Number(profile.balance || 0)
}
