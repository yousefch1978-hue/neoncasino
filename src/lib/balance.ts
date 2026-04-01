import { supabase } from './supabase';

export async function safeAddBalance(
  userId: string,
  amount: number,
  reason: string,
  meta: Record<string, any> = {}
) {
  const { data, error } = await supabase.rpc('safe_add_balance', {
    profile_id: userId,
    amount_to_add: amount,
    reason_text: reason,
    meta_json: meta,
  });

  if (error) throw error;
  return Number(data ?? 0);
}

export async function safeSubtractBalance(
  userId: string,
  amount: number,
  reason: string,
  meta: Record<string, any> = {}
) {
  const { data, error } = await supabase.rpc('safe_subtract_balance', {
    profile_id: userId,
    amount_to_subtract: amount,
    reason_text: reason,
    meta_json: meta,
  });

  if (error) throw error;
  return Number(data ?? 0);
}

export async function getSafeBalance(userId: string) {
  const { data, error } = await supabase.rpc('get_profile_balance', {
    profile_id: userId,
  });

  if (error) throw error;
  return Number(data ?? 0);
}
