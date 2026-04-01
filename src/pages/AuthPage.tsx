import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Crown, Gift, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { redeemPromoCodeDb } from '@/lib/promo';

interface AuthPageProps {
  onPageChange: (page: string) => void;
}

export default function AuthPage({ onPageChange }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, register, resetPasswordWithRecoveryCode, setUser } = useAuthStore();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'forgot' && !recoveryCodeInput.trim()) {
      newErrors.recoveryCode = 'Recovery code is required';
    }

    if (mode === 'register' && !formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (mode === 'register' && formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          toast.success('Welcome back!');
          // Admin can go anywhere, default to home
          onPageChange('home');
        } else {
          toast.error(result.error || 'Login failed');
        }
      } else if (mode === 'register') {
        const result = await register(formData.email, formData.password, formData.username);
        if (result.success) {
          // Apply signup promo using Supabase
          if (promoCode.trim()) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const newUser = users.find((u: { email: string }) => u.email === formData.email.toLowerCase().trim());

            if (newUser) {
              const promoResult = await redeemPromoCodeDb(newUser.id, promoCode, 'signup');

              if (promoResult.success && promoResult.amount) {
                const updatedUser = {
                  ...newUser,
                  balance: Number(promoResult.new_balance ?? newUser.balance ?? 0),
                };

                const updatedUsers = users.map((u: any) =>
                  u.id === newUser.id
                    ? { ...u, balance: Number(promoResult.new_balance ?? newUser.balance ?? 0) }
                    : u
                );

                localStorage.setItem('users', JSON.stringify(updatedUsers));
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                setUser(updatedUser);

                toast.success(`Promo code applied! You received $${promoResult.amount}!`);
              } else {
                toast.error(promoResult.error || 'Invalid promo code');
              }
            }
          }
          if (result.recoveryCode) {
            try {
              await navigator.clipboard.writeText(result.recoveryCode);
              window.alert(`Your recovery code is:\n\n${result.recoveryCode}\n\nIt has been copied to your clipboard. Save it somewhere safe. You will need it if you ever forget your password.`);
            } catch {
              window.alert(`Your recovery code is:\n\n${result.recoveryCode}\n\nSave it somewhere safe. You will need it if you ever forget your password.`);
            }
          }
          toast.success('Account created successfully!');
          onPageChange('home');
        } else {
          toast.error(result.error || 'Registration failed');
        }
      } else if (mode === 'forgot') {
        const result = await resetPasswordWithRecoveryCode(
          formData.email,
          recoveryCodeInput,
          formData.password
        );

        if (result.success) {
          toast.success('Password reset successfully! You can now log in.');
          setRecoveryCodeInput('');
          setFormData({ email: '', password: '', username: '' });
          setMode('login');
        } else {
          toast.error(result.error || 'Failed to reset password');
        }
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setErrors({});
    setFormData({ email: '', password: '', username: '' });
    setPromoCode('');
    setRecoveryCodeInput('');
    setShowPromoInput(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-dark-800/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative p-8 pb-0">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center shadow-neon"
              >
                {mode === 'login' && <Crown className="w-10 h-10 text-dark-900" />}
                {mode === 'register' && <User className="w-10 h-10 text-dark-900" />}
                {mode === 'forgot' && <KeyRound className="w-10 h-10 text-dark-900" />}
              </motion.div>
              
              {/* Login/Sign Up Tabs */}
              {mode !== 'forgot' && (
                <div className="flex items-center justify-center gap-2 mb-4 p-1 bg-dark-700/50 rounded-xl">
                  <button
                    onClick={() => switchMode('login')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      mode === 'login' 
                        ? 'bg-neon-green text-dark-900' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => switchMode('register')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      mode === 'register' 
                        ? 'bg-neon-green text-dark-900' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}
              
              <h1 className="text-2xl font-bold text-white mb-2">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'register' && 'Create Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h1>
              <p className="text-gray-400 text-sm">
                {mode === 'login' && 'Sign in to continue playing'}
                {mode === 'register' && 'Join NeonCasino and start winning'}
                {mode === 'forgot' && 'Enter your email, recovery code, and new password'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Username - Only for register */}
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="username" className="text-gray-300">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                      className={`pl-12 h-12 bg-dark-700/50 border-white/10 text-white placeholder:text-gray-500 focus:border-neon-green focus:ring-neon-green/20 transition-all rounded-xl ${
                        errors.username ? 'border-red-500' : ''
                      }`}
                    />
                  </div>
                  {errors.username && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs"
                    >
                      {errors.username}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`pl-12 h-12 bg-dark-700/50 border-white/10 text-white placeholder:text-gray-500 focus:border-neon-green focus:ring-neon-green/20 transition-all rounded-xl ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Password - Not for forgot */}
            <AnimatePresence>
              {mode !== 'forgot' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="password" className="text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`pl-12 pr-12 h-12 bg-dark-700/50 border-white/10 text-white placeholder:text-gray-500 focus:border-neon-green focus:ring-neon-green/20 transition-all rounded-xl ${
                        errors.password ? 'border-red-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Promo Code Section - Only for Register */}
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <button
                  type="button"
                  onClick={() => setShowPromoInput(!showPromoInput)}
                  className="flex items-center gap-2 text-sm text-neon-green hover:underline"
                >
                  <Gift className="w-4 h-4" />
                  Have a promo code?
                </button>
                <AnimatePresence>
                  {showPromoInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="flex-1 h-10 bg-dark-700/50 border-white/10 text-white uppercase"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-neon-green to-emerald-500 text-dark-900 hover:opacity-90 font-semibold rounded-xl ripple flex items-center justify-center gap-2 shadow-neon"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full"
                />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-dark-800 text-gray-500">or</span>
              </div>
            </div>

            <div className="mt-6 text-center space-y-2">
              {mode === 'login' && (
                <>
                  <p className="text-gray-400 text-sm">
                    Don't have an account?
                    <button
                      onClick={() => switchMode('register')}
                      className="ml-2 text-neon-green hover:underline font-medium"
                    >
                      Sign Up
                    </button>
                  </p>
                  <p className="text-gray-500 text-sm">
                    <button
                      onClick={() => switchMode('forgot')}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Forgot password?
                    </button>
                  </p>
                </>
              )}
              {mode === 'register' && (
                <p className="text-gray-400 text-sm">
                  Already have an account?
                  <button
                    onClick={() => switchMode('login')}
                    className="ml-2 text-neon-green hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <p className="text-gray-400 text-sm">
                  Remember your password?
                  <button
                    onClick={() => switchMode('login')}
                    className="ml-2 text-neon-green hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
