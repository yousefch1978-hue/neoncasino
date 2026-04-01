import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types';
import { sendWelcomeEmail } from '@/lib/emailService';
import { upsertProfile, getProfileById } from '@/lib/profiles';
import { safeAddBalance, safeSubtractBalance } from '@/lib/balance';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean; error?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; recoveryCode?: string; error?: string }>;
  resetPasswordWithRecoveryCode: (email: string, recoveryCode: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateBalance: (amount: number) => void;
  setUser: (user: User | null) => void;
  isAdmin: () => boolean;
}

// Simple hash function
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
};

// Admin credentials - HARDCODED FOR GUARANTEED ACCESS
const ADMIN_EMAIL = 'yousefch1978@gmail.com';
const ADMIN_PASSWORD = 'Apple@2020';
const ADMIN_PASSWORD_HASH = hashPassword(ADMIN_PASSWORD);

const generateRecoveryCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}-${part()}-${part()}`;
};

// Initialize default data - only adds admin if not exists, never removes users
const initializeData = () => {
  // Get existing users or empty array
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const adminIndex = users.findIndex((u: any) => u.email === ADMIN_EMAIL);
  
  const adminUser = {
    id: 'admin-001',
    email: ADMIN_EMAIL,
    username: 'admin',
    password: ADMIN_PASSWORD_HASH,
    role: 'admin',
    balance: 999999,
    createdAt: new Date().toISOString(),
  };
  
  if (adminIndex >= 0) {
    // Update existing admin but keep the same ID
    users[adminIndex] = { ...users[adminIndex], ...adminUser };
  } else {
    users.push(adminUser);
  }
  
  localStorage.setItem('users', JSON.stringify(users));
};

// Run initialization
initializeData();

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        try {
          const normalizedEmail = email.toLowerCase().trim();
          const inputPasswordHash = hashPassword(password);
          
          // SPECIAL ADMIN LOGIN - CHECK FIRST
          if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
            if (inputPasswordHash === ADMIN_PASSWORD_HASH || password === ADMIN_PASSWORD) {
              const adminUser: User = {
                id: 'admin-001',
                email: ADMIN_EMAIL,
                username: 'Admin',
                role: 'admin',
                balance: 999999,
                createdAt: new Date().toISOString(),
              };
              
              await upsertProfile({
                id: adminUser.id,
                email: adminUser.email,
                username: adminUser.username,
                role: 'admin',
                createdAt: adminUser.createdAt,
              });

              set({ user: adminUser, isAuthenticated: true });
              localStorage.setItem('currentUser', JSON.stringify(adminUser));
              
              return { success: true, isAdmin: true };
            } else {
              return { success: false, error: 'Invalid admin password' };
            }
          }
          
          // Regular user login
          const users = JSON.parse(localStorage.getItem('users') || '[]');
          const user = users.find((u: any) => 
            u.email.toLowerCase() === normalizedEmail && 
            (u.password === inputPasswordHash || u.password === hashPassword(password))
          );

          if (!user) {
            return { success: false, error: 'Invalid email or password' };
          }

          await upsertProfile({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
          });

          let profileBalance = user.balance;
          try {
            const profile = await getProfileById(user.id);
            profileBalance = Number(profile.balance ?? user.balance);
          } catch (error) {}

          const userWithoutPassword: User = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            balance: profileBalance,
            createdAt: user.createdAt,
          };
          
          set({ user: userWithoutPassword, isAuthenticated: true });
          localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
          
          return { success: true, isAdmin: user.role === 'admin' };
        } catch (error) {
          console.error('Login error:', error);
          return { success: false, error: 'Login failed' };
        }
      },

      register: async (email: string, password: string, username: string) => {
        try {
          const normalizedEmail = email.toLowerCase().trim();
          
          // Prevent registration with admin email
          if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
            return { success: false, error: 'This email is reserved' };
          }

          const users = JSON.parse(localStorage.getItem('users') || '[]');
          
          if (users.some((u: any) => u.email.toLowerCase() === normalizedEmail)) {
            return { success: false, error: 'Email already registered' };
          }

          if (users.some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, error: 'Username already taken' };
          }

          const recoveryCode = generateRecoveryCode();

          const newUser = {serverSeed: Math.random().toString(36).substring(2),
clientSeed: Math.random().toString(36).substring(2),
nonce: 0,
            id: `user-${Date.now()}`,
            email: normalizedEmail,
            username,
            password: hashPassword(password),
            role: 'user',
            balance: 0,
            createdAt: new Date().toISOString(),
            verified: true,
            recoveryCode,
          };

          users.push(newUser);
          localStorage.setItem('users', JSON.stringify(users));

          const userWithoutPassword: User = {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            role: newUser.role as 'user' | 'admin',
            balance: newUser.balance,
            createdAt: newUser.createdAt,
            verified: true,
          } as User & { verified?: boolean };

          await upsertProfile({
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            username: userWithoutPassword.username,
            role: userWithoutPassword.role,
            balance: userWithoutPassword.balance,
            createdAt: userWithoutPassword.createdAt,
          });

          set({ user: userWithoutPassword, isAuthenticated: true });
          localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));

          sendWelcomeEmail(normalizedEmail, username).catch(console.error);

          return { success: true, recoveryCode };
        } catch (error) {
          console.error('Register error:', error);
          return { success: false, error: 'Registration failed' };
        }
      },
resetPasswordWithRecoveryCode: async (email: string, recoveryCode: string, newPassword: string) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRecoveryCode = recoveryCode.trim().toUpperCase();

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: any) => u.email.toLowerCase() === normalizedEmail);

    if (userIndex === -1) {
      return { success: false, error: 'Account not found' };
    }

    const account = users[userIndex];

    if (!account.recoveryCode) {
      return { success: false, error: 'No recovery code set for this account' };
    }

    if (account.recoveryCode.toUpperCase() !== normalizedRecoveryCode) {
      return { success: false, error: 'Invalid recovery code' };
    }

    users[userIndex].password = hashPassword(newPassword);
    localStorage.setItem('users', JSON.stringify(users));

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to reset password' };
  }
},

      logout: () => {
        localStorage.removeItem('currentUser');
        set({ user: null, isAuthenticated: false });
      },

    updateBalance: async (amount: number) => {
  const { user } = get();
  if (!user) return;

  try {
    const newBalance =
      amount >= 0
        ? await safeAddBalance(user.id, amount, 'manual_balance_update', { source: 'frontend' })
        : await safeSubtractBalance(user.id, Math.abs(amount), 'manual_balance_update', { source: 'frontend' });

    const updatedUser = { ...user, balance: Number(newBalance) };
    set({ user: updatedUser });
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) =>
      u.id === user.id ? { ...u, balance: Number(newBalance) } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));
  } catch (error) {
    console.error('Failed to update balance safely:', error);
  }
},
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin' || user?.email === ADMIN_EMAIL;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Initialize auth state
export const initializeAuth = () => {
  const currentUser = localStorage.getItem('currentUser');

  if (!currentUser) {
    useAuthStore.getState().setUser(null);
    return;
  }

  try {
    const savedUser = JSON.parse(currentUser);

    if (savedUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      const adminUser: User = {
        id: 'admin-001',
        email: ADMIN_EMAIL,
        username: 'Admin',
        role: 'admin',
        balance: 999999,
        createdAt: savedUser.createdAt || new Date().toISOString(),
      };

      useAuthStore.getState().setUser(adminUser);
      localStorage.setItem('currentUser', JSON.stringify(adminUser));

      upsertProfile({
        id: adminUser.id,
        email: adminUser.email,
        username: adminUser.username,
        role: 'admin',
        createdAt: adminUser.createdAt,
      }).catch(console.error);
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const matchedUser = users.find((u: any) => u.id === savedUser.id || u.email === savedUser.email);

    if (matchedUser) {
      const userWithoutPassword: User = {
        id: matchedUser.id,
        email: matchedUser.email,
        username: matchedUser.username,
        role: matchedUser.role,
        balance: matchedUser.balance,
        createdAt: matchedUser.createdAt,
      };

      useAuthStore.getState().setUser(userWithoutPassword);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));

      upsertProfile({
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        username: userWithoutPassword.username,
        role: userWithoutPassword.role,
        createdAt: userWithoutPassword.createdAt,
      }).then(async () => {
        try {
          const profile = await getProfileById(userWithoutPassword.id);
          const syncedUser = {
            ...userWithoutPassword,
            balance: Number(profile.balance ?? userWithoutPassword.balance),
          };
          useAuthStore.getState().setUser(syncedUser);
          localStorage.setItem('currentUser', JSON.stringify(syncedUser));
        } catch (error) {}
      }).catch(console.error);
    } else {
      localStorage.removeItem('currentUser');
      useAuthStore.getState().setUser(null);
    }
  } catch (error) {
    localStorage.removeItem('currentUser');
    useAuthStore.getState().setUser(null);
  }
};
