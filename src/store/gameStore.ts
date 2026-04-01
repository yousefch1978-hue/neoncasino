import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bet, MinesGameState, CoinFlipState, CrashGameState, MineTile } from '@/types';

// Fake player names for rankings
const FAKE_USERNAMES = [
  'CryptoWhale', 'MoonShot', 'DiamondHands', 'LuckyStreak', 'HighRoller',
  'BetMaster', 'WinningKing', 'JackpotHunter', 'RiskTaker', 'FortuneFinder',
  'GoldRush', 'SilverSurfer', 'PlatinumPlay', 'CryptoNinja', 'BlockchainBet',
  'SatoshiFan', 'EtherLord', 'SolanaStar', 'BitcoinBull', 'AltCoinAce',
  'DeFiDegen', 'YieldFarmer', 'LiquidityKing', 'StakingPro', 'TradingBeast',
  'ChartMaster', 'PumpChaser', 'DumpSurvivor', 'HodlGang', 'FomoFighter',
  'FudDestroyer', 'ApeStrong', 'DiamondPaws', 'PaperHands', 'WhaleWatcher',
  'DolphinDive', 'SharkBite', 'MinnowSwim', 'KrakenKill', 'Leviathan',
  'NeonRider', 'CyberPunk', 'MatrixFan', 'GlitchHunter', 'PixelLord',
  'RetroGamer', 'ArcadeKing', 'HighScore', 'GameOver', 'PlayToWin'
];

// Generate fake players with random stats
interface FakePlayer {
  userId: string;
  username: string;
  totalWagered: number;
  totalProfit: number;
  lastActive: string;
}

