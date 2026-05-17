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
import Homepage from './pages/Homepage';
import TokenPage from './pages/Token';
import IncreaseRemainingPage from './pages/IncreaseRemaining';
import MealSizeUpgrades from './pages/MealSizeUpgrades';
import BulkOrders from './pages/BulkOrders';

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
            <Route path="/meal-size-upgrades" element={<MealSizeUpgrades />} />
            <Route path="/token" element={<TokenPage />} />
            <Route path="/increase-remaining" element={<IncreaseRemainingPage />} />
            <Route path="/homepage" element={<Homepage />} />
            <Route path="/bulk-orders" element={<BulkOrders />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
