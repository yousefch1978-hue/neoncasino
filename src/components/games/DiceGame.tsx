import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, RefreshCw, Volume2, VolumeX, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

// Sound effects
const playSound = (type: 'roll' | 'win' | 'lose' | 'click') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'roll') {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'win') {
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'lose') {
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.4);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else if (type === 'click') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  } catch (e) {}
};

// Generate true random dice roll
const generateRoll = (): number => {
  // uniform random 0-100 (fair)

  return Number((Math.random() * 100).toFixed(2));
};

const HOUSE_EDGE = 0.12;
const RTP = 1 - HOUSE_EDGE;

// Calculate multiplier based on win chance
const calculateMultiplier = (winChance: number): number => {
  return Number((RTP / (winChance / 100)).toFixed(4));
};

// Animated number component
function AnimatedNumber({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = Math.random() * 100;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.8) {
        // Random bouncing during animation
        setDisplayValue(Math.random() * 100);
      } else {
        // Gradually settle to final value
        const current = startValue + (value - startValue) * ((progress - 0.8) / 0.2);
        setDisplayValue(current);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={isAnimating ? 'tabular-nums' : ''}>
      {displayValue.toFixed(2)}
    </span>
  );
}

const DICE_SAVE_KEY = 'activeDiceGameV1';

