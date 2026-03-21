import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientDetail } from '@/hooks/useClients';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

type Period = 'month' | 'quarter' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Ce mois',
  quarter: 'Ce trimestre',
  year: "Cette année",
};

function formatDA(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' DA';
}

export default function ClientDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('year');

  const { data: client, isLoading } = useClientDetail(id ?? '', period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D6FA4]" />
      </div>
    );
  }

  if (!client) {
    return (
      <EmptyState
        title="Client introuvable"
        description="Ce client n'existe pas ou a été supprimé."
        action={{ label: 'Retour aux clients', onClick: () => navigate('/clients') }}
      />
    );
  }

  const vehicleCounts = {
    total: client.vehicles.length,
    actifs: client.vehicles.filter((v) => v.statut !== 'HORS_SERVICE').length,
    inactifs: client.vehicles.filter((v) => v.statut === 'HORS_SERVICE').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="text-[#64748B] hover:text-[#1A2332] transition-colors"
        >
          ← Retour
        </button>
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: client.couleur }}
        />
        <h1 className="text-xl font-bold text-[#1A2332]">{client.nom}</h1>
      </div>

      {/* Coordonnées */}
      <div className="bg-white rounded-lg border border-[#E2E6ED] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-3">
          Coordonnées
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#64748B]">Secteur :</span>{' '}
            <span className="text-[#1A2332] font-medium">{client.secteur}</span>
          </div>
          <div>
            <span className="text-[#64748B]">Contact :</span>{' '}
            <span className="text-[#1A2332] font-medium">{client.contactNom}</span>
          </div>
          <div>
            <span className="text-[#64748B]">Email :</span>{' '}
            <span className="text-[#1A2332]">{client.contactEmail}</span>
          </div>
          <div>
            <span className="text-[#64748B]">Tél :</span>{' '}
            <span className="text-[#1A2332] font-['IBM_Plex_Mono']">{client.contactTel}</span>
          </div>
          {client.adresse && (
            <div className="md:col-span-2">
              <span className="text-[#64748B]">Adresse :</span>{' '}
              <span className="text-[#1A2332]">{client.adresse}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPIs véhicules */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#E2E6ED] p-4 text-center">
          <p className="text-2xl font-bold text-[#1A2332]">{vehicleCounts.total}</p>
          <p className="text-xs text-[#64748B]">Total véhicules</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E2E6ED] p-4 text-center">
          <p className="text-2xl font-bold text-[#0E7C59]">{vehicleCounts.actifs}</p>
          <p className="text-xs text-[#64748B]">Actifs</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E2E6ED] p-4 text-center">
          <p className="text-2xl font-bold text-[#C0392B]">{vehicleCounts.inactifs}</p>
          <p className="text-xs text-[#64748B]">Hors service</p>
        </div>
      </div>

      {/* Véhicules */}
      <div className="bg-white rounded-lg border border-[#E2E6ED] mb-6">
        <div className="px-5 py-4 border-b border-[#E2E6ED]">
          <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider">
            Véhicules ({client.vehicles.length})
          </h2>
        </div>
        {client.vehicles.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Aucun véhicule affecté</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] text-[#64748B]">
                  <th className="text-left px-4 py-2.5 font-medium">Immatriculation</th>
                  <th className="text-left px-4 py-2.5 font-medium">Marque / Modèle</th>
                  <th className="text-left px-4 py-2.5 font-medium">Année</th>
                  <th className="text-left px-4 py-2.5 font-medium">Km</th>
                  <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {client.vehicles.map((v) => (
                  <tr key={v.id} className="border-t border-[#E2E6ED] hover:bg-[#F4F6F9]">
                    <td className="px-4 py-2.5">
                      <span className="font-['IBM_Plex_Mono'] bg-[#F0F2F5] px-2 py-0.5 rounded text-xs">
                        {v.immatriculation}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {v.marque} {v.modele}
                    </td>
                    <td className="px-4 py-2.5">{v.annee}</td>
                    <td className="px-4 py-2.5 font-['IBM_Plex_Mono']">
                      {v.km.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={v.statut} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Locations en cours */}
      <div className="bg-white rounded-lg border border-[#E2E6ED] mb-6">
        <div className="px-5 py-4 border-b border-[#E2E6ED]">
          <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider">
            Locations en cours ({client.activeRentals.length})
          </h2>
        </div>
        {client.activeRentals.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Aucune location active</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] text-[#64748B]">
                  <th className="text-left px-4 py-2.5 font-medium">Véhicule</th>
                  <th className="text-left px-4 py-2.5 font-medium">Début</th>
                  <th className="text-left px-4 py-2.5 font-medium">Fin prévue</th>
                  <th className="text-left px-4 py-2.5 font-medium">Montant</th>
                  <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {client.activeRentals.map((r) => (
                  <tr key={r.id} className="border-t border-[#E2E6ED] hover:bg-[#F4F6F9]">
                    <td className="px-4 py-2.5">
                      <span className="font-['IBM_Plex_Mono'] bg-[#F0F2F5] px-2 py-0.5 rounded text-xs">
                        {r.vehicle.immatriculation}
                      </span>
                      <span className="ml-2 text-[#64748B]">
                        {r.vehicle.marque} {r.vehicle.modele}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {new Date(r.dateDebut).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5">
                      {new Date(r.dateFinPrevue).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5 font-['IBM_Plex_Mono']">
                      {r.montantMensuel ? formatDA(r.montantMensuel) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.statut} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coûts maintenance */}
      <div className="bg-white rounded-lg border border-[#E2E6ED]">
        <div className="px-5 py-4 border-b border-[#E2E6ED] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider">
            Coûts maintenance
          </h2>
          <div className="flex gap-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  period === p
                    ? 'bg-[#1D6FA4] text-white'
                    : 'text-[#64748B] hover:bg-[#F4F6F9]'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#1A2332]">
              {client.maintenanceCosts.count}
            </p>
            <p className="text-xs text-[#64748B]">Interventions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#B45309] font-['IBM_Plex_Mono']">
              {formatDA(client.maintenanceCosts.totalEstime)}
            </p>
            <p className="text-xs text-[#64748B]">Coût estimé</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#0E7C59] font-['IBM_Plex_Mono']">
              {formatDA(client.maintenanceCosts.totalReel)}
            </p>
            <p className="text-xs text-[#64748B]">Coût réel</p>
          </div>
        </div>
      </div>
    </div>
  );
}
