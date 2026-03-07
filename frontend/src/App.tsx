import { Routes, Route, Navigate } from 'react-router-dom';

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<div>Dashboard — à implémenter (E2)</div>} />
      <Route path="*" element={<div>404 — Page introuvable</div>} />
    </Routes>
  );
}
