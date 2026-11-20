import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, FileText, Lock, ShieldAlert, User, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import type { AuthSession } from '../types/invoice';
import { loginSchema } from '../utils/validation';

interface LoginPageProps {
  onAuthenticated: (session: AuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthenticated }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [hasExistingAccount, setHasExistingAccount] = useState<boolean | null>(null);
  const [existingUsers, setExistingUsers] = useState<Array<{ username: string; displayName: string }>>([]);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const hasAny = await authService.hasAnyLocalAccount();
      const users = await authService.listLocalUsernames();
      if (!active) return;
      setHasExistingAccount(hasAny);
      setExistingUsers(users);
      if (!hasAny) {
        setMode('register');
      } else if (users.length === 1) {
        setUsername(users[0].username);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({
      username,
      password,
      displayName: mode === 'register' ? displayName : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ');
      return;
    }

    setSubmitting(true);
    try {
      const session =
        mode === 'register'
          ? await authService.registerLocalAccount(
              parsed.data.username,
              parsed.data.password,
              parsed.data.displayName
            )
          : await authService.signIn(parsed.data.username, parsed.data.password);
      onAuthenticated(session);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ເກີດຂໍ້ຜິດພາດໃນການເຂົ້າລະບົບ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-[20px] bg-white p-6 sm:p-8 shadow-sm border border-[#17241C]/8">
        {/* Emerald App Brand Icon matching Screen 1 mockup */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[22px] bg-[#008C35] text-white shadow-md shadow-[#008C35]/20">
            <FileText className="h-10 w-10" />
            <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#008C35] ring-3 ring-white">
              <CheckCircle2 className="h-4.5 w-4.5 text-white" />
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#17241C]">Invoice PWA</h1>
          <p className="mt-1 text-sm font-medium text-[#17241C]/65">ໃບຮັບເງິນ / FACTURE</p>
        </div>

        {/* Mode Switch when local account exists */}
        {hasExistingAccount && (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-[#F7FAF8] p-1 border border-[#17241C]/8">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-white text-[#008C35] shadow-xs'
                  : 'text-[#17241C]/65 hover:text-[#17241C]'
              }`}
            >
              ເຂົ້າລະບົບ (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition ${
                mode === 'register'
                  ? 'bg-white text-[#008C35] shadow-xs'
                  : 'text-[#17241C]/65 hover:text-[#17241C]'
              }`}
            >
              ສ້າງບັນຊີໃໝ່ (New)
            </button>
          </div>
        )}

        {hasExistingAccount === false && (
          <div className="mt-5 rounded-xl bg-[#EAF8EE] p-3.5 text-xs leading-relaxed text-[#17241C]">
            <p className="font-semibold text-[#008C35]">ຕັ້ງຄ່າຜູ້ໃຊ້ງານເທື່ອທຳອິດ (First-Time Setup)</p>
            <p className="mt-1 text-[#17241C]/75">
              ກະລຸນາສ້າງຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານສຳລັບອຸປະກອນນີ້ (ບໍ່ມີລະຫັດຜ່ານຄົງທີ່).
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {mode === 'login' && existingUsers.length > 1 && (
            <div>
              <label htmlFor="quick-user" className="block text-xs font-medium text-[#17241C]/70 mb-1.5">
                ເລືອກຜູ້ໃຊ້ໃນເຄື່ອງ
              </label>
              <select
                id="quick-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 text-sm text-[#17241C] focus:border-[#008C35] focus:bg-white focus:outline-none"
              >
                <option value="">-- ເລືອກ --</option>
                {existingUsers.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.displayName} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="login-username" className="block text-xs font-medium text-[#17241C]/75 mb-1.5">
              ຊື່ຜູ້ໃຊ້ (Username)
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#17241C]/45" />
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ຊື່ຜູ້ໃຊ້ (Username)"
                className="min-h-[48px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] pl-10 pr-4 text-sm text-[#17241C] placeholder:text-[#17241C]/40 focus:border-[#008C35] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008C35]/15"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="login-displayname" className="block text-xs font-medium text-[#17241C]/75 mb-1.5">
                ຊື່ສະແດງ (Display Name — ທາງເລືອກ)
              </label>
              <div className="relative">
                <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#17241C]/45" />
                <input
                  id="login-displayname"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ຕົວຢ່າງ: ນາງ ແກ້ວ / Ken"
                  className="min-h-[48px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] pl-10 pr-4 text-sm text-[#17241C] placeholder:text-[#17241C]/40 focus:border-[#008C35] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008C35]/15"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-[#17241C]/75 mb-1.5">
              ລະຫັດຜ່ານ (Password)
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#17241C]/45" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ລະຫັດຜ່ານ (Password)"
                className="min-h-[48px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] pl-10 pr-12 text-sm text-[#17241C] placeholder:text-[#17241C]/40 focus:border-[#008C35] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008C35]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1.5 top-1/2 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center rounded-lg text-[#17241C]/55 hover:bg-[#17241C]/5 hover:text-[#17241C]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-[48px] w-full rounded-xl bg-[#008C35] py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#00732B] active:scale-[0.99] disabled:opacity-60"
          >
            {submitting
              ? 'ກຳລັງດຳເນີນການ...'
              : mode === 'register'
              ? 'ສ້າງບັນຊີ ແລະ ເຂົ້າລະບົບ'
              : 'ເຂົ້າລະບົບ'}
          </button>
        </form>

        {/* Honest Local-Only Security Notice & Supabase Auth Readiness */}
        <div className="mt-6 rounded-xl border border-[#17241C]/10 bg-[#F7FAF8] p-3.5 text-[11px] leading-relaxed text-[#17241C]/70">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#008C35] mt-0.5" />
            <div>
              <p className="font-semibold text-[#17241C]">
                ໂໝດເກັບຂໍ້ມູນໃນເຄື່ອງດຽວ (Local-Only MVP)
              </p>
              <p className="mt-0.5">
                ຂໍ້ມູນບິນ ແລະ ການເຂົ້າລະບົບນີ້ໃຊ້ງານແບບ Offline ຢູ່ໃນອຸປະກອນນີ້ເທົ່ານັ້ນ (ບໍ່ແມ່ນລະບົບຄວາມປອດໄພຫຼາຍຜູ້ໃຊ້ຜ່ານເຊີບເວີ).
                ໂຄງສ້າງ Auth ຖືກກຽມໄວ້ໃຫ້ເຊື່ອມຕໍ່ Supabase Auth ໃນອະນາຄົດແລ້ວ.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
