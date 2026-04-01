import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Wallet, ArrowDownLeft, ArrowUpRight, 
  Check, X, Search, LogOut, TrendingUp, 
  DollarSign, Gamepad2, Plus, Trash2, Gift,
  Activity, UserCheck, Crown, BarChart3, Mail,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { getPendingDepositRequests, getApprovedDepositTotal, approveDepositRequest, rejectDepositRequest } from '../lib/adminDeposits';
import { supabase } from '../lib/supabase';
import { useGameStore } from '@/store/gameStore';
import { getSentEmails } from '@/lib/emailService';
import { getPendingWithdrawalRequests, approveWithdrawalRequest, rejectWithdrawalRequest } from '../lib/withdrawals';
import type { User } from '@/types';
import { toast } from 'sonner';
import { fetchPromoCodesDb, createPromoCodeDb, deletePromoCodeDb } from '@/lib/promo';

interface AdminPageProps {
  onPageChange: (page: string) => void;
}

export default function AdminPage({ onPageChange }: AdminPageProps) {
  const { logout, user: adminUser } = useAuthStore();
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const { bets, getTotalProfit, getTotalWagered } = useGameStore();
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  
  const [users, setUsers] = useState<(User & { password: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAdjustment, setBalanceAdjustment] = useState('');
  
  // Promo code form
  const [newCode, setNewCode] = useState('');
  const [newCodeAmount, setNewCodeAmount] = useState('');
  const [newCodeUses, setNewCodeUses] = useState('');
  const [newCodeType, setNewCodeType] = useState<'signup_only' | 'redeem_only' | 'both'>('both');

  // Sent emails
  const [sentEmails, setSentEmails] = useState<any[]>([]);

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers(storedUsers);
    setSentEmails(getSentEmails());

    const loadWithdrawalData = async () => {
      try {
        const pendingWithdrawals = await getPendingWithdrawalRequests();
        setWithdrawals(pendingWithdrawals);
      } catch (error) {
        console.error(error);
      }
    };

    loadWithdrawalData();

    const loadDepositData = async () => {
      try {
        const [pending, total] = await Promise.all([
          getPendingDepositRequests(),
          getApprovedDepositTotal(),
        ]);
        setPendingDeposits(pending);
        setTotalDeposits(total);
      } catch (error) {
        console.error(error);
      }
    };

    loadDepositData();
    const loadPromoCodes = async () => {
      try {
        const codes = await fetchPromoCodesDb();
        setPromoCodes(codes);
      } catch (error) {
        console.error(error);
      }
    };

    loadPromoCodes();


    const channel = supabase
      .channel('admin-deposit-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposit_requests',
        },
        async () => {
          await loadDepositData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
const handleApproveDeposit = async (id: string) => {
  try {
    await approveDepositRequest(id)

    const [pending, total] = await Promise.all([
      getPendingDepositRequests(),
      getApprovedDepositTotal(),
    ])

    setPendingDeposits(pending)
    setTotalDeposits(total)

    toast.success('Deposit approved!')
  } catch (error) {
    console.error(error)
    toast.error('Failed to approve deposit')
  }
}


  const handleRejectDeposit = async (transactionId: string) => {
    try {
      await rejectDepositRequest(transactionId);
      const [pending, total] = await Promise.all([
        getPendingDepositRequests(),
        getApprovedDepositTotal(),
      ]);
      setPendingDeposits(pending);
      setTotalDeposits(total);
      toast.error('Deposit rejected!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to reject deposit');
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    if (!adminUser) return;

    try {
      await approveWithdrawalRequest(withdrawalId, adminUser.id);
      const pendingWithdrawals = await getPendingWithdrawalRequests();
      setWithdrawals(pendingWithdrawals);
      toast.success('Withdrawal approved! Send funds to the wallet address shown.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to approve withdrawal');
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    if (adminUser) {
      // Get withdrawal details to refund user
      const withdrawal = withdrawals.find(w => w.id === withdrawalId);
      if (withdrawal) {
        // Refund user's balance
        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = storedUsers.findIndex((u: User) => u.id === withdrawal.user_id);
        if (userIndex !== -1) {
          storedUsers[userIndex].balance += withdrawal.amount;
          localStorage.setItem('users', JSON.stringify(storedUsers));
          setUsers(storedUsers);
        }
      }
      
      await rejectWithdrawalRequest(withdrawalId, adminUser.id);
      toast.error('Withdrawal rejected! Balance refunded to user.');
    }
  };

  const handleAdjustBalance = (userId: string) => {
    const amount = parseFloat(balanceAdjustment);
    if (isNaN(amount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = storedUsers.findIndex((u: User) => u.id === userId);
    
    if (userIndex !== -1) {
      storedUsers[userIndex].balance = Math.max(0, storedUsers[userIndex].balance + amount);
      localStorage.setItem('users', JSON.stringify(storedUsers));
      setUsers(storedUsers);
      setBalanceAdjustment('');
      setSelectedUser(null);
      toast.success(`Balance adjusted by $${amount}`);
    }
  };

  const handleCreatePromoCode = async () => {
    if (!newCode.trim() || !newCodeAmount || !newCodeUses) {
      toast.error('Please fill in all fields');
      return;
    }

    const amount = parseFloat(newCodeAmount);
    const uses = parseInt(newCodeUses);

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (isNaN(uses) || uses <= 0) {
      toast.error('Please enter a valid number of uses');
      return;
    }

    try {
      await createPromoCodeDb(newCode, amount, uses, adminUser?.id || 'admin', newCodeType);
      const codes = await fetchPromoCodesDb();
      setPromoCodes(codes);
      toast.success(`Promo code "${newCode.toUpperCase()}" created!`);
      setNewCode('');
      setNewCodeAmount('');
      setNewCodeUses('');
      setNewCodeType('both');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create promo code');
    }
  };

  const handleDeletePromoCode = async (codeId: string) => {
    try {
      await deletePromoCodeDb(codeId);
      const codes = await fetchPromoCodesDb();
      setPromoCodes(codes);
      toast.success('Promo code deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete promo code');
    }
  };

  const handleLogout = () => {
    logout();
    onPageChange('home');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalUsers = users.length;
  const totalBalance = users.reduce((acc, u) => acc + u.balance, 0);
  const totalProfit = getTotalProfit();
  const totalWagered = getTotalWagered();
  const totalBets = bets.length;
  const onlinePlayers = Math.floor(totalUsers * 0.3);
  const pendingWithdrawalCount = withdrawals.length;

  const getCryptoName = (type: string) => ({ btc: 'Bitcoin', eth: 'Ethereum', sol: 'Solana', BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana' }[type] || type);

  const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 p-4 sm:p-5 hover:border-white/10 transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
      {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
    </motion.div>
  );

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center shadow-neon">
              <Crown className="w-7 h-7 text-dark-900" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400 text-sm">Manage your casino platform</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <StatCard icon={Users} label="Users" value={totalUsers} color="bg-neon-green/20" trend={`${onlinePlayers} online`} />
          <StatCard icon={UserCheck} label="Online" value={onlinePlayers} color="bg-neon-purple/20" />
          <StatCard icon={Wallet} label="Balance" value={`$${totalBalance.toFixed(0)}`} color="bg-blue-500/20" />
          <StatCard icon={DollarSign} label="Deposits" value={`$${totalDeposits.toFixed(0)}`} color="bg-yellow-500/20" />
          <StatCard icon={TrendingUp} label="Wagered" value={`$${totalWagered.toFixed(0)}`} color="bg-orange-500/20" />
          <StatCard icon={Activity} label="Profit" value={`$${Math.abs(totalProfit).toFixed(0)}`} color={totalProfit >= 0 ? 'bg-neon-green/20' : 'bg-red-500/20'} />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 bg-dark-800 p-1 rounded-xl mb-6 overflow-x-auto">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-dark-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm whitespace-nowrap">
              <BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="deposits" className="rounded-lg data-[state=active]:bg-dark-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm whitespace-nowrap">
              <ArrowDownLeft className="w-4 h-4 mr-1 hidden sm:inline" />
              Deposits ({pendingDeposits.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-lg data-[state=active]:bg-dark-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm whitespace-nowrap">
              <ArrowUpRight className="w-4 h-4 mr-1 hidden sm:inline" />
              Withdrawals ({pendingWithdrawalCount})
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-dark-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm whitespace-nowrap">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Users
            </TabsTrigger>
            <TabsTrigger value="promocodes" className="rounded-lg data-[state=active]:bg-dark-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm whitespace-nowrap">
              <Gift className="w-4 h-4 mr-1 hidden sm:inline" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="emails" className="rounded-lg data-[state=active]:bg-dark-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm whitespace-nowrap">
              <Mail className="w-4 h-4 mr-1 hidden sm:inline" />
              Emails
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Bets */}
              <div className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-neon-green" />
                    <h3 className="font-semibold text-white">Recent Bets</h3>
                  </div>
                  <span className="text-xs text-gray-400">{totalBets} total</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {bets.slice(0, 10).map((bet) => (
                    <div key={bet.id} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center text-xs font-bold text-white">
                          {bet.username?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{bet.username}</p>
                          <p className="text-xs text-gray-500">{bet.game}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">${bet.amount}</p>
                        <p className={`text-xs ${bet.result === 'win' ? 'text-neon-green' : bet.result === 'loss' ? 'text-red-500' : 'text-gray-500'}`}>
                          {bet.result === 'win' ? `+$${bet.payout.toFixed(2)}` : bet.result === 'loss' ? `-$${bet.amount}` : 'pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {bets.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No bets yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Withdrawals */}
              <div className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold text-white">Recent Withdrawals</h3>
                  </div>
                  <span className="text-xs text-gray-400">{withdrawals.length} total</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {withdrawals.slice(0, 10).map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          w.status === 'approved' ? 'bg-neon-green/20 text-neon-green' : 
                          w.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{w.username}</p>
                          <p className="text-xs text-gray-500">{getCryptoName(w.crypto_type)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">${w.amount}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          w.status === 'approved' ? 'bg-neon-green/20 text-neon-green' :
                          w.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {w.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {withdrawals.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <ArrowUpRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No withdrawals yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits">
            <div className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 overflow-hidden">
              {pendingDeposits.length === 0 ? (
                <div className="p-12 text-center">
                  <ArrowDownLeft className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400">No pending deposits</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dark-700/50">
                      <tr>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Crypto</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">TX Hash</th>
                        <th className="px-4 sm:px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingDeposits.map((deposit) => (
                        <tr key={deposit.id} className="hover:bg-white/5">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center text-xs font-bold text-white">
                                {deposit.username?.[0] || '?'}
                              </div>
                              <span className="text-white text-sm">{deposit.username}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-neon-green font-medium">
                            ${deposit.amount.toFixed(2)}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-gray-400 hidden sm:table-cell">
                            {getCryptoName(deposit.crypto_type)}
                          </td>
                          <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                            <span className="text-xs text-gray-500 font-mono truncate max-w-[150px] block">
                              {deposit.tx_hash}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveDeposit(deposit.id)}
                                className="p-2 rounded-lg bg-neon-green/10 text-neon-green hover:bg-neon-green/20 transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectDeposit(deposit.id)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <div className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 overflow-hidden">
              {withdrawals.length === 0 ? (
                <div className="p-12 text-center">
                  <ArrowUpRight className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400">No pending withdrawals</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dark-700/50">
                      <tr>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Crypto</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Wallet Address</th>
                        <th className="px-4 sm:px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {withdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-white/5">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-xs font-bold text-white">
                                {withdrawal.username?.[0] || '?'}
                              </div>
                              <div>
                                <span className="text-white text-sm block">{withdrawal.username}</span>
                                <span className="text-xs text-gray-500">{withdrawal.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-orange-500 font-medium">
                            ${withdrawal.amount.toFixed(2)}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-gray-400 hidden sm:table-cell">
                            {getCryptoName(withdrawal.crypto_type)}
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-mono truncate max-w-[120px] sm:max-w-[200px] block">
                                {withdrawal.wallet_address}
                              </span>
                              <button
                                onClick={() => copyToClipboard(withdrawal.wallet_address)}
                                className="p-1 rounded bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
                                title="Copy wallet address"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                className="p-2 rounded-lg bg-neon-green/10 text-neon-green hover:bg-neon-green/20 transition-colors"
                                title="Approve - Send funds to this wallet"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(withdrawal.id)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                title="Reject - Refund user"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Instructions */}
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                <strong>Instructions:</strong> Click the checkmark to approve a withdrawal (you must manually send funds to the wallet address shown). 
                Click X to reject and refund the user's balance.
              </p>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 bg-dark-700/50 border-white/10 text-white rounded-xl"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dark-700/50">
                      <tr>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Email</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Balance</th>
                        <th className="px-4 sm:px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/5">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center text-xs font-bold text-white">
                                {u.username[0]}
                              </div>
                              <span className="text-white font-medium text-sm">{u.username}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-gray-400 hidden sm:table-cell text-sm">{u.email}</td>
                          <td className="px-4 sm:px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.role === 'admin' 
                                ? 'bg-neon-purple/20 text-neon-purple' 
                                : 'bg-blue-500/20 text-blue-500'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-neon-green font-medium">
                            ${u.balance.toFixed(2)}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                              className="px-3 py-1.5 rounded-lg bg-dark-700 text-sm text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="promocodes">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Promo Code */}
              <div className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Gift className="w-5 h-5 text-neon-green" />
                  <h3 className="font-semibold text-white">Create Promo Code</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-400 text-sm mb-2 block">Code</Label>
                    <Input
                      placeholder="e.g. WELCOME100"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      className="bg-dark-700/50 border-white/10 text-white uppercase"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm mb-2 block">Amount ($)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 100"
                      value={newCodeAmount}
                      onChange={(e) => setNewCodeAmount(e.target.value)}
                      className="bg-dark-700/50 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm mb-2 block">Number of Uses</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 50"
                      value={newCodeUses}
                      onChange={(e) => setNewCodeUses(e.target.value)}
                      className="bg-dark-700/50 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm mb-2 block">Promo Type</Label>
                    <select
                      value={newCodeType}
                      onChange={(e) => setNewCodeType(e.target.value as 'signup_only' | 'redeem_only' | 'both')}
                      className="w-full h-10 rounded-md bg-dark-700/50 border border-white/10 text-white px-3"
                    >
                      <option value="both">Both</option>
                      <option value="signup_only">Sign Up Only</option>
                      <option value="redeem_only">Logged-in Only</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleCreatePromoCode}
                    className="w-full bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Code
                  </Button>
                </div>
              </div>

              {/* Active Promo Codes */}
              <div className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-neon-purple" />
                    <h3 className="font-semibold text-white">Active Codes</h3>
                  </div>
                  <span className="text-xs text-gray-400">{promoCodes.length} codes</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {promoCodes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-white font-mono font-medium">{code.code}</p>
                        <p className="text-xs text-gray-500">
                          Uses: {code.totalUses - code.usesLeft} / {code.totalUses}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-neon-green font-medium">${code.amount}</span>
                        <button
                          onClick={() => handleDeletePromoCode(code.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {promoCodes.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No promo codes yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails">
            <div className="bg-dark-800/80 backdrop-blur rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-neon-green" />
                  <h3 className="font-semibold text-white">Sent Emails</h3>
                </div>
                <span className="text-xs text-gray-400">{sentEmails.length} emails</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {sentEmails.map((email) => (
                  <div key={email.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{email.to}</span>
                      <span className="text-xs text-gray-500">{new Date(email.sentAt).toLocaleString()}</span>
                    </div>
                    <p className="text-neon-green text-sm">{email.subject}</p>
                  </div>
                ))}
                {sentEmails.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No emails sent yet</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Balance Adjustment Modal */}
        <AnimatePresence>
          {selectedUser && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedUser(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 px-4"
              >
                <div className="bg-dark-800 rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Adjust Balance: {selectedUser.username}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Current Balance: <span className="text-neon-green">${selectedUser.balance.toFixed(2)}</span>
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400 text-sm mb-2 block">
                        Amount (use negative to deduct)
                      </Label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={balanceAdjustment}
                        onChange={(e) => setBalanceAdjustment(e.target.value)}
                        className="bg-dark-700/50 border-white/10 text-white"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleAdjustBalance(selectedUser.id)}
                        className="flex-1 bg-neon-green text-dark-900 hover:bg-neon-green/90"
                      >
                        Apply
                      </Button>
                      <Button
                        onClick={() => setSelectedUser(null)}
                        variant="outline"
                        className="flex-1 border-white/10 text-gray-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
