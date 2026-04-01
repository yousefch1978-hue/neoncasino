import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Volume2, VolumeX } from 'lucide-react';

const GRID_SIZE = 25;
const RTP_FACTOR = 0.99;
const STORAGE_KEY = 'neon_mines_active_round_v1';

const gemSound = typeof Audio !== 'undefined' ? new Audio('/gem.mp3') : null;
const bombSound = typeof Audio !== 'undefined' ? new Audio('/bomb.mp3') : null;

function getProgressiveMultiplier(mines: number, revealedCount: number): number {
  if (revealedCount <= 0) return 1;

  let multi = 1;
  for (let i = 0; i < revealedCount; i++) {
    const tilesRemaining = GRID_SIZE - i;
    const safeRemaining = GRID_SIZE - mines - i;
    if (safeRemaining <= 0) break;
    multi *= RTP_FACTOR * (tilesRemaining / safeRemaining);
  }

  return multi;
}

function playFallbackSound(type: 'start' | 'safe' | 'bomb' | 'cashout') {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'start') {
      oscillator.frequency.setValueAtTime(420, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(610, audioContext.currentTime + 0.12);
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.14);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.14);
    } else if (type === 'safe') {
      oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.10);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.10);
    } else if (type === 'bomb') {
      oscillator.frequency.setValueAtTime(230, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.20);
      gainNode.gain.setValueAtTime(0.10, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.22);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.22);
    } else {
      oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.08);
      oscillator.frequency.setValueAtTime(820, audioContext.currentTime + 0.16);
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.22);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.22);
    }
  } catch {}
}

type GameState = 'idle' | 'playing' | 'lost';

type StoredRound = {
  bet: string;
  mines: number;
  gameState: GameState;
  revealed: number[];
  bombs: number[];
  soundEnabled: boolean;
  lockedBetAmount: number;
};

