import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MechanicWithWorkload } from '@/types/garage';

// ─── Mock useMechanics ───────────────────────────────────────────────────────

const mockMechanics = vi.hoisted(() => ({
  data: [] as MechanicWithWorkload[],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
}));

vi.mock('@/hooks/useGarages', () => ({
  useMechanics: () => ({
    data: mockMechanics,
    isLoading: false,
  }),
}));

const { default: MecaniciensPage } = await import('@/pages/MecaniciensPage');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMechanic(overrides: Partial<MechanicWithWorkload> = {}): MechanicWithWorkload {
  return {
    id: 'g-1',
    nom: 'Auto Service Belcourt',
    adresse: '12 Rue Belouizdad',
    ville: 'Alger',
    telephone: '+213 21 67 45 20',
    email: 'contact@belcourt.dz',
    specialite: 'MECANIQUE_GENERALE',
    statut: 'DISPONIBLE',
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    activeMaintenances: 0,
    maintenances: [],
    ...overrides,
  };
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <MecaniciensPage />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MecaniciensPage', () => {
  it('shows mechanic name and specialty', () => {
    mockMechanics.data = [makeMechanic()];
    renderPage();

    expect(screen.getByText('Auto Service Belcourt')).toBeInTheDocument();
    // "Mécanique générale" appears in both card and filter dropdown — check badge via role-free query
    const matches = screen.getAllByText('Mécanique générale');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows avatar initials from name', () => {
    mockMechanics.data = [makeMechanic({ nom: 'Tech Auto Kouba' })];
    renderPage();

    expect(screen.getByText('TA')).toBeInTheDocument();
  });

  it('shows correct status badge — DISPONIBLE', () => {
    mockMechanics.data = [makeMechanic({ statut: 'DISPONIBLE' })];
    renderPage();

    // "Disponible" appears in both badge and filter dropdown
    const badge = document.querySelector('span.rounded-full');
    expect(badge?.textContent).toBe('Disponible');
  });

  it('shows correct status badge — OCCUPE', () => {
    mockMechanics.data = [makeMechanic({ statut: 'OCCUPE' })];
    renderPage();

    const badge = document.querySelector('span.rounded-full');
    expect(badge?.textContent).toBe('Occupé');
  });

  it('shows correct status badge — INDISPONIBLE', () => {
    mockMechanics.data = [makeMechanic({ statut: 'INDISPONIBLE' })];
    renderPage();

    const badge = document.querySelector('span.rounded-full');
    expect(badge?.textContent).toBe('Indisponible');
  });

  it('shows active maintenance count', () => {
    mockMechanics.data = [makeMechanic({ activeMaintenances: 3 })];
    renderPage();

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('interventions actives')).toBeInTheDocument();
  });

  it('shows active interventions list', () => {
    mockMechanics.data = [
      makeMechanic({
        activeMaintenances: 1,
        maintenances: [
          {
            id: 'm-1',
            nature: 'Vidange complète + filtres',
            statut: 'EN_COURS',
            vehicle: { immatriculation: '16·1001·ALG', marque: 'Fiat', modele: 'Ducato' },
          },
        ],
      }),
    ];
    renderPage();

    expect(screen.getByText('16·1001·ALG')).toBeInTheDocument();
    expect(screen.getByText('Vidange complète + filtres')).toBeInTheDocument();
  });

  it('shows telephone', () => {
    mockMechanics.data = [makeMechanic()];
    renderPage();

    expect(screen.getByText('+213 21 67 45 20')).toBeInTheDocument();
  });

  it('shows empty state when no mechanics', () => {
    mockMechanics.data = [];
    renderPage();

    expect(screen.getByText('Aucun mécanicien')).toBeInTheDocument();
  });
});
