export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  balance: number;
  createdAt: string;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Bet {
  id: string;
  userId: string;
  username: string;
  game: 'mines' | 'coinflip' | 'crash' | 'dice' | 'blackjack' | 'dragontower';
  amount: number;
  multiplier: number;
  payout: number;
  result: 'win' | 'loss' | 'push' | 'pending';
  createdAt: string;
}
export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  cryptoType: 'btc' | 'eth' | 'sol';
  txHash: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  amount: number;
  usesLeft: number;
  totalUses: number;
  createdAt: string;
  createdBy: string;
  redeemType?: 'signup_only' | 'redeem_only' | 'both';
}

export interface MinesGameState {
  grid: MineTile[];
  minesCount: number;
  betAmount: number;
  currentMultiplier: number;
  isPlaying: boolean;
  isGameOver: boolean;
  revealedCount: number;
}

export interface MineTile {
  id: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
}

export interface CoinFlipState {
  betAmount: number;
  selectedSide: 'heads' | 'tails' | null;
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  hasWon: boolean | null;
}

export interface CrashGameState {
  betAmount: number;
  currentMultiplier: number;
  isPlaying: boolean;
  hasCashedOut: boolean;
  crashPoint: number;
  history: number[];
}

export interface CryptoAddress {
  btc: string;
  eth: string;
  sol: string;
}

export const CRYPTO_ADDRESSES: CryptoAddress = {
  btc: '34M6t3sMB9Ed2URcZdk3Y9nxhsdBmsSCdG',
  eth: '0xFfe8b4569f0B98b137240b8C5B671EF0E346edB2',
  sol: 'Bu642ALXiem5kkAiMoRrB74YeLtHvVcCAxdysPFDEYKQ',
};

// Admin credentials - EXACT MATCH REQUIRED
export const ADMIN_CREDENTIALS = {
  email: 'yousefch1978@gmail.com',
  password: 'Apple@2020',
};

export interface AdminStats {
  totalUsers: number;
  totalBets: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalProfit: number;
  totalWagered: number;
  onlinePlayers: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  value: number;
  rank: number;
}
