import { useState } from 'react';
import { useGarages, useCreateGarage, useUpdateGarage, useSoftDeleteGarage } from '@/hooks/useGarages';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import type { Garage, GarageFilters } from '@/types/garage';
import type { GarageStatus, Specialty } from '@/types';

const SPECIALITE_LABELS: Record<string, string> = {
  MECANIQUE_GENERALE: 'Mécanique générale',
  ELECTRICITE_AUTO: 'Électricité auto',
  CARROSSERIE: 'Carrosserie',
  PNEUMATIQUES_FREINS: 'Pneumatiques & Freins',
  MOTEUR_TRANSMISSION: 'Moteur & Transmission',
};

// ─── Form Modal ──────────────────────────────────────────────────────────────

interface GarageFormModalProps {
  open: boolean;
  garage?: Garage | undefined;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}

function GarageFormModal({ open, garage, onClose, onSubmit, isPending }: GarageFormModalProps): JSX.Element | null {
  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    if (garage) data.id = garage.id;
    data.nom = fd.get('nom');
    data.adresse = fd.get('adresse');
    data.ville = fd.get('ville');
    data.telephone = fd.get('telephone');
    const email = fd.get('email') as string;
    if (email) data.email = email;
    const specialite = fd.get('specialite') as string;
    if (specialite) data.specialite = specialite;
    const notes = fd.get('notes') as string;
    if (notes) data.notes = notes;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E2E6ED]">
          <h2 className="text-base font-semibold text-[#1A2332]">
            {garage ? 'Modifier le garage' : 'Nouveau garage'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Nom *</label>
            <input
              name="nom"
              defaultValue={garage?.nom ?? ''}
              required
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Ville *</label>
              <input
                name="ville"
                defaultValue={garage?.ville ?? ''}
                required
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Téléphone *</label>
              <input
                name="telephone"
                defaultValue={garage?.telephone ?? ''}
                required
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Adresse *</label>
            <input
              name="adresse"
              defaultValue={garage?.adresse ?? ''}
              required
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={garage?.email ?? ''}
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Spécialité</label>
              <select
                name="specialite"
                defaultValue={garage?.specialite ?? ''}
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              >
                <option value="">— Aucune —</option>
                {Object.entries(SPECIALITE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Notes</label>
            <textarea
              name="notes"
              defaultValue={garage?.notes ?? ''}
              rows={2}
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#64748B] hover:bg-[#F4F6F9] rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-[#1D6FA4] text-white rounded-md hover:bg-[#185d8a] transition-colors disabled:opacity-50"
            >
              {isPending ? 'Enregistrement...' : garage ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  garage: Garage;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function DeleteConfirmModal({ garage, onConfirm, onCancel, isPending }: DeleteConfirmProps): JSX.Element {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-sm mx-4 p-5">
        <h2 className="text-base font-semibold text-[#1A2332] mb-2">Confirmer la suppression</h2>
        <p className="text-sm text-[#64748B] mb-4">
          Supprimer le garage <strong>{garage.nom}</strong> ? Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#64748B] hover:bg-[#F4F6F9] rounded-md transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-[#C0392B] text-white rounded-md hover:bg-[#a33025] transition-colors disabled:opacity-50"
          >
            {isPending ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function GaragesPage(): JSX.Element {
  const { role } = useAuth();
  const canWrite = role === 'ADMIN' || role === 'GESTIONNAIRE';
  const canDelete = role === 'ADMIN';

  const [filters, setFilters] = useState<GarageFilters>({
    page: 1,
    limit: 15,
    sortBy: 'nom',
    order: 'asc',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editGarage, setEditGarage] = useState<Garage | undefined>(undefined);
  const [deleteGarage, setDeleteGarage] = useState<Garage | null>(null);

  const { data: result, isLoading } = useGarages(filters);
  const createMutation = useCreateGarage();
  const updateMutation = useUpdateGarage();
  const deleteMutation = useSoftDeleteGarage();

  const garages = result?.data ?? [];
  const totalPages = result?.totalPages ?? 0;
  const page = result?.page ?? 1;

  const handleCreate = (data: Record<string, unknown>): void => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setModalOpen(false);
      },
    });
  };

  const handleUpdate = (data: Record<string, unknown>): void => {
    updateMutation.mutate(data as Record<string, unknown> & { id: string }, {
      onSuccess: () => {
        setModalOpen(false);
        setEditGarage(undefined);
      },
    });
  };

  const handleDelete = (): void => {
    if (!deleteGarage) return;
    deleteMutation.mutate(deleteGarage.id, {
      onSuccess: () => {
        setDeleteGarage(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D6FA4]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2332]">Garages</h1>
          <p className="text-sm text-[#64748B]">{result?.total ?? 0} garage(s) prestataire(s)</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setEditGarage(undefined);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] transition-colors"
          >
            + Nouveau garage
          </button>
        )}
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

      {/* Table */}
      {garages.length === 0 ? (
        <EmptyState
          title="Aucun garage"
          description="Commencez par ajouter votre premier garage prestataire."
          action={canWrite ? { label: '+ Nouveau garage', onClick: () => setModalOpen(true) } : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E6ED] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] text-[#64748B]">
                  <th className="text-left px-4 py-2.5 font-medium">Nom</th>
                  <th className="text-left px-4 py-2.5 font-medium">Ville</th>
                  <th className="text-left px-4 py-2.5 font-medium">Téléphone</th>
                  <th className="text-left px-4 py-2.5 font-medium">Spécialité</th>
                  <th className="text-left px-4 py-2.5 font-medium">Interventions</th>
                  <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                  {canWrite && (
                    <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {garages.map((g) => (
                  <tr key={g.id} className="border-t border-[#E2E6ED] hover:bg-[#F4F6F9]">
                    <td className="px-4 py-2.5 font-medium text-[#1A2332]">{g.nom}</td>
                    <td className="px-4 py-2.5 text-[#64748B]">{g.ville}</td>
                    <td className="px-4 py-2.5 font-['IBM_Plex_Mono'] text-[#1A2332]">
                      {g.telephone}
                    </td>
                    <td className="px-4 py-2.5 text-[#64748B]">
                      {g.specialite ? SPECIALITE_LABELS[g.specialite] ?? g.specialite : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EBF5FB] text-[#1D6FA4] text-xs font-bold">
                        {g._count.maintenances}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={g.statut} />
                    </td>
                    {canWrite && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditGarage(g);
                            setModalOpen(true);
                          }}
                          className="text-[#1D6FA4] hover:underline text-sm mr-3"
                        >
                          Modifier
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteGarage(g)}
                            className="text-[#C0392B] hover:underline text-sm"
                          >
                            Supprimer
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#E2E6ED] flex items-center justify-between text-sm">
              <p className="text-[#64748B]">
                Page {page} / {totalPages} — {result?.total ?? 0} résultat(s)
              </p>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilters({ ...filters, page: p })}
                    className={`w-8 h-8 rounded-md text-xs ${
                      p === page
                        ? 'bg-[#1D6FA4] text-white'
                        : 'text-[#64748B] hover:bg-[#F4F6F9]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <GarageFormModal
        open={modalOpen}
        garage={editGarage}
        onClose={() => {
          setModalOpen(false);
          setEditGarage(undefined);
        }}
        onSubmit={editGarage ? handleUpdate : handleCreate}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {deleteGarage && (
        <DeleteConfirmModal
          garage={deleteGarage}
          onConfirm={handleDelete}
          onCancel={() => setDeleteGarage(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
