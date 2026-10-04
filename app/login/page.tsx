'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mail,
  ArrowRight,
  Shield,
  Loader2,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PhotosLogo } from '@/components/photos-logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'magic-link' (default) or 'password'
  const [authMode, setAuthMode] = useState<'magic-link' | 'password'>('magic-link');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Flow states
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Handle URL errors (e.g. callback code expired)
  useEffect(() => {
    const urlError = searchParams.get('error');
    const redirectedFrom = searchParams.get('redirectedFrom');

    if (urlError === 'auth-code-error') {
      setErrorMessage('Your login link expired or was invalid. Please request a new one.');
    } else if (redirectedFrom) {
      setErrorMessage('Authentication required. Please sign in to access your vault.');
    }
  }, [searchParams]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Send Magic Link / OTP Code
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback?next=/dashboard`;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        // Customize error for private server / rate limits
        if (error.message.toLowerCase().includes('rate limit')) {
          setIsRateLimited(true);
          setErrorMessage(
            "Supabase's default email service has an hourly rate limit (~3 emails/hr). Cooldown lasts ~1 hour. Use the Password tab below to sign in immediately without waiting!"
          );
        } else {
          setIsRateLimited(false);
          setErrorMessage(error.message);
        }
      } else {
        setIsRateLimited(false);
        setIsOtpSent(true);
        setCountdown(60);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify 6-digit OTP Code directly in app
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otpToken) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpToken.trim(),
        type: 'email',
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid or expired 6-digit code.');
      } else if (data.session) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with Email and Password
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
      } else if (data.session) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden px-5 py-12">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-blue-500/8 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[460px] glass-card rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center gap-6 shadow-2xl border border-white/10">
        {/* Photos Logo */}
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-xl">
          <PhotosLogo className="w-10 h-10" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-1.5">
          <h1 className="font-[family-name:var(--font-manrope)] text-[28px] sm:text-[32px] font-bold leading-tight tracking-tight text-[#e5e2e1]">
            Photos
          </h1>
          <p className="font-[family-name:var(--font-inter)] text-sm text-[#8c909f]">
            Private, encrypted cloud vault for family media.
          </p>
        </div>

        {/* Auth Mode Segmented Switcher (Shown when not in OTP verification state) */}
        {!isOtpSent && (
          <div className="w-full grid grid-cols-2 p-1 bg-[#141414] border border-white/10 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setAuthMode('magic-link');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 pressable ${
                authMode === 'magic-link'
                  ? 'bg-[#252525] text-[#adc6ff] shadow-sm font-semibold border border-white/10'
                  : 'text-[#8c909f] hover:text-[#c2c6d6]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Magic Link / OTP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 pressable ${
                authMode === 'password'
                  ? 'bg-[#252525] text-[#adc6ff] shadow-sm font-semibold border border-white/10'
                  : 'text-[#8c909f] hover:text-[#c2c6d6]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
          </div>
        )}

        {/* Error Alert Message */}
        {errorMessage && (
          <div
            className={`w-full p-3.5 rounded-xl text-left flex flex-col gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-300 ${
              isRateLimited
                ? 'bg-amber-950/40 border border-amber-500/30 text-amber-200'
                : 'bg-red-950/40 border border-red-500/30 text-red-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isRateLimited ? 'text-amber-400' : 'text-red-400'
                }`}
              />
              <div className="flex-1 leading-relaxed">
                {isRateLimited ? (
                  <>
                    <strong className="text-amber-300">Rate Limit Exceeded:</strong> {errorMessage}
                  </>
                ) : (
                  errorMessage
                )}
              </div>
            </div>

            {isRateLimited && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setAuthMode('password');
                  setIsRateLimited(false);
                  setErrorMessage(null);
                }}
                className="self-start text-xs font-semibold py-1.5 px-3 h-auto rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 pressable flex items-center gap-1.5 mt-0.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Switch to Password Sign In (Instant)</span>
              </Button>
            )}
          </div>
        )}

        {/* VIEW 1: Magic Link Sent & OTP Input */}
        {isOtpSent ? (
          <div className="w-full flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 rounded-xl bg-[#141923] border border-blue-500/20 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-1">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#e5e2e1]">Check your email</h3>
              <p className="text-xs text-[#8c909f] max-w-[300px] leading-relaxed">
                We sent a direct sign-in link and a 6-digit code to{' '}
                <span className="text-[#adc6ff] font-medium">{email}</span>.
              </p>
            </div>

            {/* OTP Code Form */}
            <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-3">
              <div className="text-left flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#c2c6d6] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>Enter 6-Digit Passcode</span>
                </label>
                <div className="relative w-full input-glass rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500/50">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder="123456"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value.replace(/\s+/g, ''))}
                    required
                    autoFocus
                    className="w-full bg-transparent border-none py-3.5 px-4 text-center tracking-[0.4em] font-mono text-lg text-[#e5e2e1] placeholder:text-[#424754] placeholder:tracking-normal focus:ring-0 focus:outline-none shadow-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || otpToken.length < 6}
                className="w-full btn-vault py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 pressable disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Enter Vault</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Resend and back options */}
            <div className="flex items-center justify-between text-xs text-[#8c909f] pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOtpSent(false);
                  setOtpToken('');
                  setErrorMessage(null);
                }}
                className="hover:text-[#c2c6d6] transition-colors underline underline-offset-4"
              >
                Use different email
              </button>

              <button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={handleSendMagicLink}
                className="hover:text-[#adc6ff] transition-colors flex items-center gap-1 disabled:opacity-40 disabled:hover:text-[#8c909f]"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}</span>
              </button>
            </div>
          </div>
        ) : authMode === 'magic-link' ? (
          /* VIEW 2: Magic Link Form */
          <form className="w-full flex flex-col gap-4" onSubmit={handleSendMagicLink}>
            <div className="relative w-full input-glass rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500/50 transition-colors">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-[#8c909f]" />
              </span>
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-none py-3.5 pl-11 pr-4 text-[#e5e2e1] placeholder:text-[#525764] focus:ring-0 focus:outline-none text-sm shadow-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="w-full btn-vault py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 pressable disabled:opacity-60 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending secure link...</span>
                </>
              ) : (
                <>
                  <span>Send Magic Link & Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          /* VIEW 3: Email + Password Form */
          <form className="w-full flex flex-col gap-3.5" onSubmit={handlePasswordSignIn}>
            <div className="relative w-full input-glass rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500/50 transition-colors">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-[#8c909f]" />
              </span>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-none py-3.5 pl-11 pr-4 text-[#e5e2e1] placeholder:text-[#525764] focus:ring-0 focus:outline-none text-sm shadow-none"
              />
            </div>

            <div className="relative w-full input-glass rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500/50 transition-colors">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-[#8c909f]" />
              </span>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Vault password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-none py-3.5 pl-11 pr-11 text-[#e5e2e1] placeholder:text-[#525764] focus:ring-0 focus:outline-none text-sm shadow-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8c909f] hover:text-[#c2c6d6] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full btn-vault py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 pressable disabled:opacity-60 shadow-[0_0_20px_rgba(59,130,246,0.3)] mt-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entering Vault...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Footer private server notice */}
        <div className="pt-2 border-t border-white/5 w-full flex flex-col items-center gap-1">
          <p className="font-[family-name:var(--font-inter)] text-xs text-[#525764] max-w-[320px] leading-relaxed">
            This is a private server. Unrecognized emails will be ignored.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
