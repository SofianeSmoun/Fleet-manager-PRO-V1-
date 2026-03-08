import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/dashboard" element={<div>Dashboard — à implémenter (E2)</div>} />
      <Route path="*" element={<div>404 — Page introuvable</div>} />
    </Routes>
  );
}
