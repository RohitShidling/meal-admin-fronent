import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Subscriptions from './pages/Subscriptions';
import Menu from './pages/Menu';
import CorporateLocations from './pages/CorporateLocations';
import Payments from './pages/Payments';
import TrialPlans from './pages/TrialPlans';
import MasterData from './pages/MasterData';

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
            <Route path="/payments" element={<Payments />} />
            <Route path="/trial-plans" element={<TrialPlans />} />
            <Route path="/master-data" element={<MasterData />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
