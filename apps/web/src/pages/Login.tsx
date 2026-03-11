import { useState, useEffect, useRef } from 'react';
import { signIn, signUp } from '../lib/auth-client';
import { sendOtp, verifyOtp, resetPassword } from '../services/auth.service';
import DotGrid from './DotGrid';

type Mode = 'login' | 'register' | 'forgot-email' | 'forgot-otp' | 'forgot-reset';

const RESEND_COOLDOWN = 30;

const Login = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [resendCooldown, setResendCooldown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsLoading(false);
    setIsGoogleLoading(false);
  }, [mode]);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
    countdownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const resetForgotState = () => {
    setForgotEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setResendCooldown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      localStorage.removeItem('app_version'); 
      
      if (mode === 'login') {
        const res = await signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      } else {
        if (password !== confirmPassword) {
            setError('Password tidak cocok.');
            setIsLoading(false);
            return;
        }
        const res = await signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message);
      }

      window.location.href = '/dashboard';

    } catch (err) {
      console.error("Login Error:", err);
      setError((err as Error).message ?? 'Terjadi kesalahan. Coba lagi.');
      setIsLoading(false);
    }
  };
  
  const handleGoogle = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/dashboard`,
      } as Parameters<typeof signIn.social>[0]);

      if (result && 'data' in result && result.data && 'url' in result.data) {
        window.location.href = (result.data as { url: string }).url;
        return;
      }
      if (result?.error) {
        const msg = result.error.message ?? '';
        setError(
          msg.includes('provider')
            ? 'Google login tidak dikonfigurasi di server. Hubungi admin.'
            : msg || 'Google login gagal. Coba lagi.'
        );
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setError((err as Error).message ?? 'Google login gagal.');
      setIsGoogleLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await sendOtp(forgotEmail);
      setSuccess('Kode OTP telah dikirim ke email kamu.');
      setMode('forgot-otp');
      startCooldown();
    } catch (err) {
      setError((err as Error).message ?? 'Gagal mengirim OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await sendOtp(forgotEmail);
      setSuccess('Kode OTP baru telah dikirim.');
      startCooldown();
    } catch (err) {
      setError((err as Error).message ?? 'Gagal mengirim ulang OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await verifyOtp(forgotEmail, otpCode);
      setMode('forgot-reset');
      setError(null);
      setSuccess(null);
    } catch (err) {
      setError((err as Error).message ?? 'Kode OTP salah atau sudah kadaluarsa.');
    } finally {
      setIsLoading(false);
    }
  };

const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) return setError('Password minimal 8 karakter.');
    if (newPassword !== confirmPassword) return setError('Password tidak cocok.');

    setIsLoading(true);
    try {
      await resetPassword(forgotEmail, otpCode, newPassword);
      
      setSuccess('Password berhasil direset! Membersihkan sesi...');
      
      resetForgotState();

      setTimeout(() => {
        window.location.href = '/login'; 
      }, 1500);

    } catch (err) {
      setError((err as Error).message ?? 'Gagal mereset password.');
      setIsLoading(false);
    }
  };

  const titles: Record<Mode, { title: string; subtitle: string }> = {
    login: { title: 'Selamat Datang di MoneyMind', subtitle: 'Silakan masuk untuk mengelola keuangan Anda' },
    register: { title: 'Buat Akun Baru', subtitle: 'Daftar untuk mulai mencatat keuangan' },
    'forgot-email': { title: 'Lupa Password', subtitle: 'Masukkan email kamu untuk menerima kode OTP' },
    'forgot-otp': { title: 'Verifikasi OTP', subtitle: `Masukkan kode 6 digit yang dikirim ke ${forgotEmail}` },
    'forgot-reset': { title: 'Buat Password Baru', subtitle: 'Pastikan password minimal 8 karakter' },
  };

  const inputClass =
    'w-full bg-slate-100/10 dark:bg-slate-900/40 border border-slate-300/20 dark:border-slate-700/50 rounded-lg h-12 px-4 text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none';

  return (
    // Pembungkus Utama diubah menjadi min-h-screen tanpa padding yang mengganggu layar full
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#0A0514]">
      
      {/* ── LAYER BACKGROUND DOT GRID (FIXED SCREEN) ── */}
      <div className="fixed inset-0 w-screen h-screen z-0 pointer-events-auto">
        <DotGrid
          dotSize={3}          // Ukuran dot diperkecil agar terlihat lebih rapi
          gap={20}             // Jarak dot disesuaikan
          baseColor="#271E37"  // Warna dasar titik
          activeColor="#22C55E" // Warna saat disentuh (hijau emerald menyesuaikan tema MoneyMind)
          proximity={150}
          shockRadius={200}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      <div className="w-full max-w-[480px] flex flex-col items-center gap-8 z-10 p-4">
        {/* App Logo */}
        <div className="flex items-center gap-3">
            <div className="size-14 flex shrink-0 items-center justify-center overflow-hidden rounded-xl">
              <img src="/logo.png" alt="MoneyMind Logo" className="w-full h-full object-contain scale-150" />
            </div>
          <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">MoneyMind</h1>
        </div>

      {/* Card */}
      <div className="glass-card w-full rounded-xl p-8 md:p-10">
        {(mode === 'forgot-email' || mode === 'forgot-otp' || mode === 'forgot-reset') && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {['forgot-email', 'forgot-otp', 'forgot-reset'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  mode === step
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : ['forgot-email', 'forgot-otp', 'forgot-reset'].indexOf(mode) > i
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {['forgot-email', 'forgot-otp', 'forgot-reset'].indexOf(mode) > i
                    ? <span className="material-symbols-outlined text-[14px]">check</span>
                    : i + 1}
                </div>
                {i < 2 && <div className={`w-10 h-0.5 transition-all ${
                  ['forgot-email', 'forgot-otp', 'forgot-reset'].indexOf(mode) > i
                    ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                }`} />}
              </div>
            ))}
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-2">
            {titles[mode].title}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{titles[mode].subtitle}</p>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm text-center flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm text-center flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {success}
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Nama Lengkap</label>
                <input className={inputClass} placeholder="John Doe" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Email</label>
              <input className={inputClass} placeholder="nama@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    onClick={() => { resetForgotState(); setForgotEmail(email); setMode('forgot-email'); }}
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" type="button" onClick={() => setShowPassword(!showPassword)}>
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Konfirmasi Password</label>
                <div className="relative">
                  <input
                    className={`${inputClass} pr-12`}
                    placeholder="••••••••"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-rose-500 ml-1">Password tidak cocok</p>
                )}
              </div>
            )}

            <button
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-[12px] shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading}
            >
              {isLoading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              {mode === 'login' ? 'Masuk Sekarang' : 'Daftar Sekarang'}
            </button>
          </form>
        )}

        {/* ── Forgot: Step 1 — Email ────────────────────────────────────────────── */}
        {mode === 'forgot-email' && (
          <form className="space-y-5" onSubmit={handleSendOtp}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Email Terdaftar</label>
              <input
                className={inputClass}
                placeholder="nama@email.com"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-[12px] shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading}
            >
              {isLoading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              <span className="material-symbols-outlined text-base">send</span>
              Kirim Kode OTP
            </button>
            <button type="button" className="w-full text-sm text-slate-500 hover:text-primary transition-colors" onClick={() => { resetForgotState(); setMode('login'); }}>
              ← Kembali ke Login
            </button>
          </form>
        )}

        {/* ── Forgot: Step 2 — OTP Verification ───────────────────────────────── */}
        {mode === 'forgot-otp' && (
          <form className="space-y-5" onSubmit={handleVerifyOtp}>
            {/* OTP visual email badge */}
            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
              <span className="material-symbols-outlined text-primary text-base">mail</span>
              <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{forgotEmail}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Kode OTP (6 digit)</label>
              <input
                className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em] font-mono`}
                placeholder="000000"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-400 ml-1">Kode berlaku selama 10 menit</p>
            </div>

            <button
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-[12px] shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading || otpCode.length < 6}
            >
              {isLoading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              <span className="material-symbols-outlined text-base">verified</span>
              Verifikasi OTP
            </button>

            {/* Resend OTP */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className={`flex items-center gap-1.5 text-sm font-semibold transition-all ${
                  resendCooldown > 0
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-primary hover:text-primary/80'
                }`}
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                {resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : 'Kirim Ulang OTP'}
              </button>
            </div>

            <button type="button" className="w-full text-sm text-slate-500 hover:text-primary transition-colors" onClick={() => { setMode('forgot-email'); setError(null); setSuccess(null); }}>
              ← Ubah Email
            </button>
          </form>
        )}

        {/* ── Forgot: Step 3 — New Password ───────────────────────────────────── */}
        {mode === 'forgot-reset' && (
          <form className="space-y-5" onSubmit={handleResetPassword}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Password Baru</label>
              <div className="relative">
                <input
                  className={`${inputClass} pr-12`}
                  placeholder="Minimal 8 karakter"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowNewPassword(!showNewPassword)}>
                  <span className="material-symbols-outlined text-[20px]">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Konfirmasi Password</label>
            <div className="relative group">
  <input
    className={`${inputClass} pr-12`} // pastikan ada padding kanan (pr-12)
    placeholder="••••••••"
    type={showConfirmPassword ? 'text' : 'password'}
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    required
  />
  <button 
    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors z-10" 
    type="button" 
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
  >
    <span className="material-symbols-outlined text-[20px] select-none">
      {showConfirmPassword ? 'visibility_off' : 'visibility'}
    </span>
  </button>
</div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-rose-500 ml-1">Password tidak cocok</p>
              )}
            </div>

            {/* Password strength indicator */}
            {newPassword.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => {
                    const strength = newPassword.length >= 12 ? 4 : newPassword.length >= 10 ? 3 : newPassword.length >= 8 ? 2 : 1;
                    return (
                      <div key={level} className={`flex-1 h-1 rounded-full transition-all ${
                        level <= strength
                          ? strength >= 4 ? 'bg-emerald-500' : strength >= 3 ? 'bg-blue-500' : strength >= 2 ? 'bg-amber-500' : 'bg-rose-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 ml-0.5">
                  Kekuatan: {newPassword.length < 8 ? 'Terlalu pendek' : newPassword.length < 10 ? 'Lemah' : newPassword.length < 12 ? 'Sedang' : 'Kuat'}
                </p>
              </div>
            )}

            <button
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-[12px] shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 8}
            >
              {isLoading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              <span className="material-symbols-outlined text-base">lock_reset</span>
              Simpan Password Baru
            </button>
          </form>
        )}

        {/* ── Divider + Google (only on login/register) ────────────────────────── */}
        {(mode === 'login' || mode === 'register') && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-transparent px-2 text-slate-400">Atau masuk dengan</span>
              </div>
            </div>

            <button
              onClick={handleGoogle}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-lg border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-slate-700 dark:text-slate-200 text-sm font-medium disabled:opacity-60 disabled:cursor-wait"
            >
              {isGoogleLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent" />
                  Mengarahkan...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M5.2662 9.76452C6.19903 6.93863 8.85469 4.90909 12 4.90909C13.6909 4.90909 15.2182 5.50909 16.4182 6.49091L19.9091 3C17.7818 1.14545 15.0545 0 12 0C7.27273 0 3.19091 2.69091 1.09091 6.65455L5.2662 9.76452Z" fill="#EA4335"></path>
                    <path d="M1.09091 6.65455L5.2662 9.76452C4.35753 12.5182 4.35753 15.4818 5.2662 18.2355L1.09091 21.3455C-0.363636 18.5455 -0.363636 15.2364 1.09091 12.4364V6.65455Z" fill="#FBBC04"></path>
                    <path d="M12 24C15.1091 24 17.8909 22.9636 20.0182 21.2182L15.8909 17.8364C14.7818 18.6 13.4727 19.0909 12 19.0909C8.85469 19.0909 6.19903 17.0614 5.2662 14.2355L1.09091 17.3455C3.19091 21.3091 7.27273 24 12 24Z" fill="#4285F4"></path>
                    <path d="M24 12.4364C24 11.5636 23.9455 10.6909 23.7818 9.81818H12V14.4545H18.7636C18.4909 15.9818 17.6182 17.3455 16.3636 18.1636L20.0182 21.2182C22.1455 19.2545 24 16.2 24 12.4364Z" fill="#34A853"></path>
                  </svg>
                  Masuk dengan Google
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Footer: toggle login/register — hide during forgot password flow */}
      {(mode === 'login' || mode === 'register') && (
        <p className="text-slate-500 text-sm">
          {mode === 'login' ? (
            <>Belum punya akun?{' '}
              <button className="text-primary font-semibold hover:underline" onClick={() => { setMode('register'); setError(null); }}>
                Daftar sekarang
              </button>
            </>
          ) : (
            <>Sudah punya akun?{' '}
              <button className="text-primary font-semibold hover:underline" onClick={() => { setMode('login'); setError(null); }}>
                Masuk
              </button>
            </>
          )}
        </p>
      )}
      </div>
    </div>
  );
};

export default Login;