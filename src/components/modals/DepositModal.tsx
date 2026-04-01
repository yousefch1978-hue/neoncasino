import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Bitcoin, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CRYPTO_ADDRESSES } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { createDepositRequest } from '../../lib/deposits';
import { toast } from 'sonner';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CryptoType = 'btc' | 'eth' | 'sol';

const cryptoInfo = {
  btc: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: Bitcoin,
    color: '#f7931a',
    address: CRYPTO_ADDRESSES.btc,
  },
  eth: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: Wallet,
    color: '#627eea',
    address: CRYPTO_ADDRESSES.eth,
  },
  sol: {
    name: 'Solana',
    symbol: 'SOL',
    icon: Wallet,
    color: '#00ffa3',
    address: CRYPTO_ADDRESSES.sol,
  },
};

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { user } = useAuthStore();
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('btc');
  const [txHash, setTxHash] = useState('');
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopy = async () => {
    const address = cryptoInfo[selectedCrypto].address;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Address copied to clipboard!');
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!txHash.trim()) {
      toast.error('Please enter the transaction hash');
      return;
    }
    if (!amount.trim() || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      await createDepositRequest({
        userId: user.id,
        username: user.username,
        amount: parseFloat(amount),
        cryptoType: selectedCrypto,
        txHash: txHash.trim(),
      });

      toast.success('Deposit request submitted! Waiting for approval.');
      setTxHash('');
      setAmount('');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit deposit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const crypto = cryptoInfo[selectedCrypto];
  const Icon = crypto.icon;

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
                  <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-neon-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Deposit</h2>
                    <p className="text-xs text-gray-400">Add funds to your account</p>
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
                        {/* Address Display */}
                        <div className="space-y-2">
                          <Label className="text-gray-400 text-sm">
                            Send {info.name} to this address
                          </Label>
                          <div className="relative">
                            <div
                              className="p-4 rounded-xl border-2 border-white/10 bg-dark-700 flex items-center gap-3"
                              style={{ borderColor: `${info.color}40` }}
                            >
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${info.color}20` }}
                              >
                                <Icon className="w-5 h-5" style={{ color: info.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-1">{info.name} Address</p>
                                <p className="text-xs sm:text-sm font-mono text-white break-all">
                                  {info.address}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleCopy}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              {copied ? (
                                <Check className="w-4 h-4 text-neon-green" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-2">
                          <Label className="text-gray-400 text-sm">Amount (USD)</Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="pl-8 bg-dark-700 border-white/10 text-white placeholder:text-gray-500 focus:border-neon-green focus:ring-neon-green/20 rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Transaction Hash Input */}
                        <div className="space-y-2">
                          <Label className="text-gray-400 text-sm">Transaction Hash</Label>
                          <Input
                            placeholder="Paste your transaction hash here"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            className="bg-dark-700 border-white/10 text-white placeholder:text-gray-500 focus:border-neon-green focus:ring-neon-green/20 rounded-xl"
                          />
                          <p className="text-xs text-gray-500">
                            Enter the transaction hash after sending {info.symbol}
                          </p>
                        </div>

                        {/* Submit Button */}
                        <Button
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="w-full bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold h-12 rounded-xl ripple"
                        >
                          {isSubmitting ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full"
                            />
                          ) : (
                            'Submit Deposit Request'
                          )}
                        </Button>

                        {/* Warning */}
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <p className="text-xs text-yellow-500 text-center">
                            Only send {info.symbol} to this address. Sending other assets may result in permanent loss.
                          </p>
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
