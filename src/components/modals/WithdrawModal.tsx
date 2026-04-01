import { getProfileById } from '@/lib/profiles';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Bitcoin, ArrowUpRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import type { CryptoType } from '@/store/withdrawalStore';
import { createWithdrawalRequest } from '../../lib/withdrawals';
import { toast } from 'sonner';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_WITHDRAWAL = 20;

const cryptoInfo: Record<CryptoType, { name: string; symbol: string; icon: typeof Bitcoin; color: string }> = {
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: Bitcoin,
    color: '#f7931a',
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: Wallet,
    color: '#627eea',
  },
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    icon: Wallet,
    color: '#00ffa3',
  },
};

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { user, updateBalance } = useAuthStore();
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('BTC');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    
    const withdrawAmount = parseFloat(amount);
    
    if (!amount.trim() || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (withdrawAmount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}`);
      return;
    }
    const latestProfile = await getProfileById(user.id);
const realBalance = Number(latestProfile.balance ?? 0);

if (withdrawAmount > realBalance) {
  toast.error('Insufficient balance');
  return;
}
   
    
    if (!address.trim()) {
      toast.error('Please enter your wallet address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createWithdrawalRequest({
        userId: user.id,
        username: user.username,
        email: user.email,
        amount: withdrawAmount,
        cryptoType: selectedCrypto,
        walletAddress: address.trim(),
      });

      // Deduct balance immediately
      updateBalance(-withdrawAmount);

      toast.success('Withdrawal request submitted! It will be processed by admin soon.');
      setAmount('');
      setAddress('');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxAmount = user?.balance || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal - Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-dark-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-dark-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-neon-purple" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Withdraw</h2>
                    <p className="text-xs text-gray-400">Withdraw funds to your wallet</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Balance Display */}
                <div className="mb-6 p-4 rounded-xl bg-dark-700 border border-white/5">
                  <p className="text-sm text-gray-400 mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-white">${maxAmount.toFixed(2)}</p>
                </div>

                <Tabs
                  value={selectedCrypto}
                  onValueChange={(v) => setSelectedCrypto(v as CryptoType)}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 bg-dark-700 p-1 rounded-xl mb-6">
                    {(Object.keys(cryptoInfo) as CryptoType[]).map((key) => {
                      const info = cryptoInfo[key];
                      return (
                        <TabsTrigger
                          key={key}
                          value={key}
                          className="rounded-lg data-[state=active]:bg-dark-600 data-[state=active]:text-white text-gray-400 transition-all text-sm"
                        >
                          {info.symbol}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {(Object.keys(cryptoInfo) as CryptoType[]).map((key) => {
                    const info = cryptoInfo[key];
                    return (
                      <TabsContent key={key} value={key} className="space-y-5">
                        {/* Amount Input */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-gray-400 text-sm">Amount (USD)</Label>
                            <button
                              onClick={() => setAmount(maxAmount.toString())}
                              className="text-xs text-neon-green hover:underline"
                            >
                              Max
                            </button>
                          </div>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <Input
                              type="number"
                              placeholder={`Min $${MIN_WITHDRAWAL}`}
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="pl-8 bg-dark-700 border-white/10 text-white placeholder:text-gray-500 focus:border-neon-green focus:ring-neon-green/20 rounded-xl"
                            />
                          </div>
                          <p className="text-xs text-gray-500">Minimum: ${MIN_WITHDRAWAL}</p>
                        </div>

                        {/* Address Input */}
                        <div className="space-y-2">
                          <Label className="text-gray-400 text-sm">Your {info.name} Address</Label>
                          <Input
                            placeholder={`Enter your ${info.symbol} wallet address`}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="bg-dark-700 border-white/10 text-white placeholder:text-gray-500 focus:border-neon-green focus:ring-neon-green/20 rounded-xl"
                          />
                        </div>

                        {/* Submit Button */}
                        <Button
                          onClick={handleSubmit}
                          disabled={isSubmitting || parseFloat(amount) > maxAmount || parseFloat(amount) < MIN_WITHDRAWAL}
                          className="w-full bg-neon-purple text-white hover:bg-neon-purple/90 font-semibold h-12 rounded-xl ripple"
                        >
                          {isSubmitting ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                          ) : (
                            'Request Withdrawal'
                          )}
                        </Button>

                        {/* Info */}
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-400">
                              Withdrawals require admin approval. Funds will be sent to your wallet address once approved.
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
