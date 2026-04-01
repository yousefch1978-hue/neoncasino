import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CryptoType = 'BTC' | 'ETH' | 'SOL';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  amount: number;
  cryptoType: CryptoType;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

interface WithdrawalStore {
  withdrawals: WithdrawalRequest[];
  requestWithdrawal: (data: Omit<WithdrawalRequest, 'id' | 'status' | 'createdAt'>) => { success: boolean; error?: string };
  approveWithdrawal: (withdrawalId: string, adminId: string) => void;
  rejectWithdrawal: (withdrawalId: string, adminId: string) => void;
  getPendingWithdrawals: () => WithdrawalRequest[];
  getUserWithdrawals: (userId: string) => WithdrawalRequest[];
  getAllWithdrawals: () => WithdrawalRequest[];
}

export const useWithdrawalStore = create<WithdrawalStore>()(
  persist(
    (set, get) => ({
      withdrawals: [],

      requestWithdrawal: (data) => {
        const { amount } = data;
        
        // Minimum withdrawal is $10
        if (amount < 20) {
          return { success: false, error: 'Minimum withdrawal amount is $20' };
        }

        const withdrawal: WithdrawalRequest = {
          ...data,
          id: `wd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          withdrawals: [withdrawal, ...state.withdrawals],
        }));

        return { success: true };
      },

      approveWithdrawal: (withdrawalId, adminId) => {
        set((state) => ({
          withdrawals: state.withdrawals.map((w) =>
            w.id === withdrawalId
              ? {
                  ...w,
                  status: 'approved',
                  processedAt: new Date().toISOString(),
                  processedBy: adminId,
                }
              : w
          ),
        }));
      },

      rejectWithdrawal: (withdrawalId, adminId) => {
        set((state) => ({
          withdrawals: state.withdrawals.map((w) =>
            w.id === withdrawalId
              ? {
                  ...w,
                  status: 'rejected',
                  processedAt: new Date().toISOString(),
                  processedBy: adminId,
                }
              : w
          ),
        }));
      },

      getPendingWithdrawals: () => {
        return get().withdrawals.filter((w) => w.status === 'pending');
      },

      getUserWithdrawals: (userId) => {
        return get().withdrawals.filter((w) => w.userId === userId);
      },

      getAllWithdrawals: () => {
        return get().withdrawals;
      },
    }),
    {
      name: 'withdrawal-storage',
    }
  )
);
