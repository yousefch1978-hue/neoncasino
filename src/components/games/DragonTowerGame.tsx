import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, RefreshCw, Gem, Skull, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';
import { startTowerRound, revealTowerTile, cashoutTowerRound, getActiveTowerRound } from '@/lib/tower';

const DIFFICULTIES = {
  easy: {
    name: 'Easy',
    rows: 8,
    tilesPerRow: 4,
    multipliers: [1.16, 1.42, 1.74, 2.14, 2.63, 3.23, 3.96, 4.86],
  },
  medium: {
    name: 'Medium',
    rows: 8,
    tilesPerRow: 3,
    multipliers: [1.28, 1.72, 2.31, 3.10, 4.16, 5.58, 7.48, 10.03],
  },
  hard: {
    name: 'Hard',
    rows: 9,
    tilesPerRow: 2,
    multipliers: [1.66, 2.76, 4.58, 7.60, 12.62, 20.95, 34.77, 57.70, 95.74],
  },
  expert: {
    name: 'Expert',
    rows: 9,
    tilesPerRow: 3,
    multipliers: [2.50, 6.25, 15.63, 39.06, 97.66, 244.14, 610.35, 1525.88, 3814.70],
  },
  master: {
    name: 'Master',
    rows: 9,
    tilesPerRow: 4,
    multipliers: [3.20, 10.24, 32.77, 104.86, 335.54, 1073.73, 3435.94, 10995.01, 35184.03],
  },
} as const;

type Difficulty = keyof typeof DIFFICULTIES;

interface TowerTile {
  id: number;
  isRevealed: boolean;
  isSelected: boolean;
  isMine?: boolean;
}

const createTower = (difficulty: Difficulty): TowerTile[][] => {
  const config = DIFFICULTIES[difficulty];
  return Array.from({ length: config.rows }, (_, row) =>
    Array.from({ length: config.tilesPerRow }, (_, tile) => ({
      id: row * config.tilesPerRow + tile,
      isRevealed: false,
      isSelected: false,
      isMine: false,
    }))
  );
};

const playTowerSound = (type: 'click' | 'safe' | 'mine' | 'cashout') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'click') {
      oscillator.frequency.setValueAtTime(750, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
    } else if (type === 'safe') {
      oscillator.frequency.setValueAtTime(540, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(820, audioContext.currentTime + 0.16);
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.18);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.18);
    } else if (type === 'mine') {
      oscillator.frequency.setValueAtTime(240, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(90, audioContext.currentTime + 0.35);
      gainNode.gain.setValueAtTime(0.18, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.35);
    } else {
      oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(820, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.35);
    }
  } catch {}
};

