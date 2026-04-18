const STATUS_STYLES: Record<string, { bg: string; text: string; label?: string }> = {
  // Vehicle statuses
  DISPONIBLE: { bg: 'bg-[#E8F6F0]', text: 'text-[#0E7C59]' },
  LOUE: { bg: 'bg-[#EBF5FB]', text: 'text-[#1D6FA4]', label: 'Loué' },
  MAINTENANCE: { bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]' },
  HORS_SERVICE: { bg: 'bg-[#F0F2F5]', text: 'text-[#4A5568]', label: 'Hors service' },
  // Garage statuses
  OCCUPE: { bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', label: 'Occupé' },
  INDISPONIBLE: { bg: 'bg-[#FDECEA]', text: 'text-[#C0392B]', label: 'Indisponible' },
  // Maintenance / Rental statuses
  EN_ATTENTE: { bg: 'bg-[#F0F2F5]', text: 'text-[#4A5568]', label: 'En attente' },
  EN_COURS: { bg: 'bg-[#EBF5FB]', text: 'text-[#1D6FA4]', label: 'En cours' },
  EN_RETARD: { bg: 'bg-[#FDECEA]', text: 'text-[#C0392B]', label: 'En retard' },
  TERMINEE: { bg: 'bg-[#E8F6F0]', text: 'text-[#0E7C59]', label: 'Terminée' },
  ANNULEE: { bg: 'bg-[#F0F2F5]', text: 'text-[#4A5568]', label: 'Annulée' },
  // Insurance statuses
  ACTIVE: { bg: 'bg-[#E8F6F0]', text: 'text-[#0E7C59]', label: 'Active' },
  EXPIRANT_BIENTOT: { bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', label: 'Expirant bientôt' },
  EXPIREE: { bg: 'bg-[#FDECEA]', text: 'text-[#C0392B]', label: 'Expirée' },
};

function formatLabel(status: string): string {
  const style = STATUS_STYLES[status];
  if (style?.label) return style.label;
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps): JSX.Element {
  const style = STATUS_STYLES[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} ${className}`}
    >
      {formatLabel(status)}
    </span>
  );
}
