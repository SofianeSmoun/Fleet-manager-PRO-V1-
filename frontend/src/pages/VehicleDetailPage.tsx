import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVehicle, useVehicleHistory } from '@/hooks/useVehicles';
import StatusBadge from '@/components/StatusBadge';
import type { VehicleDetail } from '@/types/vehicle';

type Tab = 'infos' | 'historique' | 'locations' | 'interventions' | 'assurance';

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
    ['Mod\u00E8le', vehicle.modele],
    ['Ann\u00E9e', String(vehicle.annee)],
    ['Kilom\u00E9trage', `${formatKm(vehicle.km)} km`],
    ['Carburant', vehicle.carburant],
    ['Couleur', vehicle.couleur],
    ['Client', vehicle.client.nom],
    ['Notes', vehicle.notes],
    ['Cr\u00E9\u00E9 le', formatDate(vehicle.createdAt)],
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

function HistoryTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data: history, isLoading } = useVehicleHistory(vehicleId);

  if (isLoading) return <p className="text-[#64748B] p-4">Chargement...</p>;
  if (!history?.length) return <p className="text-[#64748B] p-4">Aucun historique.</p>;

  return (
    <div className="space-y-4 p-4">
      {history.map((h) => (
        <div key={h.id} className="flex gap-4 items-start">
          <div className="w-2 h-2 mt-2 rounded-full bg-[#1D6FA4] shrink-0" />
          <div>
            <p className="text-sm text-[#1A2332]">
              {h.fromStatus ? (
                <>
                  <StatusBadge status={h.fromStatus} /> <span className="text-[#64748B] mx-1">\u2192</span>{' '}
                  <StatusBadge status={h.toStatus} />
                </>
              ) : (
                <StatusBadge status={h.toStatus} />
              )}
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              {h.reason} \u2014 {h.changedBy.firstName} {h.changedBy.lastName} \u00B7 {formatDate(h.changedAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RentalsTab({ vehicle }: { vehicle: VehicleDetail }): JSX.Element {
  if (!vehicle.rentals.length) return <p className="text-[#64748B] p-4">Aucune location.</p>;

  return (
    <table className="w-full">
      <thead>
        <tr className="bg-[#F0F2F5] text-[11px] uppercase tracking-wider text-[#64748B]">
          <th className="px-4 py-3 text-left">D\u00E9but</th>
          <th className="px-4 py-3 text-left">Fin pr\u00E9vue</th>
          <th className="px-4 py-3 text-left">Fin r\u00E9elle</th>
          <th className="px-4 py-3 text-left">Statut</th>
          <th className="px-4 py-3 text-right">Montant</th>
        </tr>
      </thead>
      <tbody>
        {vehicle.rentals.map((r) => (
          <tr key={r.id} className="border-t border-[#E2E6ED]">
            <td className="px-4 py-3 text-sm">{formatDate(r.dateDebut)}</td>
            <td className="px-4 py-3 text-sm">{formatDate(r.dateFinPrevue)}</td>
            <td className="px-4 py-3 text-sm">{r.dateFinReelle ? formatDate(r.dateFinReelle) : '\u2014'}</td>
            <td className="px-4 py-3"><StatusBadge status={r.statut} /></td>
            <td className="px-4 py-3 text-sm text-right">
              {r.montantMensuel ? `${r.montantMensuel.toLocaleString('fr-FR')} ${r.devise}/mois` : '\u2014'}
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
          <th className="px-4 py-3 text-left">Entr\u00E9e</th>
          <th className="px-4 py-3 text-left">Sortie</th>
          <th className="px-4 py-3 text-left">Statut</th>
          <th className="px-4 py-3 text-right">Co\u00FBt</th>
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
          <th className="px-4 py-3 text-left">N\u00B0 Police</th>
          <th className="px-4 py-3 text-left">Couverture</th>
          <th className="px-4 py-3 text-left">D\u00E9but</th>
          <th className="px-4 py-3 text-left">\u00C9ch\u00E9ance</th>
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

  if (isLoading) {
    return <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-[#64748B]">Chargement...</div>;
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[#1A2332] mb-2">V\u00E9hicule introuvable</h2>
          <button type="button" onClick={() => navigate('/flotte')} className="text-[#1D6FA4] hover:underline text-sm">
            Retour \u00E0 la flotte
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
          {activeTab === 'locations' && <RentalsTab vehicle={vehicle} />}
          {activeTab === 'interventions' && <MaintenancesTab vehicle={vehicle} />}
          {activeTab === 'assurance' && <InsuranceTab vehicle={vehicle} />}
        </div>
      </div>
    </div>
  );
}