export default function MinesGame() {
  const { user, setUser } = useAuthStore();

  const [bet, setBet] = useState('10');
  const [mines, setMines] = useState(3);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [bombs, setBombs] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lockedBetAmount, setLockedBetAmount] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  const [revealingTiles, setRevealingTiles] = useState<number[]>([]);
  const [bombPulseTiles, setBombPulseTiles] = useState<number[]>([]);

  const numericBet = parseFloat(bet) || 0;
  const activeBetAmount = gameState === 'idle' ? numericBet : lockedBetAmount;

  const multiplier = useMemo(
    () => getProgressiveMultiplier(mines, revealed.length),
    [mines, revealed.length]
  );

  const nextMultiplier = useMemo(
    () => getProgressiveMultiplier(mines, revealed.length + 1),
    [mines, revealed.length]
  );

  const currentProfit = useMemo(() => {
    if (revealed.length <= 0) return 0;
    return activeBetAmount * multiplier;
  }, [activeBetAmount, multiplier, revealed.length]);

  const nextProfit = useMemo(() => {
    return activeBetAmount * nextMultiplier;
  }, [activeBetAmount, nextMultiplier]);

  const canCashout = gameState === 'playing' && revealed.length > 0;

  const playSound = (type: 'start' | 'safe' | 'bomb' | 'cashout') => {
    if (!soundEnabled) return;

    try {
      if (type === 'safe' && gemSound) {
        gemSound.currentTime = 0;
        void gemSound.play();
        return;
      }
      if (type === 'bomb' && bombSound) {
        bombSound.currentTime = 0;
        void bombSound.play();
        return;
      }
    } catch {}

    playFallbackSound(type);
  };

  const syncBalance = (amount: number) => {
    if (!user) return;

    const updated = { ...user, balance: Number(amount.toFixed(2)) };
    setUser(updated);

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) =>
      u.id === user.id ? { ...u, balance: Number(amount.toFixed(2)) } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));
  };

  const clearSavedRound = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const saved: StoredRound = JSON.parse(raw);

      setBet(saved.bet ?? '10');
      setMines(saved.mines ?? 3);
      setGameState(saved.gameState ?? 'idle');
      setRevealed(Array.isArray(saved.revealed) ? saved.revealed : []);
      setBombs(Array.isArray(saved.bombs) ? saved.bombs : []);
      setSoundEnabled(typeof saved.soundEnabled === 'boolean' ? saved.soundEnabled : true);
      setLockedBetAmount(typeof saved.lockedBetAmount === 'number' ? saved.lockedBetAmount : 0);
    } catch {
      clearSavedRound();
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload: StoredRound = {
      bet,
      mines,
      gameState,
      revealed,
      bombs,
      soundEnabled,
      lockedBetAmount,
    };

    if (gameState === 'idle' && revealed.length === 0 && bombs.length === 0) {
      clearSavedRound();
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [bet, mines, gameState, revealed, bombs, soundEnabled, lockedBetAmount, hydrated]);

  const startGame = () => {
    if (!user) return;

    if (gameState === 'playing') {
      toast.error('Finish the current round first');
      return;
    }

    if (numericBet <= 0) {
      toast.error('Enter a valid bet');
      return;
    }

    if (mines !== 1 && mines !== 24) {
  toast.error('Only 1 or 24 mines allowed');
  return;
}

    if (numericBet > user.balance) {
      toast.error('Not enough balance');
      return;
    }

    const bombPositions: number[] = [];
    while (bombPositions.length < mines) {
      const rand = Math.floor(Math.random() * GRID_SIZE);
      if (!bombPositions.includes(rand)) bombPositions.push(rand);
    }

    syncBalance(user.balance - numericBet);
    setLockedBetAmount(numericBet);
    setBombs(bombPositions);
    setRevealed([]);
    setRevealingTiles([]);
    setBombPulseTiles([]);
    setGameState('playing');
    playSound('start');
  };

  const handleClick = (index: number) => {
  if (
    gameState !== 'playing' ||
    revealed.includes(index) ||
    revealingTiles.includes(index)
  ) return;

  setRevealingTiles((prev) => [...prev, index]);

  window.setTimeout(() => {
    setRevealingTiles((prev) => prev.filter((x) => x !== index));

    if (bombs.includes(index)) {
      setBombPulseTiles((prev) => [...prev, index]);
      setGameState('lost');
      playSound('bomb');
      toast.error('💣 You hit a bomb!');
      return;
    }

    const newRevealed = [...revealed, index];
    setRevealed(newRevealed);
    playSound('safe');

    const safeTiles = GRID_SIZE - mines;
    if (newRevealed.length >= safeTiles && user) {
      const finalMultiplier = getProgressiveMultiplier(mines, newRevealed.length);
      const payout = Number((lockedBetAmount * finalMultiplier).toFixed(2));

      window.setTimeout(() => {
        syncBalance(user.balance + payout);
        setGameState('idle');
        setBombs([]);
        setRevealed([]);
        setRevealingTiles([]);
        setBombPulseTiles([]);
        setLockedBetAmount(0);
        clearSavedRound();
        playSound('cashout');
        toast.success(`🏆 Board cleared! ${finalMultiplier.toFixed(2)}x • You won $${payout.toFixed(2)}`);
      }, 220);
    }
  }, 160);
};

  const cashout = () => {
    if (!user || !canCashout) return;

    const payout = Number((lockedBetAmount * multiplier).toFixed(2));
    syncBalance(user.balance + payout);

    setGameState('idle');
    setBombs([]);
    setRevealed([]);
    setRevealingTiles([]);
    setBombPulseTiles([]);
    setLockedBetAmount(0);
    clearSavedRound();
    playSound('cashout');

    toast.success(`💰 Cashed out $${payout.toFixed(2)}`);
  };

  const resetBoard = () => {
    setRevealed([]);
    setBombs([]);
    setRevealingTiles([]);
    setBombPulseTiles([]);
    setGameState('idle');
    setLockedBetAmount(0);
    clearSavedRound();
  };

  if (!hydrated) {
    return <div className="min-h-[calc(100vh-72px)] bg-[#0c1320]" />;
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#0c1320] text-white px-3 py-3 overflow-y-auto">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 xl:grid-cols-[255px_1fr] gap-4">
        <div className="bg-[#182433] rounded-2xl border border-white/5 p-4 h-fit xl:sticky xl:top-3">
          <div className="space-y-4">
            <div className="bg-[#132031] rounded-full p-1 flex items-center">
              <button className="flex-1 h-10 rounded-full bg-[#55687d] text-white font-semibold">
                Manual
              </button>
              <button
                onClick={() => setSoundEnabled((s) => !s)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400">Bet Amount</label>
              <Input
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                disabled={gameState !== 'idle'}
                className="mt-2 h-11 bg-[#0f1825] border-white/5 text-white"
              />
            </div>

            <div>
  <label className="text-xs uppercase tracking-wide text-gray-400">Mines</label>

  <div className="mt-2 flex gap-2">
    <button
      onClick={() => setMines(1)}
      disabled={gameState !== 'idle'}
      className={`flex-1 h-10 rounded-lg font-semibold transition ${
        mines === 1
          ? 'bg-[#3f7de0] text-white'
          : 'bg-[#0f1825] text-gray-300 hover:bg-[#162235]'
      }`}
    >
      1 Mine
    </button>

    <button
      onClick={() => setMines(24)}
      disabled={gameState !== 'idle'}
      className={`flex-1 h-10 rounded-lg font-semibold transition ${
        mines === 24
          ? 'bg-[#3f7de0] text-white'
          : 'bg-[#0f1825] text-gray-300 hover:bg-[#162235]'
      }`}
    >
      24 Mines
    </button>
  </div>
</div>

            <div className="rounded-xl bg-[#0f1825] border border-white/5 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Multiplier</span>
                <span className="font-semibold text-emerald-300">{multiplier.toFixed(2)}x</span>
              </div>
            </div>

            <div className="rounded-xl bg-[#0f1825] border border-white/5 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Profit</span>
                <span className="font-semibold">${currentProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-xl bg-[#0f1825] border border-white/5 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Next Profit</span>
                <span className="font-semibold">${nextProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-xl bg-[#0f1825] border border-white/5 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Safe Picks</span>
                <span className="font-semibold">{revealed.length}</span>
              </div>
            </div>

            {gameState === 'idle' && (
              <Button onClick={startGame} className="w-full h-11 rounded-xl bg-[#3f7de0] hover:bg-[#3873cf] text-white font-semibold">
                Place Bet
              </Button>
            )}

            {gameState === 'playing' && (
              <Button
                onClick={cashout}
                disabled={!canCashout}
                className="w-full h-11 rounded-xl bg-[#3f7de0] hover:bg-[#3873cf] text-white font-semibold disabled:opacity-50"
              >
                {canCashout ? 'Cashout' : 'Pick 1 tile first'}
              </Button>
            )}

            {gameState === 'lost' && (
              <div className="space-y-2">
                <Button onClick={startGame} className="w-full h-11 rounded-xl bg-[#3f7de0] hover:bg-[#3873cf] text-white font-semibold">
                  Bet Again
                </Button>
                <Button
                  onClick={resetBoard}
                  className="w-full h-11 rounded-xl bg-[#0f1825] hover:bg-[#142131] text-white border border-white/5"
                >
                  New Setup
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="relative bg-[#0d1627] rounded-2xl border border-white/5 p-4 sm:p-5 flex items-start justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(70,100,180,0.10),transparent_70%)]" />
          <div className="relative w-full max-w-[560px] aspect-square mx-auto">
            <div className="grid grid-cols-5 gap-3 h-full">
              {Array.from({ length: GRID_SIZE }).map((_, i) => {
                const isSafe = revealed.includes(i);
                const isBomb = bombs.includes(i);
                const showBomb = gameState === 'lost' && isBomb;
                const isRevealing = revealingTiles.includes(i);
                const pulseBomb = bombPulseTiles.includes(i);

                return (
                  <motion.button
                    key={i}
                    onClick={() => handleClick(i)}
                    whileHover={{ scale: gameState === 'playing' && !isSafe ? 1.02 : 1 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={gameState !== 'playing' || isSafe || isRevealing}
                    className={`relative aspect-square overflow-hidden rounded-xl border transition-all duration-150 flex items-center justify-center ${
                      isSafe
                        ? 'bg-gradient-to-br from-[#22344f] to-[#18263b] border-[#78b9ff]/70'
                        : showBomb
                          ? 'bg-gradient-to-br from-[#341b22] to-[#170d12] border-red-400/60'
                          : 'bg-gradient-to-br from-[#1b2840] to-[#152133] border-white/5 hover:border-white/15'
                    }`}
                  >
                    {!isSafe && !showBomb && !isRevealing && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)]" />
                    )}

                    <AnimatePresence>
                      {isRevealing && (
                        <motion.div
                          initial={{ opacity: 0.15, scale: 0.92 }}
                          animate={{ opacity: 0.5, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.14 }}
                          className="absolute inset-0 rounded-xl bg-white/10 border border-white/10"
                        />
                      )}
                    </AnimatePresence>

                    {isSafe && (
                      <>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(120,185,255,0.18),transparent_65%)]"
                        />
                        <motion.img
                          src="/mines-gem.png"
                          alt="Gem"
                          initial={{ opacity: 0, scale: 0.92, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.16 }}
                          className="relative z-10 w-[96%] h-[96%] object-contain"
                        />
                        <motion.div
                          initial={{ opacity: 0.45, scale: 0.8 }}
                          animate={{ opacity: 0, scale: 1.15 }}
                          transition={{ duration: 0.28 }}
                          className="absolute inset-3 rounded-xl bg-blue-300/10 blur-md"
                        />
                      </>
                    )}

                    {showBomb && (
                      <motion.div
                        initial={pulseBomb ? { scale: 0.92 } : { opacity: 0 }}
                        animate={pulseBomb ? { scale: [0.92, 1.04, 1] } : { opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10 w-full h-full flex items-center justify-center"
                      >
                        <motion.div
                          initial={{ opacity: 0.2 }}
                          animate={{ opacity: [0.18, 0.32, 0.18] }}
                          transition={{ duration: 0.4, repeat: 1 }}
                          className="absolute inset-0 rounded-xl bg-red-500/10"
                        />
                        <motion.img
                          src="/mines-bomb-clean.png"
                          alt="Bomb"
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.16 }}
                          className="relative z-10 w-[96%] h-[96%] object-contain"
                        />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
