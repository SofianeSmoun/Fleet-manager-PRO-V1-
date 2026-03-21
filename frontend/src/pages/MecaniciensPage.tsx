import { useState } from 'react';
import { useMechanics } from '@/hooks/useGarages';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import type { GarageFilters, MechanicWithWorkload } from '@/types/garage';
import type { GarageStatus, Specialty } from '@/types';

const SPECIALITE_LABELS: Record<string, string> = {
  MECANIQUE_GENERALE: 'Mécanique générale',
  ELECTRICITE_AUTO: 'Électricité auto',
  CARROSSERIE: 'Carrosserie',
  PNEUMATIQUES_FREINS: 'Pneumatiques & Freins',
  MOTEUR_TRANSMISSION: 'Moteur & Transmission',
};

function getInitials(nom: string): string {
  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function MechanicCard({ mechanic }: { mechanic: MechanicWithWorkload }): JSX.Element {
  return (
    <div className="bg-white rounded-lg border border-[#E2E6ED] p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#0D1B2A] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {getInitials(mechanic.nom)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#1A2332] truncate">{mechanic.nom}</h3>
          <p className="text-xs text-[#64748B]">
            {mechanic.specialite
              ? SPECIALITE_LABELS[mechanic.specialite] ?? mechanic.specialite
              : 'Généraliste'}
          </p>
        </div>
        <StatusBadge status={mechanic.statut} />
      </div>

      {/* Compteur interventions */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EBF5FB] text-[#1D6FA4] text-xs font-bold">
          {mechanic.activeMaintenances}
        </span>
        <span className="text-xs text-[#64748B]">
          intervention{mechanic.activeMaintenances !== 1 ? 's' : ''} active{mechanic.activeMaintenances !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Téléphone */}
      <div className="text-sm mb-3">
        <span className="text-[#64748B]">Tél : </span>
        <span className="font-['IBM_Plex_Mono'] text-[#1A2332]">{mechanic.telephone}</span>
      </div>

      {/* Interventions actives */}
      {mechanic.maintenances.length > 0 && (
        <div className="border-t border-[#E2E6ED] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            Interventions actives
          </p>
          <ul className="space-y-1.5">
            {mechanic.maintenances.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-xs">
                <span className="font-['IBM_Plex_Mono'] bg-[#F0F2F5] px-1.5 py-0.5 rounded text-[11px]">
                  {m.vehicle.immatriculation}
                </span>
                <span className="text-[#64748B] truncate flex-1">{m.nature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function MecaniciensPage(): JSX.Element {
  const [filters, setFilters] = useState<GarageFilters>({
    page: 1,
    limit: 30,
    sortBy: 'nom',
    order: 'asc',
  });

  const { data: result, isLoading } = useMechanics(filters);
  const mechanics = result?.data ?? [];

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
        <h1 className="text-xl font-bold text-[#1A2332]">Mécaniciens</h1>
        <p className="text-sm text-[#64748B]">
          {result?.total ?? 0} prestataire(s) — charge de travail en temps réel
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filters.statut ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, statut: (e.target.value || undefined) as GarageStatus | undefined, page: 1 })
          }
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
        >
          <option value="">Tous les statuts</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="OCCUPE">Occupé</option>
          <option value="INDISPONIBLE">Indisponible</option>
        </select>
        <select
          value={filters.specialite ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, specialite: (e.target.value || undefined) as Specialty | undefined, page: 1 })
          }
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
        >
          <option value="">Toutes spécialités</option>
          {Object.entries(SPECIALITE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {mechanics.length === 0 ? (
        <EmptyState
          title="Aucun mécanicien"
          description="Aucun prestataire enregistré pour le moment."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mechanics.map((m) => (
            <MechanicCard key={m.id} mechanic={m} />
          ))}
        </div>
      )}
    </div>
  );
}
