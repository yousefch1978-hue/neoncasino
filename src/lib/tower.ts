import { supabase } from './supabase';

export async function startTowerRound(
  userId: string,
  betAmount: number,
  difficulty: string
) {
  const { data, error } = await supabase.rpc('start_tower_round', {
    profile_id: userId,
    bet_amount_input: betAmount,
    difficulty_input: difficulty,
  });

  if (error) throw error;
  return data;
}

export async function revealTowerTile(
  userId: string,
  roundId: string,
  rowIndex: number,
  tileIndex: number
) {
  const { data, error } = await supabase.rpc('reveal_tower_tile', {
    profile_id: userId,
    round_id_input: roundId,
    row_index_input: rowIndex,
    tile_index_input: tileIndex,
  });

  if (error) throw error;
  return data;
}

export async function cashoutTowerRound(
  userId: string,
  roundId: string
) {
  const { data, error } = await supabase.rpc('cashout_tower_round', {
    profile_id: userId,
    round_id_input: roundId,
  });

  if (error) throw error;
  return data;
}

export async function getActiveTowerRound(userId: string) {
  const { data, error } = await supabase.rpc('get_active_tower_round', {
    profile_id: userId,
  });

  if (error) throw error;
  return data;
}
