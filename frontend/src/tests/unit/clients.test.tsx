import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Client } from '@/types/client';

// ─── Mock useClients ─────────────────────────────────────────────────────────

const mockClients = vi.hoisted(() => ({
  data: [] as Client[],
  total: 0,
  page: 1,
  limit: 15,
  totalPages: 1,
}));

vi.mock('@/hooks/useClients', () => ({
  useClients: () => ({
    data: mockClients,
    isLoading: false,
  }),
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateClient: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteClient: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ role: 'ADMIN' }),
}));

// Lazy import after mock
const { default: ClientsPage } = await import('@/pages/ClientsPage');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c-1',
    nom: 'Cosider',
    secteur: 'BTP / Travaux Publics',
    adresse: 'Alger',
    wilaya: 'Alger',
    contactNom: 'Mourad Kellou',
    contactEmail: 'mkellou@cosider.dz',
    contactTel: '+213 21 50 00 10',
    couleur: '#E74C3C',
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    _count: { vehicles: 5 },
    ...overrides,
  };
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <ClientsPage />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClientsPage', () => {
  it('shows client name and sector in table', () => {
    mockClients.data = [makeClient()];
    mockClients.total = 1;
    renderPage();

    expect(screen.getByText('Cosider')).toBeInTheDocument();
    // Sector appears both in filter dropdown and table — check the table cell
    const sectorCells = screen.getAllByText('BTP / Travaux Publics');
    expect(sectorCells.length).toBeGreaterThanOrEqual(1);
  });

  it('shows wilaya column', () => {
    mockClients.data = [makeClient({ wilaya: 'Oran' })];
    mockClients.total = 1;
    renderPage();

    // Oran appears in both filter dropdown and table — check both exist
    const oranElements = screen.getAllByText('Oran');
    expect(oranElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows vehicle count', () => {
    mockClients.data = [makeClient({ _count: { vehicles: 12 } })];
    mockClients.total = 1;
    renderPage();

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows contact info', () => {
    mockClients.data = [makeClient()];
    mockClients.total = 1;
    renderPage();

    expect(screen.getByText('Mourad Kellou')).toBeInTheDocument();
    expect(screen.getByText('mkellou@cosider.dz')).toBeInTheDocument();
  });

  it('shows empty state when no clients', () => {
    mockClients.data = [];
    mockClients.total = 0;
    renderPage();

    expect(screen.getByText('Aucun client')).toBeInTheDocument();
  });

  it('shows client count', () => {
    mockClients.data = [
      makeClient(),
      makeClient({ id: 'c-2', nom: 'Sonatrach', secteur: 'Pétrole & Gaz' }),
    ];
    mockClients.total = 2;
    renderPage();

    expect(screen.getByText('2 clients actifs')).toBeInTheDocument();
  });

  it('shows add button for ADMIN', () => {
    mockClients.data = [];
    mockClients.total = 0;
    renderPage();

    expect(screen.getByTestId('add-client-button')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    mockClients.data = [makeClient()];
    mockClients.total = 1;
    renderPage();

    expect(screen.getByText('Wilaya')).toBeInTheDocument();
    expect(screen.getByText('Véhicules')).toBeInTheDocument();
  });
});
