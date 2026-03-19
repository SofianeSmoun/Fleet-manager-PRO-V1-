import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVehicle, useVehicleHistory, useChangeVehicleStatus } from '@/hooks/useVehicles';
import { useRentals } from '@/hooks/useRentals';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { getAccessToken } from '@/lib/auth-token';
import type { VehicleDetail } from '@/types/vehicle';
import type { VehicleStatus } from '@/types';

type Tab = 'infos' | 'historique' | 'locations' | 'interventions' | 'assurance';

// Allowed transitions map (mirrors backend ALLOWED_TRANSITIONS)
const TRANSITIONS: Record<string, { value: VehicleStatus; label: string }[]> = {
  DISPONIBLE: [
    { value: 'LOUE', label: 'Loué' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'HORS_SERVICE', label: 'Hors service' },
  ],
  LOUE: [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'HORS_SERVICE', label: 'Hors service' },
  ],
  MAINTENANCE: [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'HORS_SERVICE', label: 'Hors service' },
  ],
  HORS_SERVICE: [
    { value: 'DISPONIBLE', label: 'Disponible' },
  ],
};

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

function formatKm(km: number): string {
  return km.toLocaleString('fr-FR');
}

function InfoGrid({ vehicle }: { vehicle: VehicleDetail }): JSX.Element {
  const rows: [string, string | undefined][] = [
    ['Immatriculation', vehicle.immatriculation],
    ['VIN', vehicle.vin],
    ['Marque', vehicle.marque],
    ['Modèle', vehicle.modele],
    ['Année', String(vehicle.annee)],
    ['Kilométrage', `${formatKm(vehicle.km)} km`],
    ['Carburant', vehicle.carburant],
    ['Couleur', vehicle.couleur],
    ['Client', vehicle.client.nom],
    ['Notes', vehicle.notes],
    ['Créé le', formatDate(vehicle.createdAt)],
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {rows.map(([label, value]) =>
        value ? (
          <div key={label}>
            <p className="text-xs text-[#64748B] uppercase tracking-wider">{label}</p>
            <p className={`text-sm text-[#1A2332] mt-0.5 ${label === 'Immatriculation' ? 'font-mono bg-[#F0F2F5] border border-[#E2E6ED] px-2 py-0.5 rounded-sm inline-block' : ''}`}>
              {value}
            </p>
          </div>
        ) : null,
      )}
    </div>
  );
}

const ROW_BG: Record<string, string> = {
  DISPONIBLE: '#E8F6F0',
  HORS_SERVICE: '#FDECEA',
  MAINTENANCE: '#FEF3C7',
  LOUE: '#EBF5FB',
};

function HistoryTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data: history, isLoading, isError, refetch } = useVehicleHistory(vehicleId);
  const [exporting, setExporting] = useState(false);

  const handleExport = (): void => {
    setExporting(true);
    fetch(`/api/v1/vehicles/${vehicleId}/history?format=excel`, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const disposition = res.headers.get('content-disposition');
        const match = disposition?.match(/filename=(.+)/);
        a.download = match?.[1] ?? 'historique.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        // silent — toast could be added later
      })
      .finally(() => setExporting(false));
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-[#1D6FA4] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (isError) {
    return (
      <div className="text-center p-8">
        <p className="text-sm text-[#C0392B] mb-2">Erreur lors du chargement de l&apos;historique.</p>
        <button type="button" onClick={() => { void refetch(); }} className="text-sm text-[#1D6FA4] hover:underline">Réessayer</button>
      </div>
    );
  }

  if (!history?.length) {
    return <EmptyState title="Aucun historique" description="Aucun changement de statut enregistré pour ce véhicule." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E6ED]">
        <h3 className="text-sm font-semibold text-[#1A2332]">Historique des statuts</h3>
        <button
          type="button"
          disabled={exporting || history.length === 0}
          onClick={handleExport}
          className="px-3 py-1.5 text-xs font-medium text-[#1D6FA4] border border-[#1D6FA4] rounded-md hover:bg-[#EBF5FB] disabled:opacity-50 transition-colors"
        >
          {exporting ? 'Export...' : 'Exporter Excel'}
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-[#F0F2F5] text-[11px] uppercase tracking-wider text-[#64748B]">
            <th className="px-4 py-3 text-left">Date/heure</th>
            <th className="px-4 py-3 text-left">De</th>
            <th className="px-4 py-3 text-left">Vers</th>
            <th className="px-4 py-3 text-left">Commentaire</th>
            <th className="px-4 py-3 text-left">Par</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id} className="border-t border-[#E2E6ED]" style={{ backgroundColor: ROW_BG[h.toStatus] ?? 'white' }}>
              <td className="px-4 py-3 text-sm text-[#1A2332] whitespace-nowrap">
                {new Date(h.changedAt).toLocaleString('fr-FR')}
              </td>
              <td className="px-4 py-3">
                {h.fromStatus ? <StatusBadge status={h.fromStatus} /> : <span className="text-xs text-[#64748B]">—</span>}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={h.toStatus} />
              </td>
              <td className="px-4 py-3 text-sm text-[#1A2332] max-w-[300px]" title={h.reason}>
                {h.reason.length > 80 ? `${h.reason.slice(0, 80)}…` : h.reason}
              </td>
              <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap">
                {h.changedBy.firstName} {h.changedBy.lastName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RentalsTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data: result, isLoading } = useRentals({ vehicleId, limit: 50, sortBy: 'dateDebut', order: 'desc' });
  const rentals = result?.data ?? [];

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-[#1D6FA4] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!rentals.length) {
    return <EmptyState title="Aucune location" description="Aucune location enregistrée pour ce véhicule." />;
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="bg-[#F0F2F5] text-[11px] uppercase tracking-wider text-[#64748B]">
          <th className="px-4 py-3 text-left">Début</th>
          <th className="px-4 py-3 text-left">Fin prévue</th>
          <th className="px-4 py-3 text-left">Fin réelle</th>
          <th className="px-4 py-3 text-left">Statut</th>
          <th className="px-4 py-3 text-left">Client</th>
        </tr>
      </thead>
      <tbody>
        {rentals.map((r) => (
          <tr key={r.id} className="border-t border-[#E2E6ED]">
            <td className="px-4 py-3 text-sm">{formatDate(r.dateDebut)}</td>
            <td className="px-4 py-3 text-sm">{formatDate(r.dateFinPrevue)}</td>
            <td className="px-4 py-3 text-sm">{r.dateFinReelle ? formatDate(r.dateFinReelle) : '—'}</td>
            <td className="px-4 py-3"><StatusBadge status={r.statut} /></td>
            <td className="px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: r.client.couleur }} />
                {r.client.nom}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MaintenancesTab({ vehicle }: { vehicle: VehicleDetail }): JSX.Element {
  if (!vehicle.maintenances.length) return <p className="text-[#64748B] p-4">Aucune intervention.</p>;

  return (
    <table className="w-full">
      <thead>
        <tr className="bg-[#F0F2F5] text-[11px] uppercase tracking-wider text-[#64748B]">
          <th className="px-4 py-3 text-left">Type</th>
          <th className="px-4 py-3 text-left">Nature</th>
          <th className="px-4 py-3 text-left">Entrée</th>
          <th className="px-4 py-3 text-left">Sortie</th>
          <th className="px-4 py-3 text-left">Statut</th>
          <th className="px-4 py-3 text-right">Coût</th>
        </tr>
      </thead>
      <tbody>
        {vehicle.maintenances.map((m) => (
          <tr key={m.id} className="border-t border-[#E2E6ED]">
            <td className="px-4 py-3 text-sm">{m.type}</td>
            <td className="px-4 py-3 text-sm">{m.nature}</td>
            <td className="px-4 py-3 text-sm">{formatDate(m.dateEntree)}</td>
            <td className="px-4 py-3 text-sm">{m.dateSortieReelle ? formatDate(m.dateSortieReelle) : '\u2014'}</td>
            <td className="px-4 py-3"><StatusBadge status={m.statut} /></td>
            <td className="px-4 py-3 text-sm text-right">
              {m.coutReel ? `${m.coutReel.toLocaleString('fr-FR')} DA` : m.coutEstime ? `~${m.coutEstime.toLocaleString('fr-FR')} DA` : '\u2014'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InsuranceTab({ vehicle }: { vehicle: VehicleDetail }): JSX.Element {
  if (!vehicle.insurances.length) return <p className="text-[#64748B] p-4">Aucune police d&apos;assurance.</p>;

  return (
    <table className="w-full">
      <thead>
        <tr className="bg-[#F0F2F5] text-[11px] uppercase tracking-wider text-[#64748B]">
          <th className="px-4 py-3 text-left">Compagnie</th>
          <th className="px-4 py-3 text-left">N° Police</th>
          <th className="px-4 py-3 text-left">Couverture</th>
          <th className="px-4 py-3 text-left">Début</th>
          <th className="px-4 py-3 text-left">Échéance</th>
          <th className="px-4 py-3 text-left">Statut</th>
          <th className="px-4 py-3 text-right">Prime</th>
        </tr>
      </thead>
      <tbody>
        {vehicle.insurances.map((ins) => (
          <tr key={ins.id} className="border-t border-[#E2E6ED]">
            <td className="px-4 py-3 text-sm">{ins.compagnie}</td>
            <td className="px-4 py-3 text-sm font-mono">{ins.numeroPolice}</td>
            <td className="px-4 py-3 text-sm">{ins.typeCouverture}</td>
            <td className="px-4 py-3 text-sm">{formatDate(ins.dateDebut)}</td>
            <td className="px-4 py-3 text-sm">{formatDate(ins.dateEcheance)}</td>
            <td className="px-4 py-3"><StatusBadge status={ins.statut} /></td>
            <td className="px-4 py-3 text-sm text-right">{ins.primeMontant.toLocaleString('fr-FR')} DA/an</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function VehicleDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vehicle, isLoading } = useVehicle(id ?? '');
  const [activeTab, setActiveTab] = useState<Tab>('infos');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<VehicleStatus | ''>('');
  const [statusComment, setStatusComment] = useState('');
  const changeStatusMutation = useChangeVehicleStatus();
  const role = getUserRole();
  const canWrite = role === 'ADMIN' || role === 'GESTIONNAIRE';

  if (isLoading) {
    return <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-[#64748B]">Chargement...</div>;
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[#1A2332] mb-2">Véhicule introuvable</h2>
          <button type="button" onClick={() => navigate('/flotte')} className="text-[#1D6FA4] hover:underline text-sm">
            Retour à la flotte
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'infos', label: 'Informations' },
    { key: 'historique', label: 'Historique statuts' },
    { key: 'locations', label: 'Locations' },
    { key: 'interventions', label: 'Interventions' },
    { key: 'assurance', label: 'Assurance' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-[#64748B] mb-4">
        <Link to="/flotte" className="hover:text-[#1D6FA4]">Flotte</Link>
        <span className="mx-2">/</span>
        <span className="text-[#1A2332] font-mono">{vehicle.immatriculation}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold font-mono text-[#1A2332] bg-[#F0F2F5] border border-[#E2E6ED] px-3 py-1 rounded">
          {vehicle.immatriculation}
        </h1>
        <StatusBadge status={vehicle.statut} />
        <span className="flex items-center gap-1.5 text-sm text-[#1A2332]">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: vehicle.client.couleur }} />
          {vehicle.client.nom}
        </span>
        {canWrite && (TRANSITIONS[vehicle.statut]?.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('');
              setStatusComment('');
              setStatusModalOpen(true);
            }}
            className="ml-auto px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] transition-colors"
          >
            Changer statut
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-[#E2E6ED]">
        <div className="flex border-b border-[#E2E6ED]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-[#1D6FA4] text-[#1D6FA4]'
                  : 'border-transparent text-[#64748B] hover:text-[#1A2332]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'infos' && <InfoGrid vehicle={vehicle} />}
          {activeTab === 'historique' && <HistoryTab vehicleId={vehicle.id} />}
          {activeTab === 'locations' && <RentalsTab vehicleId={vehicle.id} />}
          {activeTab === 'interventions' && <MaintenancesTab vehicle={vehicle} />}
          {activeTab === 'assurance' && <InsuranceTab vehicle={vehicle} />}
        </div>
      </div>

      {/* Status change modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-[#1A2332] mb-4">Changer le statut</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Nouveau statut</label>
              <select
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm bg-white"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as VehicleStatus)}
              >
                <option value="">Sélectionner...</option>
                {(TRANSITIONS[vehicle.statut] ?? []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A2332] mb-1">Commentaire</label>
              <textarea
                className="w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm resize-none"
                rows={3}
                placeholder="Motif du changement (obligatoire)"
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
              />
              {statusComment.trim() === '' && (
                <p className="text-xs text-[#C0392B] mt-1">Le commentaire est obligatoire</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 text-sm text-[#64748B] hover:text-[#1A2332]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!selectedStatus || !statusComment.trim() || changeStatusMutation.isPending}
                onClick={() => {
                  if (!selectedStatus || !statusComment.trim()) return;
                  changeStatusMutation.mutate(
                    { id: vehicle.id, toStatus: selectedStatus, comment: statusComment },
                    { onSuccess: () => setStatusModalOpen(false) },
                  );
                }}
                className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] disabled:opacity-50"
              >
                {changeStatusMutation.isPending ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
