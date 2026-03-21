import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Client } from '@/types/client';

// ─── Mock useClients ─────────────────────────────────────────────────────────

const mockClients = vi.hoisted(() => ({
  data: [] as Client[],
  total: 0,
  page: 1,
  limit: 100,
  totalPages: 1,
}));

vi.mock('@/hooks/useClients', () => ({
  useClients: () => ({
    data: mockClients,
    isLoading: false,
  }),
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
    contactNom: 'Mourad Kellou',
    contactEmail: 'mkellou@cosider.dz',
    contactTel: '+213 21 50 00 10',
    couleur: '#E74C3C',
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
  it('shows client name and sector', () => {
    mockClients.data = [makeClient()];
    renderPage();

    expect(screen.getByText('Cosider')).toBeInTheDocument();
    expect(screen.getByText('BTP / Travaux Publics')).toBeInTheDocument();
  });

  it('shows contact info', () => {
    mockClients.data = [makeClient()];
    renderPage();

    expect(screen.getByText('Mourad Kellou')).toBeInTheDocument();
    expect(screen.getByText('mkellou@cosider.dz')).toBeInTheDocument();
  });

  it('applies border color from client couleur', () => {
    mockClients.data = [makeClient({ couleur: '#27AE60' })];
    renderPage();

    const card = screen.getByText('Cosider').closest('div[style]');
    expect(card).not.toBeNull();
    // The style attribute should contain the border color
    expect(card?.getAttribute('style')).toContain('rgb(39, 174, 96)');
  });

  it('shows empty state when no clients', () => {
    mockClients.data = [];
    renderPage();

    expect(screen.getByText('Aucun client')).toBeInTheDocument();
  });

  it('shows client count', () => {
    mockClients.data = [
      makeClient(),
      makeClient({ id: 'c-2', nom: 'Sonatrach', secteur: 'Pétrole & Gaz' }),
    ];
    renderPage();

    expect(screen.getByText('2 clients actifs')).toBeInTheDocument();
  });
});
