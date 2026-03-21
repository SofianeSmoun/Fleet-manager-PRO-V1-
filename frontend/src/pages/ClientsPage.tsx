import { useNavigate } from 'react-router-dom';
import { useClients } from '@/hooks/useClients';
import EmptyState from '@/components/EmptyState';
import type { Client } from '@/types/client';

function ClientCard({ client }: { client: Client }): JSX.Element {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-lg border border-[#E2E6ED] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      style={{ borderLeftWidth: 4, borderLeftColor: client.couleur }}
      onClick={() => navigate(`/clients/${client.id}`)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-[#1A2332]">{client.nom}</h3>
            <p className="text-sm text-[#64748B]">{client.secteur}</p>
          </div>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: client.couleur }}
          />
        </div>

        <div className="border-t border-[#E2E6ED] pt-3 mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#64748B]">Contact :</span>
            <span className="text-[#1A2332] font-medium">{client.contactNom}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#64748B]">Email :</span>
            <span className="text-[#1A2332]">{client.contactEmail}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#64748B]">Tél :</span>
            <span className="text-[#1A2332] font-['IBM_Plex_Mono']">{client.contactTel}</span>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium text-[#1D6FA4] hover:bg-[#EBF5FB] rounded-md transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/clients/${client.id}`);
            }}
          >
            Détails
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage(): JSX.Element {
  const { data: result, isLoading } = useClients();
  const clients = result?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D6FA4]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A2332]">Clients</h1>
        <p className="text-sm text-[#64748B]">
          {clients.length} client{clients.length !== 1 ? 's' : ''} actif{clients.length !== 1 ? 's' : ''}
        </p>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Aucun client"
          description="Aucun client enregistré pour le moment."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