export default function DragonTowerGame() {
  const { user, setUser } = useAuthStore();
  const { addBet } = useGameStore();

  const [betAmount, setBetAmount] = useState('10');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [tower, setTower] = useState<TowerTile[][]>(createTower('medium'));
  const [currentRow, setCurrentRow] = useState(0);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'finished'>('betting');
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [roundId, setRoundId] = useState<string | null>(null);

  const config = DIFFICULTIES[difficulty];
  const currentMultiplier = currentRow > 0 ? config.multipliers[currentRow - 1] : 1;
  const nextMultiplier = currentRow < config.rows ? config.multipliers[currentRow] : config.multipliers[config.rows - 1];

  const syncUserBalance = (newBalance: number) => {
    if (!user) return;

    const updatedUser = { ...user, balance: Number(newBalance) };
    setUser(updatedUser);

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) =>
      u.id === user.id ? { ...u, balance: Number(newBalance) } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));
  };

  useEffect(() => {
    const loadActiveRound = async () => {
      if (!user) return;

      try {
        const result = await getActiveTowerRound(user.id);
        if (!result?.success || !result?.round) return;

        const round = result.round;
        const diff = (round.difficulty || 'medium') as Difficulty;

        setDifficulty(diff);
        setTower(createTower(diff));
        setRoundId(round.id);
        setBetAmount(String(round.bet_amount ?? '10'));
        setCurrentRow(Number(round.current_row ?? 0));
        setGameState('playing');
      } catch (error) {
        console.error(error);
      }
    };

    loadActiveRound();
  }, [user]);

  const handleStartGame = async () => {
    if (!user) {
      toast.error('Please login to play');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bet amount');
      return;
    }

    if (amount > user.balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      const result = await startTowerRound(user.id, amount, difficulty);

      if (!result?.success) {
        toast.error(result?.error || 'Failed to start tower game');
        return;
      }

      setTower(createTower(difficulty));
      setCurrentRow(0);
      setGameState('playing');
      setRoundId(result.round_id);
      syncUserBalance(Number(result.balance ?? user.balance));

      addBet({
        userId: user.id,
        username: user.username,
        game: 'dragontower',
        amount,
        multiplier: 1,
        payout: 0,
        result: 'pending',
      });

      playTowerSound('click');
      toast.success('Tower game started!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to start tower game');
    }
  };

  const handleTileClick = async (_rowIndex: number, tileIndex: number) => {
    if (!user || !roundId || gameState !== 'playing') return;

    const rowToPlay = currentRow;

    try {
      const result = await revealTowerTile(user.id, roundId, rowToPlay, tileIndex);

      if (!result?.success) {
        toast.error(result?.error || 'Failed to reveal tile');
        return;
      }

      const newTower = tower.map((row) => row.map((tile) => ({ ...tile })));

      if (result.result === 'mine') {
        if (newTower[rowToPlay]?.[tileIndex]) {
          newTower[rowToPlay][tileIndex].isRevealed = true;
          newTower[rowToPlay][tileIndex].isMine = true;
        }

        if (Array.isArray(result.wrong_tiles)) {
          result.wrong_tiles.forEach((wrongTile: number) => {
            if (newTower[rowToPlay]?.[wrongTile]) {
              newTower[rowToPlay][wrongTile].isRevealed = true;
              newTower[rowToPlay][wrongTile].isMine = true;
            }
          });
        }

        setTower(newTower);
        setGameState('finished');

        addBet({
          userId: user.id,
          username: user.username,
          game: 'dragontower',
          amount: parseFloat(betAmount),
          multiplier: 0,
          payout: 0,
          result: 'loss',
        });

        playTowerSound('mine');
        toast.error('You hit a bomb');
        return;
      }

      if (newTower[rowToPlay]?.[tileIndex]) {
        newTower[rowToPlay][tileIndex].isRevealed = true;
        newTower[rowToPlay][tileIndex].isSelected = true;
      }

      setTower(newTower);
      setCurrentRow(Number(result.current_row ?? rowToPlay + 1));
      playTowerSound('safe');

      if (result.completed) {
        const cashResult = await cashoutTowerRound(user.id, roundId);

        if (cashResult?.success) {
          syncUserBalance(Number(cashResult.balance ?? user.balance));
          setGameState('finished');

          addBet({
            userId: user.id,
            username: user.username,
            game: 'dragontower',
            amount: parseFloat(betAmount),
            multiplier: Number(cashResult.current_multiplier ?? 1),
            payout: Number(cashResult.payout ?? 0),
            result: 'win',
          });

          playTowerSound('cashout');
          toast.success(`Won $${Number(cashResult.payout ?? 0).toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to reveal tile');
    }
  };

  const handleCashout = async () => {
    if (!user || !roundId || gameState !== 'playing' || currentRow === 0) return;

    try {
      const result = await cashoutTowerRound(user.id, roundId);

      if (!result?.success) {
        toast.error(result?.error || 'Failed to cash out');
        return;
      }

      syncUserBalance(Number(result.balance ?? user.balance));
      setGameState('finished');

      addBet({
        userId: user.id,
        username: user.username,
        game: 'dragontower',
        amount: parseFloat(betAmount),
        multiplier: Number(result.current_multiplier ?? currentMultiplier),
        payout: Number(result.payout ?? 0),
        result: 'win',
      });

      playTowerSound('cashout');
      toast.success(`Cashed out $${Number(result.payout ?? 0).toFixed(2)}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to cash out');
    }
  };

  const handleReset = () => {
    setTower(createTower(difficulty));
    setCurrentRow(0);
    setGameState('betting');
    setRoundId(null);
    playTowerSound('click');
  };

  const currentProfit = useMemo(() => {
    if (currentRow <= 0) return 0;
    return parseFloat(betAmount || '0') * currentMultiplier - parseFloat(betAmount || '0');
  }, [betAmount, currentMultiplier, currentRow]);

  const nextProfit = useMemo(() => {
    if (currentRow >= config.rows) return 0;
    return parseFloat(betAmount || '0') * nextMultiplier - parseFloat(betAmount || '0');
  }, [betAmount, nextMultiplier, currentRow, config.rows]);

  const rowsForDisplay = [...tower].reverse();

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-10 px-4 sm:px-6 lg:px-8 bg-[#0f1116]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_120px] gap-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#1a1d25] rounded-2xl p-4 border border-white/5 shadow-2xl h-fit"
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Bet Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => gameState === 'betting' && setBetAmount(e.target.value)}
                    disabled={gameState !== 'betting'}
                    className="pl-9 h-11 bg-[#232734] border-white/5 text-white rounded-xl"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-xs text-gray-400 mb-2 block">Risk</label>
                <button
                  onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                  disabled={gameState !== 'betting'}
                  className="w-full h-11 px-4 rounded-xl bg-[#232734] border border-white/5 text-white flex items-center justify-between"
                >
                  <span>{config.name}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showDifficultyDropdown && gameState === 'betting' && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d25] border border-white/5 rounded-xl overflow-hidden z-20 shadow-2xl">
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => {
                          setDifficulty(diff);
                          setTower(createTower(diff));
                          setShowDifficultyDropdown(false);
                          playTowerSound('click');
                        }}
                        className="w-full px-4 py-3 hover:bg-[#232734] text-left text-white text-sm transition-colors"
                      >
                        {DIFFICULTIES[diff].name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#232734] rounded-xl p-3">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Current Profit</span>
                  <span>{currentMultiplier.toFixed(2)}x</span>
                </div>
                <div className="text-lg font-bold text-white">${Math.max(0, currentProfit).toFixed(2)}</div>
              </div>

              <div className="bg-[#232734] rounded-xl p-3">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Next</span>
                  <span>{nextMultiplier.toFixed(2)}x</span>
                </div>
                <div className="text-lg font-bold text-white">${Math.max(0, nextProfit).toFixed(2)}</div>
              </div>

              {gameState === 'betting' ? (
                <Button
                  onClick={handleStartGame}
                  disabled={!user || parseFloat(betAmount) <= 0}
                  className="w-full h-11 rounded-xl bg-[#00e701] hover:bg-[#00c901] text-black font-semibold"
                >
                  Bet
                </Button>
              ) : gameState === 'playing' ? (
                <Button
                  onClick={handleCashout}
                  disabled={currentRow === 0}
                  className="w-full h-11 rounded-xl bg-[#00e701] hover:bg-[#00c901] text-black font-semibold disabled:opacity-50"
                >
                  Cashout
                </Button>
              ) : (
                <Button
                  onClick={handleReset}
                  className="w-full h-11 rounded-xl bg-[#00e701] hover:bg-[#00c901] text-black font-semibold"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#1a1d25] rounded-2xl p-5 border border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="space-y-2 max-w-2xl mx-auto">
              {rowsForDisplay.map((row, reversedIndex) => {
                const rowIndex = config.rows - 1 - reversedIndex;
                const isActiveRow = rowIndex === currentRow && gameState === 'playing';

                return (
                  <div key={rowIndex} className="flex items-center gap-3">
                    <div className="w-8 text-[11px] text-gray-500 text-right">
                      {rowIndex + 1}
                    </div>

                    <div className="flex-1 flex gap-2 justify-center">
                      {row.map((tile, tileIndex) => (
                        <motion.button
                          key={tile.id}
                          whileHover={isActiveRow ? { scale: 1.03 } : {}}
                          whileTap={isActiveRow ? { scale: 0.98 } : {}}
                          onClick={() => handleTileClick(rowIndex, tileIndex)}
                          disabled={gameState !== 'playing' || rowIndex !== currentRow || tile.isRevealed}
                          className={`relative h-14 sm:h-16 rounded-xl border transition-all flex items-center justify-center overflow-hidden ${
                            config.tilesPerRow === 2 ? 'w-44' :
                            config.tilesPerRow === 3 ? 'w-28' :
                            'w-24'
                          } ${
                            tile.isRevealed
                              ? tile.isMine
                                ? 'bg-[#4a1f28] border-red-400/40 shadow-[0_0_35px_rgba(239,68,68,0.22)]'
                                : 'bg-[#173427] border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.14)]'
                              : isActiveRow
                                ? 'bg-[#232734] border-white/10 hover:border-white/20'
                                : 'bg-[#16181f] border-white/5'
                          }`}
                        >
                          {!tile.isRevealed && isActiveRow && (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_60%)]" />
                          )}

                          {tile.isRevealed ? (
                            tile.isMine ? (
                              <motion.div
                                initial={{ scale: 0.7, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0, x: [0, -5, 5, -4, 4, -2, 2, 0] }}
                                transition={{ duration: 0.42 }}
                                className="relative flex items-center justify-center"
                              >
                                <div className="absolute w-12 h-12 rounded-2xl bg-red-500/15 border border-red-400/25 rotate-12 shadow-[0_0_30px_rgba(248,113,113,0.22)]" />
                                <div className="absolute w-10 h-10 rounded-full bg-red-500/25 blur-xl" />
                                <div className="absolute text-red-300/25 text-2xl rotate-[-18deg]">✦</div>
                                <Skull className="relative z-10 w-7 h-7 text-red-300 fill-red-400 drop-shadow-[0_0_14px_rgba(248,113,113,0.8)]" />
                              </motion.div>
                            ) : (
                              <motion.div
                                initial={{ scale: 0.78, y: 4 }}
                                animate={{ scale: 1, y: 0 }}
                                transition={{ duration: 0.22 }}
                                className="relative flex items-center justify-center"
                              >
                                <div className="absolute w-10 h-10 rounded-full bg-emerald-400/25 blur-xl" />
                                <Gem className="relative z-10 w-7 h-7 text-emerald-300 fill-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.85)]" />
                              </motion.div>
                            )
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-black/20 border border-white/5" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden xl:flex flex-col gap-2"
          >
            {[...config.multipliers].reverse().map((multiplierValue, reversedIndex) => {
              const realIndex = config.multipliers.length - 1 - reversedIndex;
              const isCurrent = realIndex === currentRow;
              const isPassed = realIndex < currentRow;

              return (
                <div
                  key={multiplierValue}
                  className={`h-12 rounded-xl flex items-center justify-center text-sm font-bold border transition-all ${
                    isCurrent
                      ? 'bg-[#00e701] text-black border-[#00e701]'
                      : isPassed
                        ? 'bg-[#173427] text-emerald-300 border-emerald-500/20'
                        : 'bg-[#1a1d25] text-gray-300 border-white/5'
                  }`}
                >
                  {multiplierValue.toFixed(2)}x
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
