import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Subscriptions from './pages/Subscriptions';
import Menu from './pages/Menu';
import CorporateLocations from './pages/CorporateLocations';
import LookupMealSizes, { LookupStandards } from './pages/Lookup';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/schools" element={<Schools />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/corporate-locations" element={<CorporateLocations />} />
            <Route path="/lookup/meal-sizes" element={<LookupMealSizes />} />
            <Route path="/lookup/standards" element={<LookupStandards />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
