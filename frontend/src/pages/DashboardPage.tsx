import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { getAccessToken } from '@/lib/auth-token';

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

interface BackupLogEntry {
  id: string;
  filename: string;
  sizeBytes: number;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface BackupStatus {
  lastBackup: {
    status: string;
    startedAt: string;
    size: number;
    duration: number | null;
  } | null;
  history: BackupLogEntry[];
  nextScheduled: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR');
}

function BackupWidget(): JSX.Element {
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmTrigger, setConfirmTrigger] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const { data: backup, isLoading } = useQuery<BackupStatus>({
    queryKey: ['backup-status'],
    queryFn: async () => {
      const { data } = await api.get<BackupStatus>('/admin/backup/status');
      return data;
    },
    refetchInterval: 30000,
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/backup/trigger');
    },
    onSuccess: () => {
      setConfirmTrigger(false);
      setToast({ type: 'info', message: 'Backup en cours...' });
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['backup-status'] });
        setToast(null);
      }, 5000);
    },
    onError: () => {
      setConfirmTrigger(false);
      setToast({ type: 'error', message: 'Impossible de lancer le backup' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-[#E2E6ED] p-6">
        <p className="text-sm text-[#64748B]">Chargement...</p>
      </div>
    );
  }

  const last = backup?.lastBackup;
  const daysSince = last ? Math.floor((Date.now() - new Date(last.startedAt).getTime()) / 86400000) : null;

  let statusIcon: string;
  let statusColor: string;
  let statusText: string;

  if (!last) {
    statusIcon = '—';
    statusColor = '#64748B';
    statusText = 'Aucun backup enregistré';
  } else if (last.status === 'FAILED') {
    statusIcon = '\u274C';
    statusColor = '#C0392B';
    statusText = 'Dernier backup échoué';
  } else if (daysSince !== null && daysSince > 8) {
    statusIcon = '\u26A0\uFE0F';
    statusColor = '#B45309';
    statusText = `Dernier backup il y a ${daysSince} jours`;
  } else {
    statusIcon = '\u2705';
    statusColor = '#0E7C59';
    statusText = 'Backup à jour';
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-[#E2E6ED] p-6">
        <h3 className="text-sm font-semibold text-[#1A2332] uppercase tracking-wider mb-4">
          Sauvegarde base de données
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{statusIcon}</span>
          <div>
            <p className="text-sm font-medium" style={{ color: statusColor }}>{statusText}</p>
            {last && (
              <p className="text-xs text-[#64748B]">
                {formatDate(last.startedAt)} — {formatBytes(last.size)} — {formatDuration(last.duration)}
              </p>
            )}
            {!last && (
              <p className="text-xs text-[#64748B]">Premier backup prévu dimanche à 02h00</p>
            )}
          </div>
        </div>

        <div className="text-xs text-[#64748B] mb-4">
          Prochain backup : {backup ? formatDate(backup.nextScheduled) : '—'}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-[#1D6FA4] border border-[#1D6FA4] rounded-md hover:bg-[#EBF5FB] transition-colors"
          >
            Voir historique
          </button>
          <button
            type="button"
            onClick={() => setConfirmTrigger(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#1D6FA4] rounded-md hover:bg-[#185d8a] transition-colors"
          >
            Lancer un backup
          </button>
        </div>
      </div>

      {/* History modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="px-6 py-4 border-b border-[#E2E6ED] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1A2332]">Historique des backups</h2>
              <button type="button" onClick={() => setHistoryOpen(false)} className="text-[#64748B] hover:text-[#1A2332]">
                &times;
              </button>
            </div>
            <div className="p-6">
              {!backup?.history.length ? (
                <p className="text-sm text-[#64748B] text-center py-8">Aucun backup enregistré</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F0F2F5] text-[11px] uppercase tracking-wider text-[#64748B]">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Statut</th>
                      <th className="px-4 py-2 text-right">Taille</th>
                      <th className="px-4 py-2 text-right">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backup.history.map((b) => {
                      const dur =
                        b.completedAt && b.startedAt
                          ? new Date(b.completedAt).getTime() - new Date(b.startedAt).getTime()
                          : null;
                      return (
                        <tr
                          key={b.id}
                          className="border-t border-[#E2E6ED]"
                          style={b.status === 'FAILED' ? { backgroundColor: '#FDECEA' } : undefined}
                        >
                          <td className="px-4 py-2 text-sm">{formatDate(b.startedAt)}</td>
                          <td className="px-4 py-2 text-sm">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: b.status === 'SUCCESS' ? '#E8F6F0' : b.status === 'FAILED' ? '#FDECEA' : '#FEF3C7',
                                color: b.status === 'SUCCESS' ? '#0E7C59' : b.status === 'FAILED' ? '#C0392B' : '#B45309',
                              }}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{formatBytes(b.sizeBytes)}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatDuration(dur)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trigger confirm modal */}
      {confirmTrigger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#1A2332] mb-2">Lancer un backup ?</h3>
            <p className="text-sm text-[#64748B] mb-4">
              Un backup manuel de la base de données sera déclenché immédiatement.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmTrigger(false)}
                className="px-4 py-2 text-sm text-[#64748B] hover:text-[#1A2332]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={triggerMutation.isPending}
                onClick={() => triggerMutation.mutate()}
                className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] disabled:opacity-50"
              >
                {triggerMutation.isPending ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-white"
          style={{
            backgroundColor: toast.type === 'success' ? '#0E7C59' : toast.type === 'error' ? '#C0392B' : '#1D6FA4',
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

export default function DashboardPage(): JSX.Element {
  const role = getUserRole();
  const isAdmin = role === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      <h1 className="text-2xl font-bold text-[#1A2332] mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isAdmin && <BackupWidget />}

        {!isAdmin && (
          <div className="bg-white rounded-lg border border-[#E2E6ED] p-6 col-span-full">
            <p className="text-sm text-[#64748B]">
              Le dashboard complet sera disponible prochainement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
