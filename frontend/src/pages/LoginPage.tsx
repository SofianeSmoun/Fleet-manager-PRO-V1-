import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { api } from '../lib/axios';

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

// ─── Token store (in-memory) ──────────────────────────────────────────────────

let _accessToken: string | null = null;
export function getAccessToken(): string | null { return _accessToken; }
export function setAccessToken(t: string | null): void { _accessToken = t; }

// ─── Demo accounts ────────────────────────────────────────────────────────────

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@fleetmanager.dz', password: 'Admin2026!', variant: 'navy' },
  { label: 'Gestionnaire', email: 'gestionnaire@fleetmanager.dz', password: 'Gest2026!', variant: 'gray' },
  { label: 'Commercial', email: 'commercial@fleetmanager.dz', password: 'Comm2026!', variant: 'gray' },
  { label: 'Lecteur', email: 'lecteur@fleetmanager.dz', password: 'Read2026!', variant: 'gray' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function doLogin(email: string, password: string): Promise<void> {
    setLoading(true);
    setServerError(null);
    try {
      const res = await api.post<{ access_token: string }>('/auth/login', { email, password });
      setAccessToken(res.data.access_token);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setServerError(err.response.data.message as string);
      } else {
        setServerError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(email: string, password: string): void {
    setValue('email', email);
    setValue('password', password);
    void doLogin(email, password);
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0D1B2A]">
      {/* Grille géométrique subtile */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(29,111,164,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(29,111,164,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Carte login */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#0D1B2A] mb-4">
              <span className="text-2xl">🚗</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1A2332] font-['IBM_Plex_Sans']">
              FleetManager Pro
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Gestion de flotte utilitaire
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit((d) => void doLogin(d.email, d.password))} noValidate>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#1A2332] mb-1">
                  Adresse email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-sm text-[#1A2332] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1D6FA4] focus:border-transparent transition"
                  placeholder="vous@example.com"
                />
                {errors.email && (
                  <p className="text-[#C0392B] text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[#1A2332] mb-1">
                  Mot de passe
                </label>
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-sm text-[#1A2332] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1D6FA4] focus:border-transparent transition"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-[#C0392B] text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Erreur serveur */}
              {serverError && (
                <div className="bg-[#FDECEA] border border-[#C0392B] rounded-lg px-3 py-2">
                  <p className="text-[#C0392B] text-sm">{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#1D6FA4] hover:bg-[#155d8a] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition"
              >
                {loading ? 'Connexion en cours…' : 'Se connecter'}
              </button>
            </div>
          </form>

          {/* Séparateur démo */}
          <div className="flex items-center my-6">
            <hr className="flex-1 border-[#E2E6ED]" />
            <span className="px-3 text-xs text-[#64748B]">— Connexion rapide (démo) —</span>
            <hr className="flex-1 border-[#E2E6ED]" />
          </div>

          {/* Quick-login buttons */}
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={loading}
                onClick={() => quickLogin(account.email, account.password)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition disabled:opacity-60 ${
                  account.variant === 'navy'
                    ? 'bg-[#0D1B2A] text-white hover:bg-[#1a2f45]'
                    : 'bg-[#F0F2F5] text-[#1A2332] hover:bg-[#E2E6ED]'
                }`}
              >
                <span className="font-['IBM_Plex_Mono'] text-xs block text-left opacity-70 mb-0.5">
                  {account.email.split('@')[0]}
                </span>
                <span>{account.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
