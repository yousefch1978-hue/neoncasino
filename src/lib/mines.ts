import { supabase } from './supabase';

export async function startMinesRound(userId: string, betAmount: number, minesCount: number) {
  const { data, error } = await supabase.rpc('start_mines_round', {
    profile_id: userId,
    bet_amount_input: betAmount,
    mines_count_input: minesCount,
  });

  if (error) throw error;
  return data;
}

export async function revealMinesTile(userId: string, roundId: string, tileId: number) {
  const { data, error } = await supabase.rpc('reveal_mines_tile', {
    profile_id: userId,
    round_id_input: roundId,
    tile_id_input: tileId,
  });

  if (error) throw error;
  return data;
}

export async function cashoutMinesRound(userId: string, roundId: string) {
  const { data, error } = await supabase.rpc('cashout_mines_round', {
    profile_id: userId,
    round_id_input: roundId,
  });

  if (error) throw error;
  return data;
}

export async function getActiveMinesRound(userId: string) {
  const { data, error } = await supabase.rpc('get_active_mines_round', {
    profile_id: userId,
  });

  if (error) throw error;
  return data;
}
