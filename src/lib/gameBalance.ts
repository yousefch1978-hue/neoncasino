import { safeAddBalance, safeSubtractBalance } from './balance';

export async function placeGameBet(
  userId: string,
  game: string,
  amount: number,
  meta: Record<string, any> = {}
) {
  return safeSubtractBalance(userId, amount, `${game}_bet`, meta);
}

export async function settleGamePayout(
  userId: string,
  game: string,
  amount: number,
  meta: Record<string, any> = {}
) {
  return safeAddBalance(userId, amount, `${game}_payout`, meta);
}
