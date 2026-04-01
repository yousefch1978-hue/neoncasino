import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import AuthPage from '@/pages/AuthPage';
import HomePage from '@/pages/HomePage';
import AdminPage from '@/pages/AdminPage';
import MinesGame from '@/components/games/MinesGame';
import CoinFlipGame from '@/components/games/CoinFlipGame';
import CrashGame from '@/components/games/CrashGame';
import DiceGame from '@/components/games/DiceGame';
import BlackjackGame from '@/components/games/BlackjackGame';
import DragonTowerGame from '@/components/games/DragonTowerGame';
import RankingsPage from '@/pages/RankingsPage';
import { useAuthStore, initializeAuth } from '@/store/authStore';
import { getProfileById } from '@/lib/profiles';
import { motion, AnimatePresence } from 'framer-motion';

// Background particles
function BackgroundParticles() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-neon-green/20 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
          }}
          animate={{
            y: [null, -100],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
}

// Page transition
function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return (
    <motion.div
      key={pageKey}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('currentPage') || 'home');
  const [isInitialized, setIsInitialized] = useState(false);
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    initializeAuth();
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const syncBalance = async () => {
      if (!user) return;

      try {
        const profile = await getProfileById(user.id);
        const nextBalance = Number(profile.balance ?? user.balance);

        if (nextBalance !== user.balance) {
          setUser({
            ...user,
            balance: nextBalance,
          });
        }
      } catch (error) {
        console.error('Failed to sync balance from Supabase:', error);
      }
    };

    syncBalance();
  }, [user?.id, currentPage]);

  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    const gamePages = ['mines', 'coinflip', 'crash', 'dice', 'blackjack', 'dragontower'];
    const shouldWarn = gamePages.includes(currentPage);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldWarn) return;
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPage]);

  // Admin can now navigate freely between games and admin panel
  // No automatic redirect to admin page

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    localStorage.setItem('currentPage', page);
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'auth':
        return (
          <PageTransition pageKey="auth">
            <AuthPage onPageChange={handlePageChange} />
          </PageTransition>
        );
      case 'admin':
        if (user?.role === 'admin' || user?.email === 'yousefch1978@gmail.com') {
          return (
            <PageTransition pageKey="admin">
              <AdminPage onPageChange={handlePageChange} />
            </PageTransition>
          );
        }
        return (
          <PageTransition pageKey="home">
            <HomePage onPageChange={handlePageChange} />
          </PageTransition>
        );
      case 'mines':
        return (
          <PageTransition pageKey="mines">
            <MinesGame />
          </PageTransition>
        );
      case 'coinflip':
        return (
          <PageTransition pageKey="coinflip">
            <CoinFlipGame />
          </PageTransition>
        );
      case 'crash':
        return (
          <PageTransition pageKey="crash">
            <CrashGame />
          </PageTransition>
        );
      case 'dice':
        return (
          <PageTransition pageKey="dice">
            <DiceGame />
          </PageTransition>
        );
      case 'blackjack':
        return (
          <PageTransition pageKey="blackjack">
            <BlackjackGame />
          </PageTransition>
        );
      case 'dragontower':
        return (
          <PageTransition pageKey="dragontower">
            <DragonTowerGame />
          </PageTransition>
        );
      case 'rankings':
        return (
          <PageTransition pageKey="rankings">
            <RankingsPage />
          </PageTransition>
        );
      case 'home':
      default:
        return (
          <PageTransition pageKey="home">
            <HomePage onPageChange={handlePageChange} />
          </PageTransition>
        );
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-neon-green border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 z-0" />
      <BackgroundParticles />

      {/* Noise texture */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
        
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App;
