import { useNavigate } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  sprint: string;
}

export default function PlaceholderPage({ title, sprint }: PlaceholderPageProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <span className="text-6xl mb-6">🚧</span>
      <h1 className="text-2xl font-bold text-[#1A2332] mb-2">
        Module {title}
      </h1>
      <p className="text-[#64748B] mb-6">
        Disponible en {sprint}
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