export default function DiceGame() {
  const { user, updateBalance } = useAuthStore();
  const { addBet } = useGameStore();

  const [betAmount, setBetAmount] = useState('10');
  const [target, setTarget] = useState(50);
  const [isOver, setIsOver] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'rolling' | 'finished'>('idle');
  const [result, setResult] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [roundSettled, setRoundSettled] = useState(false);
  
  const resultRef = useRef<HTMLDivElement>(null);
  const settleTimeoutRef = useRef<number | null>(null);

  const winChance = isOver ? 100 - target : target;
  const multiplier = calculateMultiplier(winChance);
  const potentialWin = parseFloat(betAmount || '0') * multiplier;

  const playAudio = useCallback((type: 'roll' | 'win' | 'lose' | 'click') => {
    if (soundEnabled) playSound(type);
  }, [soundEnabled]);

  const finalizeRoll = useCallback((rollResult: number, amount: number) => {
    if (roundSettled) return;

    const won = isOver ? rollResult > target : rollResult < target;

    setResult(rollResult);
    setGameState('finished');
    setRoundSettled(true);
    localStorage.removeItem(DICE_SAVE_KEY);

    addBet({
      userId: user!.id,
      username: user!.username,
      game: 'dice',
      amount,
      multiplier: won ? multiplier : 0,
      payout: won ? amount * multiplier : 0,
      result: won ? 'win' : 'loss',
    });

    if (won) {
      updateBalance(amount * multiplier);
      playAudio('win');
      toast.success(`You won $${(amount * multiplier).toFixed(2)}!`);
    } else {
      playAudio('lose');
      toast.error(`You lost $${amount.toFixed(2)}!`);
    }
  }, [roundSettled, isOver, target, multiplier, user, addBet, updateBalance, playAudio]);

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DICE_SAVE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);

      if (saved.roundSettled || saved.gameState !== 'rolling') {
        localStorage.removeItem(DICE_SAVE_KEY);
        return;
      }

      setBetAmount(String(saved.betAmount ?? '10'));
      setTarget(Number(saved.target ?? 50));
      setIsOver(Boolean(saved.isOver));
      setGameState('rolling');
      setResult(null);
      setServerSeed(String(saved.serverSeed ?? ''));
      setClientSeed(String(saved.clientSeed ?? ''));
      setRoundSettled(false);

      const remaining = Math.max(0, Number(saved.settleAt ?? 0) - Date.now());
      const savedRoll = Number(saved.rollResult);
      const savedAmount = Number(saved.amount);

      if (!Number.isFinite(savedRoll) || !Number.isFinite(savedAmount)) {
        localStorage.removeItem(DICE_SAVE_KEY);
        return;
      }

      if (remaining === 0) {
        finalizeRoll(savedRoll, savedAmount);
      } else {
        settleTimeoutRef.current = window.setTimeout(() => {
          finalizeRoll(savedRoll, savedAmount);
        }, remaining);
      }
    } catch {
      localStorage.removeItem(DICE_SAVE_KEY);
    }
  }, [finalizeRoll]);

  const handleRoll = async () => {
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

    if (gameState === 'rolling' || roundSettled) return;

    // Deduct balance first
    updateBalance(-amount);
    
    // Set game state to rolling
    setGameState('rolling');
    setResult(null);
    setRoundSettled(false);
    
    // Generate seeds for provably fair
    const newServerSeed = Math.random().toString(36).substring(2, 15);
    const newClientSeed = Math.random().toString(36).substring(2, 15);
    setServerSeed(newServerSeed);
    setClientSeed(newClientSeed);

    // Play sound
    playAudio('roll');

    // Generate true random result now and persist it
    const rollResult = generateRoll();
    const settleAt = Date.now() + 1800;

    localStorage.setItem(DICE_SAVE_KEY, JSON.stringify({
      betAmount,
      amount,
      target,
      isOver,
      gameState: 'rolling',
      rollResult,
      settleAt,
      serverSeed: newServerSeed,
      clientSeed: newClientSeed,
      roundSettled: false,
    }));

    settleTimeoutRef.current = window.setTimeout(() => {
      finalizeRoll(rollResult, amount);
    }, 1800);
  };

  const handlePlayAgain = () => {
    playAudio('click');
    localStorage.removeItem(DICE_SAVE_KEY);
    setRoundSettled(false);
    setGameState('idle');
    setResult(null);
  };

  const handleQuickTarget = (value: number) => {
    if (gameState === 'idle') {
      playAudio('click');
      setTarget(value);
    }
  };

  const won = result !== null && (isOver ? result > target : result < target);

  return (
    <div className="h-[calc(100vh-80px)] pt-4 pb-4 px-4 overflow-hidden">
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 flex-shrink-0"
        >
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-xl">🎲</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Dice</h1>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-gray-400 text-xs">Roll the dice and win big!</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3 overflow-y-auto"
          >
            <div className="bg-dark-800/90 backdrop-blur-xl rounded-xl border border-white/5 p-4">
              {/* Bet Amount */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-gray-400">Bet Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => gameState === 'idle' && setBetAmount(e.target.value)}
                    disabled={gameState === 'rolling'}
                    className="pl-9 h-10 bg-dark-700/50 border-white/10 text-white disabled:opacity-50 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  {[10, 50, 100, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => gameState === 'idle' && setBetAmount(amount.toString())}
                      disabled={gameState === 'rolling'}
                      className="flex-1 py-1.5 rounded bg-dark-700 text-xs text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-50 transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Over/Under Selection */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-gray-400">Bet On</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => gameState === 'idle' && setIsOver(false)}
                    disabled={gameState === 'rolling'}
                    className={`
                      py-2 rounded-lg border-2 transition-all duration-300 flex flex-col items-center
                      ${!isOver
                        ? 'border-neon-green bg-neon-green/10'
                        : 'border-white/10 bg-dark-700 hover:border-white/20'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <span className="text-sm font-bold text-white">UNDER</span>
                    <span className="text-xs text-gray-400">Roll &lt; {target}</span>
                  </button>
                  <button
                    onClick={() => gameState === 'idle' && setIsOver(true)}
                    disabled={gameState === 'rolling'}
                    className={`
                      py-2 rounded-lg border-2 transition-all duration-300 flex flex-col items-center
                      ${isOver
                        ? 'border-neon-green bg-neon-green/10'
                        : 'border-white/10 bg-dark-700 hover:border-white/20'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <span className="text-sm font-bold text-white">OVER</span>
                    <span className="text-xs text-gray-400">Roll &gt; {target}</span>
                  </button>
                </div>
              </div>

              {/* Target Slider */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Target</label>
                  <span className="text-xs font-semibold text-neon-green">{target}</span>
                </div>
                <Slider
                  value={[target]}
                  onValueChange={(value) => gameState === 'idle' && setTarget(value[0])}
                  min={2}
                  max={98}
                  step={1}
                  disabled={gameState === 'rolling'}
                  className="w-full"
                />
                <div className="flex gap-2 mt-1">
                  {[25, 50, 75].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleQuickTarget(val)}
                      disabled={gameState === 'rolling'}
                      className="flex-1 py-1 rounded bg-dark-700 text-xs text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-50 transition-colors"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Win Info */}
              <div className="p-3 rounded-lg bg-dark-700/50 border border-white/5 mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Win Chance</span>
                  <span className="text-white font-medium">{winChance.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Multiplier</span>
                  <span className="text-neon-green font-medium">{multiplier.toFixed(4)}x</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Potential Win</span>
                  <span className="text-neon-green font-medium">${potentialWin.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Button */}
              {gameState !== 'finished' ? (
                <Button
                  onClick={handleRoll}
                  disabled={!user || gameState === 'rolling'}
                  className="w-full h-10 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-lg"
                >
                  {gameState === 'rolling' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full"
                    />
                  ) : (
                    'Roll Dice'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handlePlayAgain}
                  className="w-full h-10 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              )}

              {!user && (
                <p className="mt-3 text-center text-xs text-gray-500">
                  Please login to play
                </p>
              )}
            </div>

            {/* Provably Fair Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-xl bg-dark-800/50 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3 h-3 text-neon-green" />
                <span className="text-xs text-gray-400">Provably Fair</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Server:</span>
                  <span className="text-gray-400 ml-1 font-mono">{serverSeed ? serverSeed.slice(0, 6) + '...' : '---'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Client:</span>
                  <span className="text-gray-400 ml-1 font-mono">{clientSeed ? clientSeed.slice(0, 6) + '...' : '---'}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Dice Display */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-center"
          >
            <div className="relative w-full max-w-sm">
              {/* Dice Scale */}
              <div className="bg-dark-800/90 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                {/* Scale Numbers */}
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
                
                {/* Scale Bar */}
                <div className="relative h-3 bg-dark-700 rounded-full mb-6 overflow-hidden">
                  {/* Win Zone */}
                  <div 
                    className={`absolute h-full ${won ? 'bg-neon-green' : isOver ? 'bg-neon-green/30' : 'bg-neon-green/30'}`}
                    style={{
                      left: isOver ? `${target}%` : '0%',
                      width: isOver ? `${100 - target}%` : `${target}%`
                    }}
                  />
                  {/* Lose Zone */}
                  <div 
                    className="absolute h-full bg-red-500/30"
                    style={{
                      left: isOver ? '0%' : `${target}%`,
                      width: isOver ? `${target}%` : `${100 - target}%`
                    }}
                  />
                  {/* Target Line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white"
                    style={{ left: `${target}%` }}
                  />
                </div>

                {/* Result Display with Rolling Animation */}
                <div className="text-center" ref={resultRef}>
                  <AnimatePresence mode="wait">
                    {gameState === 'rolling' ? (
                      <motion.div
                        key="rolling"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-6"
                      >
                        <motion.div
                          animate={{ 
                            rotate: [0, 360, 720, 1080],
                            scale: [1, 1.1, 1, 1.1, 1]
                          }}
                          transition={{ duration: 1.8, ease: "easeOut" }}
                          className="text-6xl font-bold"
                        >
                          🎲
                        </motion.div>
                        <div className="mt-4 text-4xl font-bold text-neon-green tabular-nums">
                          <AnimatedNumber value={50} duration={1800} />
                        </div>
                        <p className="text-gray-400 mt-2 text-sm">Rolling...</p>
                      </motion.div>
                    ) : gameState === 'finished' && result !== null ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-4"
                      >
                        <motion.div
                          initial={{ rotate: -720, scale: 0.5 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                          className="text-5xl mb-2"
                        >
                          🎲
                        </motion.div>
                        <div className={`text-6xl font-bold ${won ? 'text-neon-green' : 'text-red-500'} tabular-nums`}>
                          {result.toFixed(2)}
                        </div>
                        <div className={`text-lg mt-2 ${won ? 'text-neon-green' : 'text-red-500'}`}>
                          {won ? 'You Won!' : 'You Lost!'}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {isOver ? `Needed > ${target}` : `Needed < ${target}`}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          {won ? `+$${(parseFloat(betAmount) * multiplier).toFixed(2)}` : `-$${betAmount}`}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-10"
                      >
                        <div className="text-5xl">🎲</div>
                        <p className="text-gray-400 mt-4 text-sm">Click Roll to start</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Win/Lose Indicator */}
                {gameState === 'finished' && result !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center"
                  >
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      won ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {isOver 
                        ? (result > target ? `Roll ${result.toFixed(2)} > ${target}` : `Roll ${result.toFixed(2)} ≤ ${target}`)
                        : (result < target ? `Roll ${result.toFixed(2)} < ${target}` : `Roll ${result.toFixed(2)} ≥ ${target}`)
                      }
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
