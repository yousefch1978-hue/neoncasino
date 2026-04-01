import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

interface Card {
  value: string;
  suit: string;
  id: string;
}

type HandState = 'playing' | 'stand' | 'bust' | 'blackjack' | 'win' | 'loss' | 'push';

const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CHIP_VALUES = [5, 10, 25, 100];

const playBlackjackSound = (type: 'deal' | 'hit' | 'win' | 'lose' | 'click') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'deal') {
      oscillator.frequency.setValueAtTime(480, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.07);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.07);
    } else if (type === 'hit') {
      oscillator.frequency.setValueAtTime(620, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.09);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.09);
    } else if (type === 'win') {
      oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.08);
      oscillator.frequency.setValueAtTime(820, audioContext.currentTime + 0.16);
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.28);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.28);
    } else if (type === 'lose') {
      oscillator.frequency.setValueAtTime(260, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.25);
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.25);
    } else {
      oscillator.frequency.setValueAtTime(760, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.06);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.06);
    }
  } catch {}
};

const getRandomCard = (): Card => ({
  value: values[Math.floor(Math.random() * values.length)],
  suit: suits[Math.floor(Math.random() * suits.length)],
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
});

const getCardValue = (card: Card) => {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return Number(card.value);
};

const calculateHand = (hand: Card[]) => {
  let total = hand.reduce((sum, c) => sum + getCardValue(c), 0);
  let aces = hand.filter((c) => c.value === 'A').length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
};

const isBlackjack = (hand: Card[]) => hand.length === 2 && calculateHand(hand) === 21;

const canSplitHand = (hand: Card[]) => {
  if (hand.length !== 2) return false;
  return hand[0].value === hand[1].value;
};

