import { supabase } from './supabase'

export async function createDepositRequest({
  userId,
  username,
  amount,
  cryptoType,
  txHash,
}: {
  userId: string
  username: string
  amount: number
  cryptoType: string
  txHash: string
}) {
  const { error } = await supabase.from('deposit_requests').insert({
    user_id: userId,
    username,
    amount,
    crypto_type: cryptoType,
    tx_hash: txHash,
    status: 'pending',
  })

  if (error) throw error
}
