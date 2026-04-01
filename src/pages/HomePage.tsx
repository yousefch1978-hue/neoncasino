import { motion } from 'framer-motion';
import { Sparkles, Zap, Shield, Gift, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface HomePageProps {
  onPageChange: (page: string) => void;
}

const games = [
  {
    id: 'mines',
    name: 'Mines',
    description: 'Avoid the mines and multiply your bet up to 24x!',
    image: '/mines-cover.png',
    stats: 'Up to 24x',
    players: '2.4k playing',
  },
  {
    id: 'coinflip',
    name: 'Coin Flip',
    description: 'Double your money with a 50/50 chance!',
    image: '/coinflip-cover.png',
    stats: '2x Multiplier',
    players: '1.8k playing',
  },
  {
    id: 'crash',
    name: 'Crash',
    description: 'Cash out before the rocket crashes!',
    image: '/crash-cover.png',
    stats: 'Unlimited',
    players: '3.2k playing',
  },
  {
    id: 'dice',
    name: 'Dice',
    description: 'Roll over or under to win!',
    image: '/dice-cover.png',
    stats: 'Up to 49.5x',
    players: '2.1k playing',
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Beat the dealer to 21!',
    image: '/blackjack-cover.png',
    stats: '3:2 Payout',
    players: '1.5k playing',
  },
  {
    id: 'dragontower',
    name: 'Dragon Tower',
    description: 'Climb the tower, avoid the dragon!',
    image: '/dragontower-cover.png',
    stats: 'Up to 100x',
    players: '1.2k playing',
  },
];

const features = [
  {
    icon: Zap,
    title: 'Instant Deposits',
    description: 'Crypto deposits processed in minutes',
  },
  {
    icon: Shield,
    title: 'Provably Fair',
    description: 'All games use verifiable randomness',
  },
  {
    icon: Gift,
    title: 'Promo Codes',
    description: 'Use codes to get free bonus money',
  },
];

export default function HomePage({ onPageChange }: HomePageProps) {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-green/10 border border-neon-green/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-neon-green" />
            <span className="text-sm text-neon-green font-medium">
              New games added weekly
            </span>
          </motion.div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6">
            Play. Win.{' '}
            <span className="gradient-text">Repeat.</span>
          </h1>
          
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            Experience the thrill of premium crypto gaming. Fast deposits, 
            instant withdrawals, and provably fair games.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <motion.button
              onClick={() => onPageChange('mines')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-neon-green text-dark-900 font-semibold rounded-xl shadow-neon hover:shadow-neon-strong transition-all"
            >
              Start Playing Now
            </motion.button>
            {!user && (
              <motion.button
                onClick={() => onPageChange('auth')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-dark-700 text-white font-semibold rounded-xl border border-white/10 hover:bg-dark-600 transition-all"
              >
                Create Account
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Featured Games */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-12 sm:mb-16"
        >
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Featured Games</h2>
            <span className="text-xs sm:text-sm text-gray-400">6 games available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                onClick={() => onPageChange(game.id)}
                className="group relative cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-2xl bg-dark-800 border border-white/5 card-hover">
                  {/* Game Image */}
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img 
                      src={game.image} 
                      alt={game.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-transparent" />
                  </div>

                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 group-hover:text-neon-green transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      {game.description}
                    </p>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-neon-green font-medium">
                        {game.stats}
                      </span>
                      <span className="text-gray-500">{game.players}</span>
                    </div>
                  </div>

                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-neon-green text-dark-900 font-semibold px-6 py-3 rounded-xl shadow-neon transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      Play Now
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                className="p-5 sm:p-6 rounded-2xl bg-dark-800/50 border border-white/5"
              >
                <div className="w-10 h-10 sm:w-12 rounded-xl bg-neon-green/10 flex items-center justify-center mb-3 sm:mb-4">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-neon-green" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Discord CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mb-12 sm:mb-16"
        >
          <div className="bg-gradient-to-r from-[#5865F2]/20 to-[#5865F2]/5 rounded-2xl border border-[#5865F2]/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#5865F2] flex items-center justify-center">
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Join our Discord</h3>
                <p className="text-sm text-gray-400">Get updates, support, and connect with the community</p>
              </div>
            </div>
            <a 
              href="https://https://https://discord.gg/b3p3NKDV" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-[#5865F2] text-white font-semibold rounded-xl hover:bg-[#4752C4] transition-colors text-center"
            >
              Join Discord
            </a>
          </div>
        </motion.div>

        {/* Recent Wins Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Recent Wins</h2>
          <div className="rounded-2xl bg-dark-800 border border-white/5 overflow-hidden">
            <div className="grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 text-xs sm:text-sm text-gray-500 border-b border-white/5">
              <span>Game</span>
              <span className="hidden sm:block">Player</span>
              <span>Bet</span>
              <span className="text-right">Win</span>
            </div>
            {[
              { game: 'Mines', player: 'CryptoKing', bet: 50, win: 450, multiplier: 9 },
              { game: 'Crash', player: 'MoonShot', bet: 100, win: 890, multiplier: 8.9 },
              { game: 'Coin Flip', player: 'Lucky7', bet: 25, win: 50, multiplier: 2 },
              { game: 'Mines', player: 'Diamond', bet: 200, win: 1200, multiplier: 6 },
              { game: 'Crash', player: 'Rocket', bet: 75, win: 525, multiplier: 7 },
            ].map((win, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 text-xs sm:text-sm hover:bg-white/5 transition-colors"
              >
                <span className="text-white font-medium">{win.game}</span>
                <span className="hidden sm:block text-gray-400">{win.player}</span>
                <span className="text-gray-400">${win.bet}</span>
                <span className="text-right text-neon-green font-semibold">
                  ${win.win} ({win.multiplier}x)
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
