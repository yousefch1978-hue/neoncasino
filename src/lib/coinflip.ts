import { supabase } from './supabase';

export async function startCoinflipRound(userId: string, betAmount: number, choice: 'heads' | 'tails') {
  const { data, error } = await supabase.rpc('start_coinflip_round', {
    profile_id: userId,
    bet_amount_input: betAmount,
    choice_input: choice,
  });

  if (error) throw error;
  return data;
}

export async function finishCoinflipRound(userId: string, roundId: string) {
  const { data, error } = await supabase.rpc('finish_coinflip_round', {
    profile_id: userId,
    round_id_input: roundId,
  });

  if (error) throw error;
  return data;
}

export async function getActiveCoinflipRound(userId: string) {
  const { data, error } = await supabase.rpc('get_active_coinflip_round', {
    profile_id: userId,
  });

  if (error) throw error;
  return data;
}
