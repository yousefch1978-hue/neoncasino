import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';
import { startCrashRound, cashoutCrashRound, resolveCrashRound } from '@/lib/crash';

const playCrashSound = (type: 'start' | 'cashout' | 'crash') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'start') {
      oscillator.frequency.setValueAtTime(420, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(620, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } else if (type === 'cashout') {
      oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.08);
      oscillator.frequency.setValueAtTime(820, audioContext.currentTime + 0.16);
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.28);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.28);
    } else {
      oscillator.frequency.setValueAtTime(240, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  } catch {}
};

export default function CrashGame() {
  const { user, setUser } = useAuthStore();
  const { addBet } = useGameStore();

  const [betAmount, setBetAmount] = useState('10.00');
  const [cashoutAt, setCashoutAt] = useState('2.00');
  const [gameState, setGameState] = useState<'idle' | 'running' | 'finished'>('idle');
  const [multiplier, setMultiplier] = useState(1);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [didCashout, setDidCashout] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [statusTone, setStatusTone] = useState<'neutral' | 'green' | 'red'>('neutral');

  const intervalRef = useRef<number | null>(null);
  const autoTriggeredRef = useRef(false);

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

  const stopTicker = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTicker();
  }, []);

  useEffect(() => {
    if (gameState !== 'running' || !crashPoint || !roundId || !user) return;

    const startedAt = performance.now();

    stopTicker();
    intervalRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;

      // Much slower climb
      let next = 1 + elapsed * 0.095 + Math.pow(elapsed, 1.32) * 0.024;
      next = Number(next.toFixed(2));

      if (next >= crashPoint) {
        next = Number(crashPoint.toFixed(2));
      }

      setMultiplier(next);
    }, 160);

    return () => stopTicker();
  }, [gameState, crashPoint, roundId, user]);

  useEffect(() => {
    if (gameState !== 'running' || !crashPoint || !roundId || !user) return;

    if (multiplier >= crashPoint && !didCashout) {
      const lose = async () => {
        try {
          stopTicker();
          const resolved = await resolveCrashRound(user.id, roundId);
          setGameState('finished');
          setCrashPoint(Number(resolved.crash_point ?? crashPoint));
          setStatusText(`Crashed at ${Number(resolved.crash_point ?? crashPoint).toFixed(2)}x`);
          setStatusTone('red');
          playCrashSound('crash');

          addBet({
            userId: user.id,
            username: user.username,
            game: 'crash',
            amount: parseFloat(betAmount),
            multiplier: 0,
            payout: 0,
            result: 'loss',
          });

          toast.error(`Crashed at ${Number(resolved.crash_point ?? crashPoint).toFixed(2)}x`);
        } catch (error) {
          console.error(error);
          setStatusText('Round failed');
          setStatusTone('red');
        }
      };

      lose();
    }
  }, [multiplier, crashPoint, gameState, didCashout, roundId, user, addBet, betAmount]);

  useEffect(() => {
    if (gameState !== 'running' || didCashout || !roundId || !user || autoTriggeredRef.current) return;

    const auto = Number(cashoutAt.replace(',', '.'));
    if (!isNaN(auto) && auto > 1.01 && multiplier >= auto) {
      autoTriggeredRef.current = true;
      handleCashout(true);
    }
  }, [multiplier]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHalfBet = () => {
    if (gameState !== 'idle') return;
    const amount = Math.max(0.01, parseFloat(betAmount || '0') / 2);
    setBetAmount(amount.toFixed(2));
  };

  const handleDoubleBet = () => {
    if (gameState !== 'idle') return;
    const amount = Math.max(0.01, parseFloat(betAmount || '0') * 2);
    setBetAmount(amount.toFixed(2));
  };

  const handleStart = async () => {
    if (!user) {
      toast.error('Please login first');
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
      stopTicker();

      const started = await startCrashRound(user.id, amount);

      if (!started?.success) {
        toast.error(started?.error || 'Failed to start crash');
        return;
      }

      setRoundId(started.round_id);
      setCrashPoint(Number(started.crash_point));
      setMultiplier(1);
      setDidCashout(false);
      setGameState('running');
      syncUserBalance(Number(started.balance ?? user.balance));
      autoTriggeredRef.current = false;
      setStatusText(`Round started — auto at ${Number(cashoutAt.replace(',', '.')).toFixed(2)}x`);
      setStatusTone('neutral');
      playCrashSound('start');
    } catch (error) {
      console.error(error);
      toast.error('Failed to start crash');
      setStatusText('Start failed');
      setStatusTone('red');
    }
  };

  const handleCashout = async (isAuto = false) => {
    if (!user || !roundId || gameState !== 'running' || didCashout) return;
    if (multiplier <= 1.01) return;

    try {
      const result = await cashoutCrashRound(user.id, roundId, multiplier);

      if (!result?.success) {
        toast.error(result?.error || 'Failed to cash out');
        return;
      }

      stopTicker();

      setDidCashout(true);
      setGameState('finished');
      setCrashPoint(Number(result.crash_point ?? crashPoint));
      syncUserBalance(Number(result.balance ?? user.balance));

      const stoppedAt = Number(result.cashout_multiplier ?? multiplier);

      addBet({
        userId: user.id,
        username: user.username,
        game: 'crash',
        amount: parseFloat(betAmount),
        multiplier: stoppedAt,
        payout: Number(result.payout ?? 0),
        result: result.won ? 'win' : 'loss',
      });

      if (result.won) {
        playCrashSound('cashout');
        setStatusText(isAuto ? `Bet stopped — ${stoppedAt.toFixed(2)}x hit` : `Cashed out — ${stoppedAt.toFixed(2)}x hit`);
        setStatusTone('green');
        toast.success(
          `${isAuto ? 'Auto cashout' : 'Cashed out'} at ${stoppedAt.toFixed(2)}x and won $${Number(result.payout ?? 0).toFixed(2)}`
        );
      } else {
        playCrashSound('crash');
        setStatusText(`Too late — crashed at ${Number(result.crash_point ?? crashPoint).toFixed(2)}x`);
        setStatusTone('red');
        toast.error(`Too late. Crashed at ${Number(result.crash_point ?? crashPoint).toFixed(2)}x`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to cash out');
      setStatusText('Cashout failed');
      setStatusTone('red');
    }
  };

  const handleReset = () => {
    stopTicker();
    setGameState('idle');
    setMultiplier(1);
    setRoundId(null);
    setCrashPoint(null);
    setDidCashout(false);
    autoTriggeredRef.current = false;
    setStatusText('Ready');
    setStatusTone('neutral');
  };

  const targetPayout = useMemo(() => {
    const bet = parseFloat(betAmount || '0');
    const target = Number(cashoutAt.replace(',', '.'));
    if (isNaN(bet) || isNaN(target) || target <= 1) return 0;
    return bet * target;
  }, [betAmount, cashoutAt]);

  const livePayout = useMemo(() => {
    const bet = parseFloat(betAmount || '0');
    if (isNaN(bet) || bet <= 0) return 0;
    return bet * multiplier;
  }, [betAmount, multiplier]);

  const payoutDisplay = gameState === 'running' ? livePayout : targetPayout;

  // Simple, cheap graph positioning
  const dotX = Math.max(12, Math.min(70, 12 + (multiplier - 1) * 18));
  const dotY = Math.max(30, Math.min(88, 88 - (multiplier - 1) * 11));
  const elapsedForDisplay = Math.max(1, (multiplier - 1) * 11);

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-10 px-4 sm:px-6 lg:px-8 bg-[#0f212e]">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#1f3848] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] min-h-[640px]">
            <div className="bg-[#223a49] p-4 border-r border-black/20">
              <div className="bg-[#132531] rounded-full p-1 flex mb-5">
                <button className="flex-1 h-12 rounded-full bg-[#455f74] text-white font-semibold">
                  Manual
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Bet Amount</span>
                    <span>${parseFloat(betAmount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-white/10 bg-[#0f212e]">
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => gameState === 'idle' && setBetAmount(e.target.value)}
                      disabled={gameState === 'running'}
                      className="h-14 border-0 bg-transparent text-white rounded-none"
                    />
                    <button
                      onClick={handleHalfBet}
                      disabled={gameState !== 'idle'}
                      className="w-14 bg-[#455f74] text-white text-lg disabled:opacity-50"
                    >
                      ½
                    </button>
                    <button
                      onClick={handleDoubleBet}
                      disabled={gameState !== 'idle'}
                      className="w-14 bg-[#455f74] text-white text-lg border-l border-black/10 disabled:opacity-50"
                    >
                      2×
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-300 mb-2">Cashout At</div>
                  <div className="flex rounded-xl overflow-hidden border border-white/10 bg-[#0f212e]">
                    <Input
                      type="number"
                      value={cashoutAt}
                      onChange={(e) => setCashoutAt(e.target.value)}
                      className="h-14 border-0 bg-transparent text-white rounded-none"
                    />
                    <button className="w-14 flex items-center justify-center bg-[#455f74] text-white border-l border-black/10">
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {gameState === 'idle' ? (
                  <Button
                    onClick={handleStart}
                    className="w-full h-14 rounded-xl bg-[#66e383] hover:bg-[#58d774] text-white font-semibold text-lg"
                  >
                    Bet
                  </Button>
                ) : gameState === 'running' ? (
                  <Button
                    onClick={() => handleCashout(false)}
                    disabled={multiplier <= 1.01}
                    className="w-full h-14 rounded-xl bg-[#2d74da] hover:bg-[#2667c6] text-white font-semibold text-lg disabled:opacity-60"
                  >
                    Cash Out @ {multiplier.toFixed(2)}x
                  </Button>
                ) : (
                  <Button
                    onClick={handleReset}
                    className="w-full h-14 rounded-xl bg-[#2d74da] hover:bg-[#2667c6] text-white font-semibold text-lg"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                )}

                <div>
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Profit on Win</span>
                    <span>${payoutDisplay.toFixed(2)}</span>
                  </div>
                  <div className="h-14 rounded-xl border border-white/10 bg-[#0f212e] flex items-center px-4 text-white text-xl font-semibold">
                    ${payoutDisplay.toFixed(2)}
                  </div>
                </div>

                <div className="h-14 rounded-xl bg-[#132531] flex items-center justify-between px-4 text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">👥</span>
                    <span>0</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">🪙</span>
                    <span>$0.00</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0c2230] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)]" />

              <div className="relative h-full p-8">
                <div className="absolute left-7 top-24 bottom-16 w-6 flex flex-col justify-between">
                  {[1.8, 1.7, 1.5, 1.3, 1.2, 1.0].map((mark) => (
                    <div
                      key={mark}
                      className="w-12 h-10 rounded-md bg-[#45515f] text-white text-xl font-bold flex items-center justify-center shadow"
                    >
                      {mark.toFixed(1)}x
                    </div>
                  ))}
                </div>

                <div className="ml-20 h-full relative">
                  {/* orange fill */}
                  <div
                    className="absolute left-[12%] bottom-[12%] bg-[#f4a633]"
                    style={{
                      width: `${Math.max(2, dotX - 12)}%`,
                      height: `${Math.max(2, 88 - dotY)}%`,
                      clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%)',
                      opacity: 0.95,
                    }}
                  />

                  {/* white line */}
                  <div
                    className="absolute left-[12%] bottom-[12%] origin-left bg-white rounded-full"
                    style={{
                      width: `${Math.max(6, Math.hypot((dotX - 12) * 8, (88 - dotY) * 5))}px`,
                      height: '8px',
                      transform: `rotate(${-Math.atan2((88 - dotY) * 5, (dotX - 12) * 8) * 180 / Math.PI}deg)`,
                    }}
                  />

                  {/* moving dot */}
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ease-linear"
                    style={{
                      left: `${dotX}%`,
                      top: `${dotY}%`,
                    }}
                  >
                    <div className={`w-7 h-7 rounded-full shadow-2xl ${
                      gameState === 'finished' && !didCashout ? 'bg-red-500' : 'bg-white'
                    }`} />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`text-7xl sm:text-8xl font-black tracking-tight ${
                      gameState === 'finished' && !didCashout ? 'text-red-500' : 'text-white'
                    }`}>
                      {multiplier.toFixed(2)}x
                    </div>
                  </div>

                  <div
                    className={`absolute right-10 top-10 text-sm font-semibold ${
                      statusTone === 'green'
                        ? 'text-emerald-400'
                        : statusTone === 'red'
                          ? 'text-red-400'
                          : 'text-gray-300'
                    }`}
                  >
                    {statusText}
                  </div>

                  <div className="absolute left-10 right-10 bottom-8 flex justify-between text-white/85 text-2xl font-semibold">
                    <span>2s</span>
                    <span>4s</span>
                    <span>6s</span>
                    <span>8s</span>
                    <span>Total {elapsedForDisplay.toFixed(0)}s</span>
                  </div>

                  <div className="absolute right-10 bottom-2 text-sm text-gray-300 flex items-center gap-2">
                    <span>Network Status</span>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
