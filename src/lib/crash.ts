import { supabase } from './supabase';

export async function startCrashRound(userId: string, betAmount: number) {
  const { data, error } = await supabase.rpc('start_crash_round', {
    profile_id: userId,
    bet_amount_input: betAmount,
  });

  if (error) throw error;
  return data;
}

export async function cashoutCrashRound(userId: string, roundId: string, multiplier: number) {
  const { data, error } = await supabase.rpc('cashout_crash_round', {
    profile_id: userId,
    round_id_input: roundId,
    cashout_multiplier_input: multiplier,
  });

  if (error) throw error;
  return data;
}

export async function resolveCrashRound(userId: string, roundId: string) {
  const { data, error } = await supabase.rpc('resolve_crash_round', {
    profile_id: userId,
    round_id_input: roundId,
  });

  if (error) throw error;
  return data;
}

export async function getActiveCrashRound(userId: string) {
  const { data, error } = await supabase.rpc('get_active_crash_round', {
    profile_id: userId,
  });

  if (error) throw error;
  return data;
}
