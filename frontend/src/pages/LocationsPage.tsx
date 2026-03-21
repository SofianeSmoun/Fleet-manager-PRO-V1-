import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRentals, useCreateRental, useCloseRental } from '@/hooks/useRentals';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { getAccessToken } from '@/lib/auth-token';
import { api } from '@/lib/axios';
import type { RentalsFilters, RentalStatus } from '@/types/rental';

interface ClientOption {
  id: string;
  nom: string;
  couleur: string;
}

interface VehicleOption {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
}

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function LocationsPage(): JSX.Element {
  const navigate = useNavigate();
  const role = getUserRole();
  const canWrite = role === 'ADMIN' || role === 'GESTIONNAIRE';

  const [filters, setFilters] = useState<RentalsFilters>({
    page: 1,
    limit: 15,
    sortBy: 'dateDebut',
    order: 'desc',
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [closeModalId, setCloseModalId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const { data: result, isLoading } = useRentals(filters);
  const createMutation = useCreateRental();
  const closeMutation = useCloseRental();

  const rentals = useMemo(() => result?.data ?? [], [result?.data]);
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;
  const page = result?.page ?? 1;

  // KPI counts
  const kpis = useMemo(() => {
    const counts = { EN_COURS: 0, EN_RETARD: 0, TERMINEE_MOIS: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    for (const r of rentals) {
      if (r.statut === 'EN_COURS') counts.EN_COURS++;
      if (r.statut === 'EN_RETARD') counts.EN_RETARD++;
      if (r.statut === 'TERMINEE' && r.dateFinReelle && new Date(r.dateFinReelle) >= startOfMonth) {
        counts.TERMINEE_MOIS++;
      }
    }
    return counts;
  }, [rentals]);

  // Filter by immatriculation locally (search)
  const filtered = useMemo(() => {
    if (!searchQ) return rentals;
    const q = searchQ.toLowerCase();
    return rentals.filter((r) => r.vehicle.immatriculation.toLowerCase().includes(q));
  }, [rentals, searchQ]);

  const startIdx = (page - 1) * (filters.limit ?? 15) + 1;
  const endIdx = Math.min(page * (filters.limit ?? 15), total);

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1A2332]">Locations</h1>
        {canWrite && (
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] transition-colors"
          >
            + Nouvelle location
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-[#E2E6ED]">
          <p className="text-sm text-[#64748B]">En cours</p>
          <p className="text-2xl font-bold text-[#1D6FA4]">{kpis.EN_COURS}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#E2E6ED]">
          <p className="text-sm text-[#64748B]">En retard</p>
          <p className="text-2xl font-bold text-[#C0392B]">{kpis.EN_RETARD}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#E2E6ED]">
          <p className="text-sm text-[#64748B]">Terminées ce mois</p>
          <p className="text-2xl font-bold text-[#0E7C59]">{kpis.TERMINEE_MOIS}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white"
          value={filters.statut ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              statut: (e.target.value || undefined) as RentalStatus | undefined,
              page: 1,
            }))
          }
        >
          <option value="">Tous les statuts</option>
          <option value="EN_COURS">En cours</option>
          <option value="EN_RETARD">En retard</option>
          <option value="TERMINEE">Terminée</option>
          <option value="ANNULEE">Annulée</option>
        </select>

        <ClientFilter
          value={filters.clientId}
          onChange={(clientId) => setFilters((f) => ({ ...f, clientId, page: 1 }))}
        />

        <input
          type="text"
          placeholder="Rechercher immatriculation..."
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white min-w-[200px]"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E2E6ED] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Chargement...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Aucune location"
            description={
              rentals.length === 0
                ? 'Aucune location en cours.'
                : 'Aucune location ne correspond aux filtres.'
            }
            action={
              rentals.length > 0
                ? {
                    label: 'Réinitialiser les filtres',
                    onClick: () => {
                      setFilters({ page: 1, limit: 15, sortBy: 'dateDebut', order: 'desc' });
                      setSearchQ('');
                    },
                  }
                : canWrite
                  ? { label: 'Créer une location', onClick: () => setCreateModalOpen(true) }
                  : undefined
            }
          />
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-[#F0F2F5] text-[11px] uppercase tracking-wider text-[#64748B]">
                  <th className="px-4 py-3 text-left">Immatriculation</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Début</th>
                  <th className="px-4 py-3 text-left">Fin prévue</th>
                  <th className="px-4 py-3 text-left">Fin réelle</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const isOverdue = r.statut === 'EN_RETARD';
                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-[#E2E6ED] ${i % 2 === 1 && !isOverdue ? 'bg-[#F4F6F9]' : ''}`}
                      style={isOverdue ? { backgroundColor: '#FDECEA' } : undefined}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm bg-[#F0F2F5] border border-[#E2E6ED] px-2 py-0.5 rounded-sm">
                          {r.vehicle.immatriculation}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: r.client.couleur }}
                          />
                          {r.client.nom}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1A2332]">{formatDate(r.dateDebut)}</td>
                      <td
                        className={`px-4 py-3 text-sm ${isOverdue ? 'text-[#C0392B] font-bold' : 'text-[#1A2332]'}`}
                      >
                        {formatDate(r.dateFinPrevue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1A2332]">
                        {r.dateFinReelle ? formatDate(r.dateFinReelle) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.statut} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-xs text-[#1D6FA4] hover:underline"
                            onClick={() => navigate(`/flotte/${r.vehicleId}`)}
                          >
                            Voir
                          </button>
                          {canWrite && r.statut === 'EN_COURS' && (
                            <button
                              type="button"
                              className="text-xs text-[#0E7C59] hover:underline"
                              onClick={() => setCloseModalId(r.id)}
                            >
                              Clôturer
                            </button>
                          )}
                          {canWrite && r.statut === 'EN_RETARD' && (
                            <button
                              type="button"
                              className="text-xs text-[#0E7C59] hover:underline"
                              onClick={() => setCloseModalId(r.id)}
                            >
                              Clôturer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                      p === page ? 'bg-[#1D6FA4] text-white' : 'text-[#64748B] hover:bg-[#F0F2F5]'
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

      {/* Create Modal */}
      {createModalOpen && (
        <CreateRentalModal
          onClose={() => setCreateModalOpen(false)}
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: () => setCreateModalOpen(false),
            });
          }}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Close Modal */}
      {closeModalId && (
        <CloseRentalModal
          rentalId={closeModalId}
          onClose={() => setCloseModalId(null)}
          onSubmit={(data) => {
            closeMutation.mutate(
              { id: closeModalId, ...data },
              { onSuccess: () => setCloseModalId(null) },
            );
          }}
          isLoading={closeMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ClientFilter({
  value,
  onChange,
}: {
  value?: string | undefined;
  onChange: (v: string | undefined) => void;
}): JSX.Element {
  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ClientOption[] }>('/clients?limit=100');
      return data.data;
    },
  });

  return (
    <select
      className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">Tous les clients</option>
      {clients?.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nom}
        </option>
      ))}
    </select>
  );
}

function CreateRentalModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}): JSX.Element {
  const [vehicleId, setVehicleId] = useState('');
  const [clientId, setClientId] = useState('');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10));
  const [dateFinPrevue, setDateFinPrevue] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-disponibles'],
    queryFn: async () => {
      const { data } = await api.get<{ data: VehicleOption[] }>('/vehicles?statut=DISPONIBLE&limit=100');
      return data.data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ClientOption[] }>('/clients?limit=100');
      return data.data;
    },
  });

  const handleSubmit = useCallback((): void => {
    if (!vehicleId || !clientId || !dateDebut || !dateFinPrevue) {
      setError('Tous les champs obligatoires doivent être remplis');
      return;
    }
    const debut = new Date(dateDebut);
    const fin = new Date(dateFinPrevue);
    if (fin <= debut) {
      setError('La date de fin prévue doit être postérieure à la date de début');
      return;
    }
    setError('');
    onSubmit({
      vehicleId,
      clientId,
      dateDebut: debut.toISOString(),
      dateFinPrevue: fin.toISOString(),
      notes: notes || undefined,
    });
  }, [vehicleId, clientId, dateDebut, dateFinPrevue, notes, onSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-[#E2E6ED]">
          <h2 className="text-lg font-semibold text-[#1A2332]">Nouvelle location</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Véhicule *</label>
            <select
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Sélectionner un véhicule</option>
              {vehicles?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.immatriculation} — {v.marque} {v.modele}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Client *</label>
            <select
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Sélectionner un client</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Date début *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Date fin prévue *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm"
                value={dateFinPrevue}
                onChange={(e) => setDateFinPrevue(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-[#C0392B]">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-[#E2E6ED] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#64748B] hover:text-[#1A2332]"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] disabled:opacity-50"
          >
            {isLoading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseRentalModal({
  rentalId,
  onClose,
  onSubmit,
  isLoading,
}: {
  rentalId: string;
  onClose: () => void;
  onSubmit: (data: { dateFinReelle: string; kmRetour?: number; notes?: string }) => void;
  isLoading: boolean;
}): JSX.Element {
  void rentalId; // used by parent for the mutation
  const [dateFinReelle, setDateFinReelle] = useState(new Date().toISOString().slice(0, 10));
  const [kmRetour, setKmRetour] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = useCallback((): void => {
    const payload: { dateFinReelle: string; kmRetour?: number; notes?: string } = {
      dateFinReelle: new Date(dateFinReelle).toISOString(),
    };
    if (kmRetour) payload.kmRetour = parseInt(kmRetour, 10);
    if (notes) payload.notes = notes;
    onSubmit(payload);
  }, [dateFinReelle, kmRetour, notes, onSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-[#E2E6ED]">
          <h2 className="text-lg font-semibold text-[#1A2332]">Clôturer la location</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Date fin réelle *</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm"
              value={dateFinReelle}
              onChange={(e) => setDateFinReelle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Km retour</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm"
              value={kmRetour}
              onChange={(e) => setKmRetour(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#E2E6ED] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#64748B] hover:text-[#1A2332]"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#0E7C59] text-white text-sm font-medium rounded-md hover:bg-[#0a6347] disabled:opacity-50"
          >
            {isLoading ? 'Clôture...' : 'Clôturer'}
          </button>
        </div>
      </div>
    </div>
  );
}
