import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { redeemPromoCodeDb } from '@/lib/promo';

interface RedeemPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RedeemPromoModal({ isOpen, onClose }: RedeemPromoModalProps) {
  const { user, setUser } = useAuthStore();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRedeem = async () => {
    if (!user) return;
    if (!code.trim()) {
      toast.error('Enter a promo code');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await redeemPromoCodeDb(user.id, code.trim(), 'redeem');

      if (result.success && result.amount) {
        const updatedUser = { ...user, balance: Number(result.new_balance ?? user.balance) };
        setUser(updatedUser);

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUsers = users.map((u: any) =>
          u.id === user.id ? { ...u, balance: Number(result.new_balance ?? user.balance) } : u
        );
        localStorage.setItem('users', JSON.stringify(updatedUsers));

        toast.success(`Promo applied! You received $${result.amount}!`);
        setCode('');
        onClose();
      } else {
        toast.error(result.error || 'Invalid promo code');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to redeem promo code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-dark-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-neon-purple" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Redeem Promo Code</h2>
                    <p className="text-xs text-gray-400">Enter your code to claim rewards</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="bg-dark-700 border-white/10 text-white placeholder:text-gray-500"
                />

                <Button
                  onClick={handleRedeem}
                  disabled={isSubmitting}
                  className="w-full bg-neon-purple text-white hover:bg-neon-purple/90"
                >
                  {isSubmitting ? 'Redeeming...' : 'Redeem'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
