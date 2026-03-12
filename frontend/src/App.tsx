import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import FlottePage from './pages/FlottePage';
import VehicleDetailPage from './pages/VehicleDetailPage';

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/dashboard" element={<div>Dashboard — à implémenter (E2)</div>} />
      <Route path="/flotte" element={<FlottePage />} />
      <Route path="/flotte/:id" element={<VehicleDetailPage />} />
      <Route path="*" element={<div>404 — Page introuvable</div>} />
    </Routes>
  );
}