export default function BlackjackGame() {
  const { user, setUser } = useAuthStore();
  const { addBet } = useGameStore();

  const [bet, setBet] = useState<string>('10.00');
  const [playerHands, setPlayerHands] = useState<Card[][]>([]);
  const [handStates, setHandStates] = useState<HandState[]>([]);
  const [handBets, setHandBets] = useState<number[]>([]);
  const [activeHand, setActiveHand] = useState(0);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'dealing' | 'player' | 'dealer' | 'finished'>('idle');
  const [bannerResult, setBannerResult] = useState<'win' | 'loss' | 'push' | ''>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const numericBet = useMemo(() => {
    const parsed = parseFloat(bet);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [bet]);


  const dealerVisibleTotal = useMemo(() => {
    if (gameState === 'player' && dealer.length >= 1) return getCardValue(dealer[0]);
    return calculateHand(dealer);
  }, [dealer, gameState]);

  const syncBalance = (amount: number) => {
    if (!user) return;
    const updated = { ...user, balance: Number(amount) };
    setUser(updated);

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) =>
      u.id === user.id ? { ...u, balance: Number(amount) } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));
  };

  const playSound = (type: 'deal' | 'hit' | 'win' | 'lose' | 'click') => {
    if (soundEnabled) playBlackjackSound(type);
  };

  const updateHandAt = (index: number, hand: Card[]) => {
    setPlayerHands((prev) => prev.map((h, i) => (i === index ? hand : h)));
  };

  const getNextPlayableHandIndex = (states: HandState[], fromIndex: number) => {
    for (let i = fromIndex + 1; i < states.length; i++) {
      if (states[i] === 'playing') return i;
    }
    return -1;
  };

  const moveToNextHandOrDealer = (nextStates: HandState[], currentIndex: number) => {
    const next = getNextPlayableHandIndex(nextStates, currentIndex);
    if (next !== -1) {
      setActiveHand(next);
      return;
    }
    void finishDealerRound(nextStates);
  };

  const drawAnimatedCard = async () => {
    setIsDrawing(true);
    await new Promise((resolve) => setTimeout(resolve, 240));
    const card = getRandomCard();
    setIsDrawing(false);
    return card;
  };

  const startGame = async () => {
    if (!user) {
      toast.error('Please login first');
      return;
    }

    if (numericBet <= 0) {
      toast.error('Enter a valid bet');
      return;
    }

    if (numericBet > user.balance) {
      toast.error('Not enough balance');
      return;
    }

    syncBalance(user.balance - numericBet);
    setBannerResult('');
    setDealer([]);
    setPlayerHands([]);
    setHandStates([]);
    setHandBets([]);
    setActiveHand(0);
    setGameState('dealing');

    setTimeout(() => {
      const playerHand = [getRandomCard(), getRandomCard()];
      const dealerHand = [getRandomCard(), getRandomCard()];

      setPlayerHands([playerHand]);
      setDealer(dealerHand);
      setHandBets([numericBet]);

      const playerBJ = isBlackjack(playerHand);
      const dealerBJ = isBlackjack(dealerHand);

      if (playerBJ || dealerBJ) {
        if (playerBJ && dealerBJ) {
          setHandStates(['push']);
          endRound(['push'], [numericBet], dealerHand, [playerHand]);
        } else if (playerBJ) {
          setHandStates(['blackjack']);
          endRound(['win'], [numericBet], dealerHand, [playerHand], true);
        } else {
          setHandStates(['loss']);
          endRound(['loss'], [numericBet], dealerHand, [playerHand]);
        }
      } else {
        setHandStates(['playing']);
        setGameState('player');
      }

      playSound('deal');
    }, 350);
  };

  const hit = async () => {
    if (gameState !== 'player' || isDrawing) return;

    const currentHand = playerHands[activeHand];
    if (!currentHand) return;

    const card = await drawAnimatedCard();
    const newHand = [...currentHand, card];
    updateHandAt(activeHand, newHand);
    playSound('hit');

    const total = calculateHand(newHand);

    if (total > 21) {
      const nextStates = [...handStates];
      nextStates[activeHand] = 'bust';
      setHandStates(nextStates);
      moveToNextHandOrDealer(nextStates, activeHand);
    }
  };

  const stand = () => {
    if (gameState !== 'player' || isDrawing) return;

    const nextStates = [...handStates];
    nextStates[activeHand] = 'stand';
    setHandStates(nextStates);
    playSound('click');
    moveToNextHandOrDealer(nextStates, activeHand);
  };

  const doubleDown = async () => {
    if (!user || gameState !== 'player' || isDrawing) return;

    const currentHand = playerHands[activeHand];
    if (!currentHand) return;

    const total = calculateHand(currentHand);
    if (currentHand.length !== 2 || ![10, 11, 12].includes(total)) {
      toast.error('Double only allowed on 10, 11, or 12');
      return;
    }

    if (user.balance < numericBet) {
      toast.error('Not enough balance to double');
      return;
    }

    syncBalance(user.balance - numericBet);
    setHandBets((prev) => prev.map((b, i) => (i === activeHand ? b + numericBet : b)));

    const card = await drawAnimatedCard();
    const newHand = [...currentHand, card];
    updateHandAt(activeHand, newHand);
    playSound('hit');

    const totalAfter = calculateHand(newHand);
    const nextStates = [...handStates];
    nextStates[activeHand] = totalAfter > 21 ? 'bust' : 'stand';
    setHandStates(nextStates);

    setTimeout(() => {
      moveToNextHandOrDealer(nextStates, activeHand);
    }, 260);
  };

  const split = async () => {
    if (!user || gameState !== 'player' || isDrawing) return;

    const currentHand = playerHands[activeHand];
    if (!currentHand || playerHands.length > 1) {
      toast.error('Only one split supported right now');
      return;
    }

    if (!canSplitHand(currentHand)) {
      toast.error('You can only split matching cards');
      return;
    }

    if (user.balance < numericBet) {
      toast.error('Not enough balance to split');
      return;
    }

    syncBalance(user.balance - numericBet);

    const firstHandBase = [currentHand[0]];
    const secondHandBase = [currentHand[1]];

    const firstCard = await drawAnimatedCard();
    const secondCard = await drawAnimatedCard();

    const handOne = [...firstHandBase, firstCard];
    const handTwo = [...secondHandBase, secondCard];

    setPlayerHands([handOne, handTwo]);
    setHandBets([numericBet, numericBet]);
    setHandStates(['playing', 'playing']);
    setActiveHand(0);
    playSound('click');
  };

  const finishDealerRound = async (finalPlayerStates: HandState[]) => {
    setGameState('dealer');

    let dealerHand = [...dealer];
    await new Promise((resolve) => setTimeout(resolve, 350));

    while (calculateHand(dealerHand) < 17) {
      const nextCard = getRandomCard();
      dealerHand = [...dealerHand, nextCard];
      setDealer([...dealerHand]);
      await new Promise((resolve) => setTimeout(resolve, 420));
    }

    const resultStates: HandState[] = finalPlayerStates.map((state, index) => {
      const hand = playerHands[index];
      const playerScore = calculateHand(hand);
      const dealerScore = calculateHand(dealerHand);

      if (state === 'bust') return 'loss';
      if (dealerScore > 21 || playerScore > dealerScore) return 'win';
      if (playerScore === dealerScore) return 'push';
      return 'loss';
    });

    setHandStates(resultStates);
    endRound(resultStates, handBets, dealerHand, playerHands);
  };

  const endRound = (
    finalStates: HandState[],
    finalBets: number[],
    dealerHand: Card[],
    finalHands: Card[][],
    blackjackPayout = false
  ) => {
    setDealer(dealerHand);
    setPlayerHands(finalHands);
    setGameState('finished');

    if (!user) return;

    let totalPayout = 0;
    let wins = 0;
    let pushes = 0;

    finalStates.forEach((state, index) => {
      const wager = finalBets[index] ?? numericBet;

      if (state === 'win') {
        const payout = blackjackPayout && index === 0 ? wager * 2.0 : wager * 2;
        totalPayout += payout;
        wins++;
      } else if (state === 'push') {
        totalPayout += wager;
        pushes++;
      }
    });

    if (totalPayout > 0) {
      syncBalance(user.balance + totalPayout);
    }

    if (wins > 0 && pushes === 0) {
      setBannerResult('win');
      playSound('win');
      toast.success(`You won $${totalPayout.toFixed(2)}`);
    } else if (wins === 0 && pushes > 0) {
      setBannerResult('push');
      toast('Push');
    } else if (wins > 0 && pushes > 0) {
      setBannerResult('win');
      playSound('win');
      toast.success(`Mixed result • returned $${totalPayout.toFixed(2)}`);
    } else {
      setBannerResult('loss');
      playSound('lose');
      toast.error('Dealer wins');
    }

    finalStates.forEach((state, index) => {
      const wager = Number((finalBets[index] ?? numericBet).toFixed(2));
      const payout =
        state === 'win'
          ? Number(((blackjackPayout && index === 0 ? wager * 2.0 : wager * 2)).toFixed(2))
          : state === 'push'
            ? wager
            : 0;

      addBet({
        userId: user.id,
        username: user.username,
        game: 'blackjack',
        amount: wager,
        multiplier: state === 'win' ? Number((payout / wager).toFixed(2)) : 0,
        payout,
        result: state === 'push' ? 'push' : state === 'win' ? 'win' : 'loss',
      });
    });
  };

  const resetGame = () => {
    setPlayerHands([]);
    setDealer([]);
    setGameState('idle');
    setBannerResult('');
    setHandStates([]);
    setHandBets([]);
    setActiveHand(0);
    setIsDrawing(false);
    playSound('click');
  };

  const currentActiveHand = playerHands[activeHand] || [];
  const currentActiveTotal = calculateHand(currentActiveHand);
  const canDouble =
    gameState === 'player' &&
    currentActiveHand.length === 2 &&
    [10, 11, 12].includes(currentActiveTotal);
  const canSplit =
    gameState === 'player' &&
    playerHands.length === 1 &&
    canSplitHand(currentActiveHand);

  return (
    <div className="min-h-screen bg-[#0f212e] text-white px-4 py-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="bg-[#1a2f3d] rounded-2xl p-4 border border-white/5 shadow-2xl h-fit">
          <div className="space-y-4">
            <div className="bg-[#132531] rounded-full p-1 flex items-center">
              <button className="flex-1 h-11 rounded-full bg-[#455f74] text-white font-semibold">
                Manual
              </button>
              <button
                onClick={() => setSoundEnabled((s) => !s)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-gray-300"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-2 block">Bet Amount</label>
              <div className="flex rounded-xl overflow-hidden border border-white/10 bg-[#0f212e]">
                <div className="w-12 flex items-center justify-center text-gray-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <Input
                  type="number"
                  value={bet}
                  onChange={(e) => gameState === 'idle' && setBet(e.target.value)}
                  disabled={gameState !== 'idle'}
                  className="h-14 border-0 bg-transparent text-white rounded-none"
                />
                <button
                  onClick={() => gameState === 'idle' && setBet(Math.max(0.01, numericBet / 2).toFixed(2))}
                  className="w-14 bg-[#455f74] text-white text-lg"
                >
                  ½
                </button>
                <button
                  onClick={() => gameState === 'idle' && setBet(Math.max(0.01, numericBet * 2).toFixed(2))}
                  className="w-14 bg-[#455f74] text-white text-lg border-l border-black/10"
                >
                  2×
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {CHIP_VALUES.map((chip) => (
                <button
                  key={chip}
                  onClick={() => gameState === 'idle' && setBet(chip.toFixed(2))}
                  className="h-11 rounded-xl bg-[#223a49] hover:bg-[#29485b] border border-white/5 text-white font-semibold"
                >
                  ${chip}
                </button>
              ))}
            </div>

            {gameState === 'idle' && (
              <Button
                onClick={startGame}
                className="w-full h-14 rounded-xl bg-[#66e383] hover:bg-[#58d774] text-white font-semibold text-lg"
              >
                Deal
              </Button>
            )}

            {gameState === 'player' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={hit} disabled={isDrawing} className="h-12 bg-[#2d74da] hover:bg-[#2667c6]">
                    Hit
                  </Button>
                  <Button onClick={stand} disabled={isDrawing} className="h-12 bg-[#455f74] hover:bg-[#4d697f]">
                    Stand
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={doubleDown}
                    disabled={!canDouble || isDrawing}
                    className="h-12 bg-[#efb94a] hover:bg-[#e2ac3e] text-black disabled:opacity-50"
                  >
                    Double
                  </Button>
                  <Button
                    onClick={split}
                    disabled={!canSplit || isDrawing}
                    className="h-12 bg-[#8b5cf6] hover:bg-[#7c4df0] disabled:opacity-50"
                  >
                    Split
                  </Button>
                </div>
              </>
            )}

            {gameState === 'finished' && (
              <Button
                onClick={resetGame}
                className="w-full h-14 rounded-xl bg-[#2d74da] hover:bg-[#2667c6] text-white font-semibold text-lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            )}


          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#10212d] shadow-2xl overflow-hidden">
          <div className="relative min-h-[740px] p-6 sm:p-8 bg-[radial-gradient(circle_at_center,rgba(78,154,118,0.20),transparent_55%)]">
            <div className="absolute inset-x-10 top-8 h-px bg-white/5" />
            <div className="absolute inset-x-10 bottom-8 h-px bg-white/5" />

            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="text-center mb-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">Dealer</div>
                  <div className="text-lg font-semibold text-white">
                    {dealer.length ? dealerVisibleTotal : ''}
                  </div>
                </div>

                <div className="flex justify-center gap-3 min-h-[150px]">
                  <AnimatePresence>
                    {dealer.map((card, i) => (
                      <CardUI
                        key={card.id}
                        card={card}
                        hidden={gameState === 'player' && i === 1}
                        delay={i * 0.08}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center justify-center py-6">
                {gameState === 'dealing' && (
                  <div className="text-3xl font-black text-white/80">DEALING...</div>
                )}

                {gameState === 'finished' && bannerResult && (
                  <div
                    className={`text-4xl sm:text-5xl font-black ${
                      bannerResult === 'win'
                        ? 'text-emerald-400'
                        : bannerResult === 'loss'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                    }`}
                  >
                    {bannerResult.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {playerHands.map((hand, handIndex) => (
                  <div key={handIndex}>
                    <div className="text-center mb-3">
                      <div className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">
                        {playerHands.length > 1 ? `Player • Hand ${handIndex + 1}` : 'Player'}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg font-semibold text-white">{calculateHand(hand)}</span>
                        {handStates[handIndex] && handStates[handIndex] !== 'playing' && (
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              handStates[handIndex] === 'win'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : handStates[handIndex] === 'loss' || handStates[handIndex] === 'bust'
                                  ? 'bg-red-500/20 text-red-300'
                                  : handStates[handIndex] === 'push'
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {handStates[handIndex]}
                          </span>
                        )}
                        {activeHand === handIndex && gameState === 'player' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-[#66e383]/20 text-[#66e383]">
                            active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center gap-3 min-h-[140px]">
                      <AnimatePresence>
                        {hand.map((card, i) => (
                          <CardUI key={card.id} card={card} delay={i * 0.08} />
                        ))}
                      </AnimatePresence>

                      {isDrawing && activeHand === handIndex && (
                        <motion.div
                          initial={{ x: 90, y: -10, opacity: 0, rotate: 8 }}
                          animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                          exit={{ opacity: 0 }}
                          className="w-24 h-32 rounded-2xl bg-gradient-to-br from-[#32506a] to-[#223a49] border border-white/10 shadow-2xl"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardUI({
  card,
  hidden = false,
  delay = 0,
}: {
  card: Card;
  hidden?: boolean;
  delay?: number;
}) {
  const isRed = card.suit === '♥' || card.suit === '♦';

  if (hidden) {
    return (
      <motion.div
        initial={{ y: -24, opacity: 0, rotate: -6 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.28, delay }}
        className="w-24 h-32 rounded-2xl bg-gradient-to-br from-[#32506a] to-[#223a49] border border-white/10 shadow-2xl"
      />
    );
  }

  return (
    <motion.div
      initial={{ y: -24, opacity: 0, rotate: -6 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.28, delay }}
      className="w-24 h-32 bg-white rounded-2xl flex flex-col justify-between p-3 text-black shadow-2xl"
    >
      <span className={`text-base font-black leading-none ${isRed ? 'text-red-500' : ''}`}>
        {card.value}
      </span>
      <span className={`text-center text-4xl ${isRed ? 'text-red-500' : ''}`}>
        {card.suit}
      </span>
      <span className={`text-base text-right font-black leading-none ${isRed ? 'text-red-500' : ''}`}>
        {card.value}
      </span>
    </motion.div>
  );
}
