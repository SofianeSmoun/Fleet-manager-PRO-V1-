import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useSoftDeleteVehicle } from '@/hooks/useVehicles';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import VehicleFormModal from '@/components/VehicleFormModal';
import { getAccessToken } from '@/lib/auth-token';
import { api } from '@/lib/axios';
import type { VehicleFilters, Vehicle } from '@/types/vehicle';
import type { VehicleStatus } from '@/types';

// Decode JWT to get role (no external dep needed)
function getUserRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function formatKm(km: number): string {
  return km.toLocaleString('fr-FR');
}

export default function FlottePage(): JSX.Element {
  const navigate = useNavigate();
  const role = getUserRole();
  const canWrite = role === 'ADMIN' || role === 'GESTIONNAIRE';
  const canDelete = role === 'ADMIN';

  const [filters, setFilters] = useState<VehicleFilters>({ page: 1, limit: 15, sortBy: 'createdAt', order: 'desc' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: result, isLoading } = useVehicles(filters);
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useSoftDeleteVehicle();

  const vehicles = useMemo(() => result?.data ?? [], [result?.data]);
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;
  const page = result?.page ?? 1;

  // KPI counts from current data set info — derived from total filtered
  const kpis = useMemo(() => {
    const counts = { DISPONIBLE: 0, LOUE: 0, MAINTENANCE: 0 };
    for (const v of vehicles) {
      if (v.statut in counts) counts[v.statut as keyof typeof counts]++;
    }
    return counts;
  }, [vehicles]);

  const handleSort = useCallback(
    (col: string) => {
      setFilters((f) => ({
        ...f,
        sortBy: col,
        order: f.sortBy === col && f.order === 'asc' ? 'desc' : 'asc',
        page: 1,
      }));
    },
    [],
  );

  const sortIndicator = (col: string): string => {
    if (filters.sortBy !== col) return '';
    return filters.order === 'asc' ? ' \u2191' : ' \u2193';
  };

  const handleFormSubmit = (data: Record<string, unknown>): void => {
    if (editVehicle) {
      updateMutation.mutate(
        { id: editVehicle.id, ...data },
        {
          onSuccess: () => {
            setModalOpen(false);
            setEditVehicle(undefined);
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setModalOpen(false);
        },
      });
    }
  };

  const handleDelete = (id: string): void => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  const handleExportExcel = useCallback(async (): Promise<void> => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.statut) params.set('statut', filters.statut);
      if (filters.marque) params.set('marque', filters.marque);
      if (filters.q) params.set('q', filters.q);
      if (filters.clientId) params.set('clientId', filters.clientId);
      const response = await api.get(`/vehicles/export/excel?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disposition = response.headers['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename=(.+)/);
      a.href = url;
      a.download = match?.[1] ?? 'flotte-export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Toast error handled by axios interceptor
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const startIdx = (page - 1) * (filters.limit ?? 15) + 1;
  const endIdx = Math.min(page * (filters.limit ?? 15), total);

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1A2332]">Flotte</h1>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={total === 0 || exporting}
            onClick={() => { void handleExportExcel(); }}
            className="px-4 py-2 border border-[#1D6FA4] text-[#1D6FA4] text-sm font-medium rounded-md hover:bg-[#EBF5FB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Export...' : 'Exporter Excel'}
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={() => {
                setEditVehicle(undefined);
                setModalOpen(true);
              }}
              className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] transition-colors"
            >
              + Véhicule
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-[#E2E6ED]">
          <p className="text-sm text-[#64748B]">Disponibles</p>
          <p className="text-2xl font-bold text-[#0E7C59]">{kpis.DISPONIBLE}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#E2E6ED]">
          <p className="text-sm text-[#64748B]">Loués</p>
          <p className="text-2xl font-bold text-[#1D6FA4]">{kpis.LOUE}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#E2E6ED]">
          <p className="text-sm text-[#64748B]">En maintenance</p>
          <p className="text-2xl font-bold text-[#B45309]">{kpis.MAINTENANCE}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white"
          value={filters.statut ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, statut: (e.target.value || undefined) as VehicleStatus | undefined, page: 1 }))}
        >
          <option value="">Tous les statuts</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="LOUE">Loué</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="HORS_SERVICE">Hors service</option>
        </select>

        <select
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white"
          value={filters.marque ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, marque: e.target.value || undefined, page: 1 }))}
        >
          <option value="">Toutes les marques</option>
          <option value="Fiat">Fiat</option>
          <option value="Volkswagen">Volkswagen</option>
          <option value="Renault">Renault</option>
        </select>

        <input
          type="text"
          placeholder="Rechercher..."
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white min-w-[200px]"
          value={filters.q ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E2E6ED] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Chargement...</div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            title="Aucun véhicule"
            description="Aucun véhicule ne correspond aux filtres sélectionnés."
            action={canWrite ? { label: 'Ajouter un véhicule', onClick: () => setModalOpen(true) } : undefined}
          />
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-[#F0F2F5] text-[11px] uppercase tracking-wider text-[#64748B]">
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('immatriculation')}>
                    Immatriculation{sortIndicator('immatriculation')}
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('marque')}>
                    Marque Modèle{sortIndicator('marque')}
                  </th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('annee')}>
                    Année{sortIndicator('annee')}
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer" onClick={() => handleSort('km')}>
                    Km{sortIndicator('km')}
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('statut')}>
                    Statut{sortIndicator('statut')}
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, i) => (
                  <tr
                    key={v.id}
                    className={`border-t border-[#E2E6ED] cursor-pointer hover:bg-[#F4F6F9] transition-colors ${i % 2 === 1 ? 'bg-[#F4F6F9]' : 'bg-white'}`}
                    onClick={() => navigate(`/flotte/${v.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm bg-[#F0F2F5] border border-[#E2E6ED] px-2 py-0.5 rounded-sm">
                        {v.immatriculation}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1A2332]">
                      {v.marque} {v.modele}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className="inline-flex items-center gap-1.5"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: v.client.couleur }}
                        />
                        {v.client.nom}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1A2332]">{v.annee}</td>
                    <td className="px-4 py-3 text-sm text-right text-[#1A2332]">{formatKm(v.km)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.statut} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="text-xs text-[#1D6FA4] hover:underline"
                          onClick={() => navigate(`/flotte/${v.id}`)}
                        >
                          Voir
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            className="text-xs text-[#B45309] hover:underline"
                            onClick={() => {
                              setEditVehicle(v);
                              setModalOpen(true);
                            }}
                          >
                            Modifier
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="text-xs text-[#C0392B] hover:underline"
                            onClick={() => setDeleteConfirm(v.id)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E6ED]">
              <span className="text-sm text-[#64748B]">
                {startIdx}-{endIdx} sur {total}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, page: p }))}
                    className={`px-3 py-1 text-sm rounded-md ${
                      p === page
                        ? 'bg-[#1D6FA4] text-white'
                        : 'text-[#64748B] hover:bg-[#F0F2F5]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      <VehicleFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditVehicle(undefined);
        }}
        onSubmit={handleFormSubmit}
        vehicle={editVehicle}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#1A2332] mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-[#64748B] mb-4">
              Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-[#64748B] hover:text-[#1A2332]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-[#C0392B] text-white text-sm font-medium rounded-md hover:bg-[#a93226] disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
