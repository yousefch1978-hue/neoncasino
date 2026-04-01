import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction } from '@/types';

interface TransactionStore {
  transactions: Transaction[];
  pendingDeposits: Transaction[];
  pendingWithdrawals: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'status'>) => void;
  approveTransaction: (transactionId: string) => void;
  rejectTransaction: (transactionId: string) => void;
  getUserTransactions: (userId: string) => Transaction[];
  getPendingTransactions: () => Transaction[];
  getTotalDeposits: () => number;
  getTotalWithdrawals: () => number;
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      pendingDeposits: [],
      pendingWithdrawals: [],

      addTransaction: (transactionData) => {
        const transaction: Transaction = {
          ...transactionData,
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          if (transaction.type === 'deposit') {
            return {
              transactions: [transaction, ...state.transactions],
              pendingDeposits: [transaction, ...state.pendingDeposits],
              pendingWithdrawals: state.pendingWithdrawals,
            };
          } else {
            return {
              transactions: [transaction, ...state.transactions],
              pendingDeposits: state.pendingDeposits,
              pendingWithdrawals: [transaction, ...state.pendingWithdrawals],
            };
          }
        });
      },

      approveTransaction: (transactionId) => {
        set((state) => {
          const updatedTransactions = state.transactions.map((tx) =>
            tx.id === transactionId ? { ...tx, status: 'approved' as const } : tx
          );

          return {
            transactions: updatedTransactions,
            pendingDeposits: state.pendingDeposits.filter((tx) => tx.id !== transactionId),
            pendingWithdrawals: state.pendingWithdrawals.filter((tx) => tx.id !== transactionId),
          };
        });
      },

      rejectTransaction: (transactionId) => {
        set((state) => {
          const updatedTransactions = state.transactions.map((tx) =>
            tx.id === transactionId ? { ...tx, status: 'rejected' as const } : tx
          );

          return {
            transactions: updatedTransactions,
            pendingDeposits: state.pendingDeposits.filter((tx) => tx.id !== transactionId),
            pendingWithdrawals: state.pendingWithdrawals.filter((tx) => tx.id !== transactionId),
          };
        });
      },

      getUserTransactions: (userId) => {
        return get().transactions.filter((tx) => tx.userId === userId);
      },

      getPendingTransactions: () => {
        return get().transactions.filter((tx) => tx.status === 'pending');
      },

      getTotalDeposits: () => {
        return get().transactions
          .filter((tx) => tx.type === 'deposit' && tx.status === 'approved')
          .reduce((total, tx) => total + tx.amount, 0);
      },

      getTotalWithdrawals: () => {
        return get().transactions
          .filter((tx) => tx.type === 'withdrawal' && tx.status === 'approved')
          .reduce((total, tx) => total + tx.amount, 0);
      },
    }),
    {
      name: 'transaction-storage',
    }
  )
);

export const loadTransactions = () => {
  // Placeholder for initialization
};
