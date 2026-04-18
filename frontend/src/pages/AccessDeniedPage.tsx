import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function AccessDeniedPage(): JSX.Element {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <span className="text-6xl mb-6">🔒</span>
      <h1 className="text-2xl font-bold text-[#1A2332] mb-2">
        Accès refusé
      </h1>
      <p className="text-[#64748B] mb-1">
        Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
      </p>
      <p className="text-sm text-[#64748B] mb-6">
        Rôle actuel : <span className="font-['IBM_Plex_Mono'] font-medium text-[#1A2332]">{role ?? 'inconnu'}</span>
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-4 py-2 bg-[#1D6FA4] hover:bg-[#155d8a] text-white text-sm font-medium rounded-lg transition"
      >
        Retour au Dashboard
      </button>
    </div>
  );
}