const generateFakePlayers = (): FakePlayer[] => {
  return FAKE_USERNAMES.map((username, index) => ({
    userId: `fake-${index}`,
    username,
    totalWagered: Math.floor(Math.random() * 50000) + 1000,
    totalProfit: Math.floor(Math.random() * 20000) - 5000,
    lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

interface GameStore {
  bets: Bet[];
  minesState: MinesGameState;
  coinFlipState: CoinFlipState;
  crashState: CrashGameState;
  fakePlayers: FakePlayer[];
  addBet: (bet: Omit<Bet, 'id' | 'createdAt'>) => void;
  updateBet: (betId: string, updates: Partial<Bet>) => void;
  getAllBets: () => Bet[];
  getUserBets: (userId: string) => Bet[];
  getTopWagered: (limit?: number) => { userId: string; username: string; total: number; isReal: boolean }[];
  getTopProfit: (limit?: number) => { userId: string; username: string; profit: number; isReal: boolean }[];
  getTotalProfit: () => number;
  getTotalWagered: () => number;
  // Mines actions
  initMinesGame: (minesCount: number, betAmount: number) => void;
  revealTile: (tileId: number) => { hitMine: boolean; multiplier: number };
  cashoutMines: () => number;
  resetMines: () => void;
  // Coin flip actions
  setCoinFlipSelection: (side: 'heads' | 'tails') => void;
  setCoinFlipBet: (amount: number) => void;
  flipCoin: () => Promise<{ result: 'heads' | 'tails'; won: boolean }>;
  resetCoinFlip: () => void;
  // Crash actions
  startCrashGame: (betAmount: number) => void;
  cashoutCrash: () => { success: boolean; multiplier: number };
  endCrashGame: () => void;
  updateCrashMultiplier: (multiplier: number) => void;
  addCrashHistory: (multiplier: number) => void;
}

const createMinesGrid = (minesCount: number): MineTile[] => {
  const grid: MineTile[] = Array(25).fill(null).map((_, i) => ({
    id: i,
    isMine: false,
    isRevealed: false,
    isFlagged: false,
  }));

  let minesPlaced = 0;
  while (minesPlaced < minesCount) {
    const index = Math.floor(Math.random() * 25);
    if (!grid[index].isMine) {
      grid[index].isMine = true;
      minesPlaced++;
    }
  }

  return grid;
};

const calculateMinesMultiplier = (revealedCount: number, minesCount: number): number => {
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;
  
  if (revealedCount === 0) return 1;
  
  let probability = 1;
  for (let i = 0; i < revealedCount; i++) {
    probability *= (safeTiles - i) / (totalTiles - i);
  }
  
  return Math.max(1, Number((0.99 / probability).toFixed(2)));
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      bets: [],
      fakePlayers: generateFakePlayers(),
      
      minesState: {
        grid: [],
        minesCount: 3,
        betAmount: 0,
        currentMultiplier: 1,
        isPlaying: false,
        isGameOver: false,
        revealedCount: 0,
      },
      
      coinFlipState: {
        betAmount: 0,
        selectedSide: null,
        isFlipping: false,
        result: null,
        hasWon: null,
      },
      
      crashState: {
        betAmount: 0,
        currentMultiplier: 1,
        isPlaying: false,
        hasCashedOut: false,
        crashPoint: 0,
        history: [1.5, 2.3, 1.1, 3.7, 1.8, 2.1, 4.2, 1.3, 2.8, 1.9],
      },

      addBet: (betData) => {
        const bet: Bet = {
          ...betData,
          id: `bet-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ bets: [bet, ...state.bets] }));
        
        // Update fake players randomly to simulate activity
        set((state) => ({
          fakePlayers: state.fakePlayers.map((player) => {
            if (Math.random() < 0.1) { // 10% chance to update each fake player
              return {
                ...player,
                totalWagered: player.totalWagered + Math.floor(Math.random() * 500),
                totalProfit: player.totalProfit + Math.floor(Math.random() * 200) - 100,
                lastActive: new Date().toISOString(),
              };
            }
            return player;
          }),
        }));
      },

      updateBet: (betId, updates) => {
        set((state) => ({
          bets: state.bets.map((bet) =>
            bet.id === betId ? { ...bet, ...updates } : bet
          ),
        }));
      },

      getAllBets: () => get().bets,

      getUserBets: (userId) => get().bets.filter((bet) => bet.userId === userId),

      getTopWagered: (limit = 50) => {
        const { bets, fakePlayers } = get();
        
        // Calculate real user totals
        const userTotals: Record<string, { userId: string; username: string; total: number; isReal: boolean }> = {};
        
        bets.forEach((bet) => {
          if (!userTotals[bet.userId]) {
            userTotals[bet.userId] = { 
              userId: bet.userId, 
              username: bet.username, 
              total: 0,
              isReal: true 
            };
          }
          userTotals[bet.userId].total += bet.amount;
        });
        
        // Add fake players
        fakePlayers.forEach((player) => {
          if (!userTotals[player.userId]) {
            userTotals[player.userId] = {
              userId: player.userId,
              username: player.username,
              total: player.totalWagered,
              isReal: false,
            };
          }
        });
        
        return Object.values(userTotals)
          .sort((a, b) => b.total - a.total)
          .slice(0, limit);
      },

      getTopProfit: (limit = 50) => {
        const { bets, fakePlayers } = get();
        
        // Calculate real user profits
        const userProfits: Record<string, { userId: string; username: string; profit: number; isReal: boolean }> = {};
        
        bets.forEach((bet) => {
          if (!userProfits[bet.userId]) {
            userProfits[bet.userId] = { 
              userId: bet.userId, 
              username: bet.username, 
              profit: 0,
              isReal: true 
            };
          }
          if (bet.result === 'win') {
            userProfits[bet.userId].profit += bet.payout - bet.amount;
          }
        });
        
        // Add fake players
        fakePlayers.forEach((player) => {
          if (!userProfits[player.userId]) {
            userProfits[player.userId] = {
              userId: player.userId,
              username: player.username,
              profit: player.totalProfit,
              isReal: false,
            };
          }
        });
        
        return Object.values(userProfits)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, limit);
      },

      getTotalProfit: () => {
        return get().bets.reduce((profit, bet) => {
          if (bet.result === 'win') return profit - (bet.payout - bet.amount);
          if (bet.result === 'loss') return profit + bet.amount;
          return profit;
        }, 0);
      },

      getTotalWagered: () => get().bets.reduce((total, bet) => total + bet.amount, 0),

      // Mines actions
      initMinesGame: (minesCount, betAmount) => {
        set({
          minesState: {
            grid: createMinesGrid(minesCount),
            minesCount,
            betAmount,
            currentMultiplier: 1,
            isPlaying: true,
            isGameOver: false,
            revealedCount: 0,
          },
        });
      },

      revealTile: (tileId) => {
        const { minesState } = get();
        const tile = minesState.grid[tileId];
        
        if (!minesState.isPlaying || tile.isRevealed || minesState.isGameOver) {
          return { hitMine: false, multiplier: minesState.currentMultiplier };
        }

        const newGrid = [...minesState.grid];
        newGrid[tileId] = { ...tile, isRevealed: true };

        if (tile.isMine) {
          newGrid.forEach((t, i) => {
            if (t.isMine) newGrid[i] = { ...t, isRevealed: true };
          });
          
          set({
            minesState: {
              ...minesState,
              grid: newGrid,
              isGameOver: true,
              isPlaying: false,
            },
          });
          return { hitMine: true, multiplier: 0 };
        }

        const newRevealedCount = minesState.revealedCount + 1;
        const newMultiplier = calculateMinesMultiplier(newRevealedCount, minesState.minesCount);

        set({
          minesState: {
            ...minesState,
            grid: newGrid,
            revealedCount: newRevealedCount,
            currentMultiplier: newMultiplier,
          },
        });

        return { hitMine: false, multiplier: newMultiplier };
      },

      cashoutMines: () => {
        const { minesState } = get();
        const payout = minesState.betAmount * minesState.currentMultiplier;
        
        set({
          minesState: {
            ...minesState,
            isPlaying: false,
            isGameOver: true,
          },
        });

        return payout;
      },

      resetMines: () => {
        set({
          minesState: {
            grid: [],
            minesCount: 3,
            betAmount: 0,
            currentMultiplier: 1,
            isPlaying: false,
            isGameOver: false,
            revealedCount: 0,
          },
        });
      },

      // Coin flip actions
      setCoinFlipSelection: (side) => {
        set((state) => ({
          coinFlipState: { ...state.coinFlipState, selectedSide: side },
        }));
      },

      setCoinFlipBet: (amount) => {
        set((state) => ({
          coinFlipState: { ...state.coinFlipState, betAmount: amount },
        }));
      },

      flipCoin: async () => {
        const { coinFlipState } = get();
        
        set((state) => ({
          coinFlipState: { ...state.coinFlipState, isFlipping: true },
        }));

        await new Promise((resolve) => setTimeout(resolve, 3000));

        const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === coinFlipState.selectedSide;

        set((state) => ({
          coinFlipState: {
            ...state.coinFlipState,
            isFlipping: false,
            result,
            hasWon: won,
          },
        }));

        return { result, won };
      },

      resetCoinFlip: () => {
        set({
          coinFlipState: {
            betAmount: 0,
            selectedSide: null,
            isFlipping: false,
            result: null,
            hasWon: null,
          },
        });
      },

      // Crash actions
      startCrashGame: (betAmount) => {
        const r = Math.random();
        const crashPoint = Math.max(1.01, Number((0.99 / (1 - r)).toFixed(2)));
        
        set({
          crashState: {
            ...get().crashState,
            betAmount,
            currentMultiplier: 1,
            isPlaying: true,
            hasCashedOut: false,
            crashPoint,
          },
        });
      },

      cashoutCrash: () => {
        const { crashState } = get();
        
        if (!crashState.isPlaying || crashState.hasCashedOut) {
          return { success: false, multiplier: 0 };
        }

        set({
          crashState: {
            ...crashState,
            hasCashedOut: true,
            isPlaying: false,
          },
        });

        return { success: true, multiplier: crashState.currentMultiplier };
      },

      endCrashGame: () => {
        set((state) => ({
          crashState: {
            ...state.crashState,
            isPlaying: false,
          },
        }));
      },

      updateCrashMultiplier: (multiplier) => {
        set((state) => ({
          crashState: {
            ...state.crashState,
            currentMultiplier: multiplier,
          },
        }));
      },

      addCrashHistory: (multiplier) => {
        set((state) => ({
          crashState: {
            ...state.crashState,
            history: [multiplier, ...state.crashState.history.slice(0, 9)],
          },
        }));
      },
    }),
    {
      name: 'game-storage',
    }
  )
);
