import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import type { Client, ClientFilters } from '@/types/client';

// ─── Form Modal ──────────────────────────────────────────────────────────────

interface ClientFormModalProps {
  open: boolean;
  client?: Client | undefined;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}

function ClientFormModal({ open, client, onClose, onSubmit, isPending }: ClientFormModalProps): JSX.Element | null {
  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    data.nom = fd.get('nom');
    data.secteur = fd.get('secteur');
    data.contactNom = fd.get('contactNom');
    data.contactEmail = fd.get('contactEmail');
    data.contactTel = fd.get('contactTel');
    data.couleur = fd.get('couleur');
    const adresse = fd.get('adresse') as string;
    if (adresse) data.adresse = adresse;
    const wilaya = fd.get('wilaya') as string;
    if (wilaya) data.wilaya = wilaya;
    const notes = fd.get('notes') as string;
    if (notes) data.notes = notes;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E2E6ED]">
          <h2 className="text-base font-semibold text-[#1A2332]">
            {client ? 'Modifier le client' : 'Nouveau client'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Nom *</label>
              <input
                name="nom"
                defaultValue={client?.nom ?? ''}
                required
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Secteur *</label>
              <input
                name="secteur"
                defaultValue={client?.secteur ?? ''}
                required
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Wilaya</label>
              <input
                name="wilaya"
                defaultValue={client?.wilaya ?? ''}
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Couleur *</label>
              <input
                name="couleur"
                type="color"
                defaultValue={client?.couleur ?? '#1D6FA4'}
                required
                className="w-full h-[38px] px-1 py-1 border border-[#E2E6ED] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Adresse</label>
            <input
              name="adresse"
              defaultValue={client?.adresse ?? ''}
              className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Contact *</label>
              <input
                name="contactNom"
                defaultValue={client?.contactNom ?? ''}
                required
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Email *</label>
              <input
                name="contactEmail"
                type="email"
                defaultValue={client?.contactEmail ?? ''}
                required
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Tél *</label>
              <input
                name="contactTel"
                defaultValue={client?.contactTel ?? ''}
                required
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2332] mb-1">Notes</label>
            <textarea
              name="notes"
              defaultValue={client?.notes ?? ''}
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
              {isPending ? 'Enregistrement...' : client ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  client: Client;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function DeleteConfirmModal({ client, onConfirm, onCancel, isPending }: DeleteConfirmProps): JSX.Element {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-sm mx-4 p-5">
        <h2 className="text-base font-semibold text-[#1A2332] mb-2">Confirmer la suppression</h2>
        <p className="text-sm text-[#64748B] mb-4">
          Supprimer le client <strong>{client.nom}</strong> ? Cette action est irréversible.
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

export default function ClientsPage(): JSX.Element {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canWrite = role === 'ADMIN' || role === 'GESTIONNAIRE' || role === 'COMMERCIAL';
  const canDelete = role === 'ADMIN';

  const [filters, setFilters] = useState<ClientFilters>({
    page: 1,
    limit: 15,
    sortBy: 'nom',
    order: 'asc',
  });
  const [searchInput, setSearchInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | undefined>(undefined);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  const { data: result, isLoading } = useClients(filters);
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();

  const clients = result?.data ?? [];
  const totalPages = result?.totalPages ?? 0;
  const page = result?.page ?? 1;

  const handleSearch = (): void => {
    setFilters({ ...filters, q: searchInput || undefined, page: 1 });
  };

  const handleCreate = (data: Record<string, unknown>): void => {
    createMutation.mutate(data as Partial<Client>, {
      onSuccess: () => {
        setModalOpen(false);
      },
    });
  };

  const handleUpdate = (data: Record<string, unknown>): void => {
    if (!editClient) return;
    updateMutation.mutate(
      { id: editClient.id, data: data as Partial<Client> },
      {
        onSuccess: () => {
          setModalOpen(false);
          setEditClient(undefined);
        },
      },
    );
  };

  const handleDelete = (): void => {
    if (!deleteClient) return;
    deleteMutation.mutate(deleteClient.id, {
      onSuccess: () => {
        setDeleteClient(null);
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
          <h1 className="text-xl font-bold text-[#1A2332]">Clients</h1>
          <p className="text-sm text-[#64748B]">
            {result?.total ?? 0} client{(result?.total ?? 0) !== 1 ? 's' : ''} actif{(result?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            data-testid="add-client-button"
            onClick={() => {
              setEditClient(undefined);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] transition-colors"
          >
            + Ajouter un client
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="px-3 py-2 border border-[#E2E6ED] rounded-l-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4] w-56"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-3 py-2 bg-[#1D6FA4] text-white text-sm rounded-r-md hover:bg-[#185d8a] transition-colors"
          >
            Rechercher
          </button>
        </div>
        <select
          value={filters.wilaya ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, wilaya: e.target.value || undefined, page: 1 })
          }
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
        >
          <option value="">Toutes les wilayas</option>
          <option value="Alger">Alger</option>
          <option value="Oran">Oran</option>
          <option value="Constantine">Constantine</option>
          <option value="Annaba">Annaba</option>
          <option value="Blida">Blida</option>
          <option value="Ouargla">Ouargla</option>
          <option value="Hassi Messaoud">Hassi Messaoud</option>
        </select>
        <select
          value={filters.secteur ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, secteur: e.target.value || undefined, page: 1 })
          }
          className="px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4]"
        >
          <option value="">Tous les secteurs</option>
          <option value="BTP / Travaux Publics">BTP / Travaux Publics</option>
          <option value="Pétrole & Gaz">Pétrole & Gaz</option>
          <option value="Énergie / Électricité & Gaz">Énergie / Électricité & Gaz</option>
          <option value="Agriculture / Agroalimentaire">Agriculture / Agroalimentaire</option>
        </select>
      </div>

      {/* Table */}
      {clients.length === 0 ? (
        <EmptyState
          title="Aucun client"
          description="Aucun client enregistré pour le moment."
          action={canWrite ? { label: '+ Ajouter un client', onClick: () => setModalOpen(true) } : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E6ED] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] text-[#64748B]">
                  <th className="text-left px-4 py-2.5 font-medium">Client</th>
                  <th className="text-left px-4 py-2.5 font-medium">Secteur</th>
                  <th className="text-left px-4 py-2.5 font-medium">Wilaya</th>
                  <th className="text-left px-4 py-2.5 font-medium">Contact</th>
                  <th className="text-left px-4 py-2.5 font-medium">Véhicules</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-t border-[#E2E6ED] hover:bg-[#F4F6F9]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.couleur }}
                        />
                        <span className="font-medium text-[#1A2332]">{c.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[#64748B]">{c.secteur}</td>
                    <td className="px-4 py-2.5 text-[#64748B]">{c.wilaya ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-[#1A2332]">{c.contactNom}</div>
                      <div className="text-xs text-[#64748B]">{c.contactEmail}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EBF5FB] text-[#1D6FA4] text-xs font-bold">
                        {c._count?.vehicles ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/clients/${c.id}`)}
                        className="text-[#1D6FA4] hover:underline text-sm mr-3"
                      >
                        Détails
                      </button>
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditClient(c);
                            setModalOpen(true);
                          }}
                          className="text-[#1D6FA4] hover:underline text-sm mr-3"
                        >
                          Modifier
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteClient(c)}
                          className="text-[#C0392B] hover:underline text-sm"
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
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
      <ClientFormModal
        open={modalOpen}
        client={editClient}
        onClose={() => {
          setModalOpen(false);
          setEditClient(undefined);
        }}
        onSubmit={editClient ? handleUpdate : handleCreate}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {deleteClient && (
        <DeleteConfirmModal
          client={deleteClient}
          onConfirm={handleDelete}
          onCancel={() => setDeleteClient(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
