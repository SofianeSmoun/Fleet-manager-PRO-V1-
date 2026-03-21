import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import RoleGuard from './components/layout/RoleGuard';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FlottePage from './pages/FlottePage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import LocationsPage from './pages/LocationsPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App(): JSX.Element {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Authenticated shell */}
      <Route element={<AppLayout />}>
        {/* All roles */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<PlaceholderPage title="Clients" sprint="Sprint 4" />} />

        {/* ADMIN + GESTIONNAIRE + LECTEUR */}
        <Route element={<RoleGuard allowed={['ADMIN', 'GESTIONNAIRE', 'LECTEUR']} />}>
          <Route path="/flotte" element={<FlottePage />} />
          <Route path="/flotte/:id" element={<VehicleDetailPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/mecaniciens" element={<PlaceholderPage title="Mécaniciens" sprint="Sprint 4" />} />
          <Route path="/stock" element={<PlaceholderPage title="Stock" sprint="Sprint 5-6" />} />
        </Route>

        {/* ADMIN + GESTIONNAIRE */}
        <Route element={<RoleGuard allowed={['ADMIN', 'GESTIONNAIRE']} />}>
          <Route path="/garages" element={<PlaceholderPage title="Garages" sprint="Sprint 4" />} />
        </Route>

        {/* ADMIN + COMMERCIAL */}
        <Route element={<RoleGuard allowed={['ADMIN', 'COMMERCIAL']} />}>
          <Route path="/assurances" element={<PlaceholderPage title="Assurances" sprint="Sprint 6" />} />
        </Route>

        {/* ADMIN only */}
        <Route element={<RoleGuard allowed={['ADMIN']} />}>
          <Route path="/rapports" element={<PlaceholderPage title="Rapports" sprint="Sprint 7-8" />} />
          <Route path="/parametres" element={<PlaceholderPage title="Paramètres" sprint="Sprint 7-8" />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
