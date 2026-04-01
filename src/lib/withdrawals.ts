import { supabase } from './supabase'

export async function createWithdrawalRequest({
  userId,
  username,
  email,
  amount,
  cryptoType,
  walletAddress,
}: {
  userId: string
  username: string
  email: string
  amount: number
  cryptoType: string
  walletAddress: string
}) {
  const { error } = await supabase.from('withdrawal_requests').insert({
    user_id: userId,
    username,
    email,
    amount,
    crypto_type: cryptoType,
    wallet_address: walletAddress,
    status: 'pending',
  })

  if (error) throw error
}

export async function getPendingWithdrawalRequests() {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function approveWithdrawalRequest(id: string, adminId: string) {
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'approved',
      processed_at: new Date().toISOString(),
      processed_by: adminId,
    })
    .eq('id', id)

  if (error) throw error
}

export async function rejectWithdrawalRequest(id: string, adminId: string) {
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'rejected',
      processed_at: new Date().toISOString(),
      processed_by: adminId,
    })
    .eq('id', id)

  if (error) throw error
}
