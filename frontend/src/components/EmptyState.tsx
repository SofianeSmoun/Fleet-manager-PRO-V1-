interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void } | undefined;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-[#64748B] mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-[#1A2332] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#64748B] mb-4 max-w-sm">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
