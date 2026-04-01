import { supabase } from './supabase'

export async function getPendingDepositRequests() {
  const { data, error } = await supabase
    .from('deposit_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getApprovedDepositTotal() {
  const { data, error } = await supabase
    .from('deposit_requests')
    .select('amount')
    .eq('status', 'approved')

  if (error) throw error
  return (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
}

export async function approveDepositRequest(id: string) {
  const { error } = await supabase.rpc('approve_deposit_and_credit', {
    deposit_id: id,
  })

  if (error) throw error
}

export async function rejectDepositRequest(id: string) {
  const { error } = await supabase
    .from('deposit_requests')
    .update({ status: 'rejected' })
    .eq('id', id)

  if (error) throw error
}
