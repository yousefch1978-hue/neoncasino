import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Wallet, User, LogOut, 
  Bomb, Coins, TrendingUp, Home, Crown, 
  Trophy, MessageSquare, Volume2, VolumeX,
  ArrowUpRight, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { useSound } from '@/hooks/useSound';
import DepositModal from './modals/DepositModal';
import WithdrawModal from './modals/WithdrawModal';
import ChatModal from './modals/ChatModal';
import RedeemPromoModal from './modals/RedeemPromoModal';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'mines', label: 'Mines', icon: Bomb },
  { id: 'coinflip', label: 'Coin', icon: Coins },
  { id: 'crash', label: 'Crash', icon: TrendingUp },
  { id: 'dice', label: 'Dice', icon: () => <span className="text-sm">🎲</span> },
  { id: 'blackjack', label: 'BJ', icon: () => <span className="text-sm">♠️</span> },
  { id: 'dragontower', label: 'Tower', icon: () => <span className="text-sm">🏰</span> },
  { id: 'rankings', label: 'Rank', icon: Trophy },
];

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const { user, logout, isAdmin } = useAuthStore();
  const { isEnabled, toggle } = useSound();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);

  const handleLogout = () => {
    logout();
    onPageChange('home');
    setIsMobileMenuOpen(false);
  };

  const isUserAdmin = isAdmin();

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-12">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-1.5 cursor-pointer"
              onClick={() => onPageChange('home')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center shadow-neon">
                <span className="text-dark-900 font-bold text-sm">N</span>
              </div>
              <span className="text-sm font-bold gradient-text hidden sm:block">
                NeonCasino
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`relative px-2 lg:px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-medium transition-all duration-200 ${
                      isActive ? 'text-neon-green bg-neon-green/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="relative z-10 hidden lg:inline">{item.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                onClick={toggle}
                className="hidden sm:flex p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                {isEnabled() ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Chat Button */}
              {user && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="hidden sm:flex p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}

              {user ? (
                <>
                  {/* Balance */}
                  <motion.div
                    className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-dark-700/80 border border-white/5"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Wallet className="w-3 h-3 text-neon-green" />
                    <span className="font-semibold text-white text-xs">
                      $<AnimatePresence mode="wait">
                        <motion.span
                          key={user.balance}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="inline-block"
                        >
                          {user.balance.toFixed(2)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </motion.div>

                  {/* Deposit & Withdraw Buttons */}
                  <Button
                    onClick={() => setIsDepositOpen(true)}
                    className="hidden sm:flex bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-lg text-xs h-7 px-2"
                  >
                    <Wallet className="w-3 h-3 mr-1" />
                    Deposit
                  </Button>
                  <Button
                    onClick={() => setIsWithdrawOpen(true)}
                    variant="outline"
                    className="hidden sm:flex border-neon-purple text-neon-purple hover:bg-neon-purple/10 font-semibold rounded-lg text-xs h-7 px-2"
                  >
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    Withdraw
                  </Button>
                  <Button
                    onClick={() => setIsRedeemOpen(true)}
                    variant="outline"
                    className="hidden sm:flex border-yellow-500 text-yellow-400 hover:bg-yellow-500/10 font-semibold rounded-lg text-xs h-7 px-2"
                  >
                    <Gift className="w-3 h-3 mr-1" />
                    Redeem
                  </Button>

                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-7 w-7 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue p-0.5"
                      >
                        <div className="h-full w-full rounded-full bg-dark-800 flex items-center justify-center">
                          {isUserAdmin ? (
                            <Crown className="h-3 w-3 text-yellow-400" />
                          ) : (
                            <User className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-dark-800 border-white/10">
                      <div className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-white">{user.username}</p>
                          {isUserAdmin && (
                            <span className="px-1 py-0 rounded text-[8px] bg-neon-purple/20 text-neon-purple">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">{user.email}</p>
                        <p className="text-[10px] text-neon-green mt-0.5">${user.balance.toFixed(2)}</p>
                      </div>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={() => setIsDepositOpen(true)} className="text-gray-300 focus:text-white focus:bg-white/5 cursor-pointer text-xs">
                        <Wallet className="mr-2 h-3 w-3" />
                        Deposit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsWithdrawOpen(true)} className="text-gray-300 focus:text-white focus:bg-white/5 cursor-pointer text-xs">
                        <TrendingUp className="mr-2 h-3 w-3" />
                        Withdraw
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsRedeemOpen(true)} className="text-gray-300 focus:text-white focus:bg-white/5 cursor-pointer text-xs">
                        <Gift className="mr-2 h-3 w-3" />
                        Redeem Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsChatOpen(true)} className="text-gray-300 focus:text-white focus:bg-white/5 cursor-pointer text-xs">
                        <MessageSquare className="mr-2 h-3 w-3" />
                        Support
                      </DropdownMenuItem>
                      {isUserAdmin && (
                        <DropdownMenuItem onClick={() => onPageChange('admin')} className="text-yellow-400 focus:text-yellow-400 focus:bg-yellow-500/10 cursor-pointer text-xs">
                          <Crown className="mr-2 h-3 w-3" />
                          Admin Panel
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer text-xs">
                        <LogOut className="mr-2 h-3 w-3" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => onPageChange('auth')}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 font-semibold rounded-lg text-xs h-7 px-3"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => onPageChange('auth')}
                    className="bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-lg text-xs h-7 px-3"
                  >
                    Sign Up
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-7 w-7"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-dark-800 border-t border-white/5"
            >
              <div className="px-3 py-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onPageChange(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium transition-all ${
                        isActive ? 'bg-neon-green/10 text-neon-green' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
                {user && (
                  <>
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <div className="px-3 py-1.5 flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Balance</span>
                        <span className="font-semibold text-neon-green text-xs">${user.balance.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => {
                          setIsDepositOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-neon-green text-dark-900 font-semibold text-xs"
                      >
                        Deposit
                      </button>
                      <button
                        onClick={() => {
                          setIsWithdrawOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-neon-purple text-neon-purple font-semibold text-xs"
                      >
                        Withdraw
                      </button>
                      {isUserAdmin && (
                        <button
                          onClick={() => {
                            onPageChange('admin');
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-yellow-500 text-dark-900 font-semibold flex items-center justify-center gap-1 text-xs"
                        >
                          <Crown className="w-3 h-3" />
                          Admin Panel
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Modals */}
      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <WithdrawModal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} />
      <RedeemPromoModal isOpen={isRedeemOpen} onClose={() => setIsRedeemOpen(false)} />
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
