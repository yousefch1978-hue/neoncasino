import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Shield, RefreshCw, DollarSign, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';
import { startCoinflipRound, finishCoinflipRound, getActiveCoinflipRound } from '@/lib/coinflip';

const playSound = (type: 'flip' | 'win' | 'lose' | 'click') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'flip') {
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.25);
      gainNode.gain.setValueAtTime(0.18, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'win') {
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.08);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.16);
      gainNode.gain.setValueAtTime(0.22, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.45);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.45);
    } else if (type === 'lose') {
      oscillator.frequency.setValueAtTime(320, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.35);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.35);
    } else {
      oscillator.frequency.setValueAtTime(760, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
    }
  } catch {}
};

export default function CoinFlipGame() {
  const { user, setUser } = useAuthStore();
  const { addBet } = useGameStore();

  const [betAmount, setBetAmount] = useState('10');
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails' | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'flipping' | 'finished'>('idle');
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [, setRoundId] = useState<string | null>(null);

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
        const active = await getActiveCoinflipRound(user.id);
        if (!active?.success || !active?.round) return;

        setRoundId(active.round.id);
        setBetAmount(String(active.round.bet_amount ?? '10'));
        setSelectedSide(active.round.choice ?? null);
        setGameState('flipping');

        setTimeout(async () => {
          try {
            const resolved = await finishCoinflipRound(user.id, active.round.id);

            if (!resolved?.success) {
              toast.error(resolved?.error || 'Failed to finish coinflip');
              setGameState('idle');
              return;
            }

            const finalResult = resolved.result as 'heads' | 'tails';
            setResult(finalResult);
            setGameState('finished');
            syncUserBalance(Number(resolved.balance ?? user.balance));

            const amount = parseFloat(String(active.round.bet_amount ?? 0));
            addBet({
              userId: user.id,
              username: user.username,
              game: 'coinflip',
              amount,
              multiplier: resolved.won ? 2 : 0,
              payout: Number(resolved.payout ?? 0),
              result: resolved.won ? 'win' : 'loss',
            });

            if (resolved.won) {
              if (soundEnabled) playSound('win');
              toast.success(`You won $${Number(resolved.payout ?? 0).toFixed(2)}!`);
            } else {
              if (soundEnabled) playSound('lose');
              toast.error(`You lost $${amount.toFixed(2)}!`);
            }
          } catch (error) {
            console.error(error);
            toast.error('Failed to finish coinflip');
            setGameState('idle');
          }
        }, 1800);
      } catch (error) {
        console.error(error);
      }
    };

    loadActiveRound();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlip = async () => {
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

    if (!selectedSide) {
      toast.error('Please choose heads or tails');
      return;
    }

    try {
      const started = await startCoinflipRound(user.id, amount, selectedSide);

      if (!started?.success) {
        toast.error(started?.error || 'Failed to start coinflip');
        return;
      }

      setRoundId(started.round_id);
      syncUserBalance(Number(started.balance ?? user.balance));
      setGameState('flipping');
      setResult(null);

      if (soundEnabled) playSound('flip');

      setTimeout(async () => {
        try {
          const resolved = await finishCoinflipRound(user.id, started.round_id);

          if (!resolved?.success) {
            toast.error(resolved?.error || 'Failed to finish coinflip');
            setGameState('idle');
            return;
          }

          const finalResult = resolved.result as 'heads' | 'tails';
          setResult(finalResult);
          setGameState('finished');
          syncUserBalance(Number(resolved.balance ?? user.balance));

          addBet({
            userId: user.id,
            username: user.username,
            game: 'coinflip',
            amount,
            multiplier: resolved.won ? 2 : 0,
            payout: Number(resolved.payout ?? 0),
            result: resolved.won ? 'win' : 'loss',
          });

          if (resolved.won) {
            if (soundEnabled) playSound('win');
            toast.success(`You won $${Number(resolved.payout ?? 0).toFixed(2)}!`);
          } else {
            if (soundEnabled) playSound('lose');
            toast.error(`You lost $${amount.toFixed(2)}!`);
          }
        } catch (error) {
          console.error(error);
          toast.error('Failed to finish coinflip');
          setGameState('idle');
        }
      }, 2200);
    } catch (error) {
      console.error(error);
      toast.error('Failed to start coinflip');
    }
  };

  const handleReset = () => {
    if (soundEnabled) playSound('click');
    setGameState('idle');
    setResult(null);
    setSelectedSide(null);
  };

  const won = result === selectedSide && result !== null && gameState === 'finished';
  const potentialPayout = useMemo(() => {
    const amount = parseFloat(betAmount || '0');
    return Number.isFinite(amount) ? amount * 2 : 0;
  }, [betAmount]);

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-dark-800/60 backdrop-blur mb-4">
            <Sparkles className="w-4 h-4 text-neon-green" />
            <span className="text-xs sm:text-sm text-gray-300">Premium Coinflip</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-neon-green to-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,135,0.25)]">
              <span className="text-2xl">🪙</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Coin Flip</h1>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-dark-800 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <p className="text-gray-400 text-sm sm:text-base">
            Clean UI. Backend-secure result. Instant payout handling.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-dark-800/75 backdrop-blur-xl rounded-3xl border border-white/10 p-5 sm:p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4 text-neon-green" />
              <span className="text-sm text-gray-300">Backend controlled result</span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Bet Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => gameState === 'idle' && setBetAmount(e.target.value)}
                    disabled={gameState === 'flipping'}
                    className="pl-10 h-12 bg-dark-700/70 border-white/10 text-white rounded-2xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Choose Side</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      if (gameState !== 'idle') return;
                      if (soundEnabled) playSound('click');
                      setSelectedSide('heads');
                    }}
                    disabled={gameState === 'flipping'}
                    className={`rounded-2xl border p-4 transition-all ${
                      selectedSide === 'heads'
                        ? 'border-neon-green bg-neon-green/10 shadow-[0_0_25px_rgba(0,255,135,0.12)]'
                        : 'border-white/10 bg-dark-700/40 hover:border-white/20'
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 flex items-center justify-center shadow-lg mb-3">
                      <span className="text-3xl">👑</span>
                    </div>
                    <div className="text-white font-semibold">Heads</div>
                    <div className="text-xs text-gray-400 mt-1">Royal side</div>
                  </button>

                  <button
                    onClick={() => {
                      if (gameState !== 'idle') return;
                      if (soundEnabled) playSound('click');
                      setSelectedSide('tails');
                    }}
                    disabled={gameState === 'flipping'}
                    className={`rounded-2xl border p-4 transition-all ${
                      selectedSide === 'tails'
                        ? 'border-neon-green bg-neon-green/10 shadow-[0_0_25px_rgba(0,255,135,0.12)]'
                        : 'border-white/10 bg-dark-700/40 hover:border-white/20'
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-300 via-slate-500 to-slate-700 flex items-center justify-center shadow-lg mb-3">
                      <span className="text-3xl">🦅</span>
                    </div>
                    <div className="text-white font-semibold">Tails</div>
                    <div className="text-xs text-gray-400 mt-1">Wild side</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-dark-700/30 p-4">
                  <div className="text-xs text-gray-400 mb-1">Potential Payout</div>
                  <div className="text-lg font-bold text-neon-green">${potentialPayout.toFixed(2)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-dark-700/30 p-4">
                  <div className="text-xs text-gray-400 mb-1">Selected</div>
                  <div className="text-lg font-bold text-white capitalize">{selectedSide ?? '-'}</div>
                </div>
              </div>

              {gameState !== 'finished' ? (
                <Button
                  onClick={handleFlip}
                  disabled={!user || gameState === 'flipping' || !selectedSide}
                  className="w-full h-12 rounded-2xl bg-neon-green text-dark-900 hover:bg-neon-green/90 font-bold text-base"
                >
                  {gameState === 'flipping' ? 'Flipping...' : 'Flip Coin'}
                </Button>
              ) : (
                <Button
                  onClick={handleReset}
                  className="w-full h-12 rounded-2xl bg-neon-green text-dark-900 hover:bg-neon-green/90 font-bold text-base"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-dark-800/55 backdrop-blur-xl rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col justify-center min-h-[520px]"
          >
            <div className="text-center mb-6">
              <div className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">Live Round</div>
              <div className="text-white text-lg font-semibold">
                {gameState === 'idle' && 'Ready to flip'}
                {gameState === 'flipping' && 'Resolving on backend...'}
                {gameState === 'finished' && (won ? 'Winner winner' : 'Try again')}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                <motion.div
                  animate={{
                    rotateY:
                      gameState === 'flipping'
                        ? [0, 360, 720, 1080, 1440, 1800]
                        : result === 'tails'
                          ? 180
                          : 0,
                    y: gameState === 'flipping' ? [0, -16, 0, -10, 0] : 0,
                  }}
                  transition={{
                    duration: gameState === 'flipping' ? 2.2 : 0.5,
                    ease: gameState === 'flipping' ? 'linear' : 'easeOut',
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="relative w-52 h-52 sm:w-72 sm:h-72"
                >
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                  >
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-800 border-[6px] border-yellow-200 shadow-[0_20px_80px_rgba(255,215,0,0.25)] flex items-center justify-center">
                      <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700 border-2 border-yellow-200 flex items-center justify-center">
                        <span className="text-7xl sm:text-8xl">👑</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 via-slate-500 to-slate-800 border-[6px] border-slate-100 shadow-[0_20px_80px_rgba(148,163,184,0.22)] flex items-center justify-center">
                      <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-br from-slate-300 via-slate-500 to-slate-700 border-2 border-slate-200 flex items-center justify-center">
                        <span className="text-7xl sm:text-8xl">🦅</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {gameState === 'finished' && (
                    <motion.div
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 18 }}
                      className="absolute left-1/2 -translate-x-1/2 -bottom-28 sm:-bottom-24 text-center w-max"
                    >
                      <div className={`text-3xl sm:text-4xl font-black ${won ? 'text-neon-green' : 'text-red-500'}`}>
                        {won ? 'YOU WON' : 'YOU LOST'}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Result: {result === 'heads' ? '👑 Heads' : result === 'tails' ? '🦅 Tails' : '-'}
                      </div>
                      <div className={`text-lg font-bold mt-2 ${won ? 'text-neon-green' : 'text-red-400'}`}>
                        {won ? `+$${potentialPayout.toFixed(2)}` : `-$${parseFloat(betAmount || '0').toFixed(2)}`}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
