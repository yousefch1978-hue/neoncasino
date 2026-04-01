import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PromoCode } from '@/types';

interface PromoCodeStore {
  promoCodes: PromoCode[];
  usedCodes: Record<string, string[]>;
  usedDevices: Record<string, string[]>;
  createPromoCode: (
    code: string,
    amount: number,
    uses: number,
    createdBy: string,
    redeemType?: 'signup_only' | 'redeem_only' | 'both'
  ) => PromoCode;
  deletePromoCode: (codeId: string) => void;
  usePromoCode: (
    code: string,
    userId: string,
    context?: 'signup' | 'redeem',
    accountCreatedAt?: string
  ) => { success: boolean; amount?: number; error?: string };
  getPromoCodeByCode: (code: string) => PromoCode | undefined;
  hasUserUsedCode: (userId: string, codeId: string) => boolean;
  getAllPromoCodes: () => PromoCode[];
}

export const usePromoCodeStore = create<PromoCodeStore>()(
  persist(
    (set, get) => ({
      promoCodes: [],
      usedCodes: {},
      usedDevices: {},

      createPromoCode: (
        code: string,
        amount: number,
        uses: number,
        createdBy: string,
        redeemType: 'signup_only' | 'redeem_only' | 'both' = 'both'
      ) => {
        const promoCode: PromoCode = {
          id: `promo-${Date.now()}`,
          code: code.toUpperCase(),
          amount,
          usesLeft: uses,
          totalUses: uses,
          createdAt: new Date().toISOString(),
          createdBy,
          redeemType,
        };

        set((state) => ({
          promoCodes: [...state.promoCodes, promoCode],
        }));

        return promoCode;
      },

      deletePromoCode: (codeId: string) => {
        set((state) => ({
          promoCodes: state.promoCodes.filter((p) => p.id !== codeId),
        }));
      },

      usePromoCode: (
        code: string,
        userId: string,
        context: 'signup' | 'redeem' = 'redeem',
        accountCreatedAt?: string
      ) => {
        const promoCode = get().promoCodes.find(
          (p) => p.code === code.toUpperCase()
        );

        if (!promoCode) {
          return { success: false, error: 'Invalid promo code' };
        }

        if (promoCode.usesLeft <= 0) {
          return { success: false, error: 'This code has been fully used' };
        }

        const deviceKey = 'promo-device-id';
        let deviceId = localStorage.getItem(deviceKey);

        if (!deviceId) {
          const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset(),
          ].join('|');

          deviceId = btoa(fingerprint);
          localStorage.setItem(deviceKey, deviceId);
        }

        const redeemType = promoCode.redeemType || 'both';

        if (context === 'signup' && redeemType === 'redeem_only') {
          return {
            success: false,
            error: 'This code can only be redeemed by logged-in accounts',
          };
        }

        if (context === 'signup') {
          const deviceUsedCodes = get().usedDevices[deviceId] || [];

          if (deviceUsedCodes.includes(promoCode.id)) {
            return {
              success: false,
              error: 'This signup bonus was already used on this device',
            };
          }
        }

        if (context === 'redeem' && redeemType === 'signup_only') {
          return {
            success: false,
            error: 'This code is only valid during sign up',
          };
        }

        if (context === 'redeem') {
          if (!accountCreatedAt) {
            return { success: false, error: 'Could not verify account age' };
          }

          const createdAtMs = new Date(accountCreatedAt).getTime();
          const nowMs = Date.now();
          const ageMs = nowMs - createdAtMs;
          const minAgeMs = 24 * 60 * 60 * 1000;

          if (!Number.isFinite(createdAtMs) || ageMs < minAgeMs) {
            const remainingMs = Math.max(0, minAgeMs - ageMs);
            const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
            return {
              success: false,
              error: `Your account must be at least 24 hours old to redeem this code. Try again in about ${remainingHours} hour(s).`,
            };
          }
        }

        const userUsedCodes = get().usedCodes[userId] || [];
        if (userUsedCodes.includes(promoCode.id)) {
          return {
            success: false,
            error: 'You have already used this code on this account',
          };
        }

        const deviceUsedCodes = get().usedDevices[deviceId] || [];
        if (deviceUsedCodes.includes(promoCode.id)) {
          return {
            success: false,
            error: 'This code has already been used on this device',
          };
        }

        set((state) => ({
          promoCodes: state.promoCodes.map((p) =>
            p.id === promoCode.id ? { ...p, usesLeft: p.usesLeft - 1 } : p
          ),
          usedCodes: {
            ...state.usedCodes,
            [userId]: [...userUsedCodes, promoCode.id],
          },
          usedDevices: {
            ...state.usedDevices,
            [deviceId!]: [...deviceUsedCodes, promoCode.id],
          },
        }));

        return { success: true, amount: promoCode.amount };
      },

      getPromoCodeByCode: (code: string) => {
        return get().promoCodes.find((p) => p.code === code.toUpperCase());
      },

      hasUserUsedCode: (userId: string, codeId: string) => {
        const userUsedCodes = get().usedCodes[userId] || [];
        return userUsedCodes.includes(codeId);
      },

      getAllPromoCodes: () => {
        return get().promoCodes;
      },
    }),
    {
      name: 'promo-code-storage',
    }
  )
);