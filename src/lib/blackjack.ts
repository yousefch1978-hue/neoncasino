import { supabase } from './supabase';

export async function startBlackjackRound(userId: string, betAmount: number) {
  const { data, error } = await supabase.rpc('start_blackjack_round', {
    profile_id: userId,
    bet_amount_input: betAmount,
  });

  if (error) throw error;
  return data;
}

export async function blackjackHit(userId: string, roundId: string) {
  const { data, error } = await supabase.rpc('blackjack_hit', {
    profile_id: userId,
    round_id_input: roundId,
  });

  if (error) throw error;
  return data;
}

export async function blackjackStand(userId: string, roundId: string) {
  const { data, error } = await supabase.rpc('blackjack_stand', {
    profile_id: userId,
    round_id_input: roundId,
  });

  if (error) throw error;
  return data;
}

export async function getActiveBlackjackRound(userId: string) {
  const { data, error } = await supabase.rpc('get_active_blackjack_round', {
    profile_id: userId,
  });

  if (error) throw error;
  return data;
}
