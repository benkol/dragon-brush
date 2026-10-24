import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './auth/AppProvider';
import LoginScreen from './auth/LoginScreen';
import KidsScreen from './kids/KidsScreen';
import KidHome from './kids/KidHome';
import ShopScreen from './rewards/ShopScreen';
import WardrobeScreen from './rewards/WardrobeScreen';
import StickersScreen from './rewards/StickersScreen';
import PrizesScreen from './rewards/PrizesScreen';
import ParentScreen from './parent/ParentScreen';
import HistoryScreen from './parent/HistoryScreen';
import ErrorBoundary from './ui/ErrorBoundary';
import PrivacyScreen from './PrivacyScreen';

// The game pulls in MediaPipe; load it only when brushing.
const BrushScreen = lazy(() => import('./game/BrushScreen'));

function Splash() {
  return (
    <div className="splash">
      <span className="big-emoji bob">🐲</span>
    </div>
  );
}

function AppRoutes() {
  const { user } = useApp();
  const { pathname } = useLocation();
  // The privacy note is readable before signing in.
  if (pathname === '/privacy') return <PrivacyScreen />;
  if (!user) return <LoginScreen />;
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<KidsScreen />} />
        <Route path="/kid/:kidId" element={<KidHome />} />
        <Route path="/kid/:kidId/brush" element={<BrushScreen />} />
        <Route path="/kid/:kidId/shop" element={<ShopScreen />} />
        <Route path="/kid/:kidId/wardrobe" element={<WardrobeScreen />} />
        <Route path="/kid/:kidId/stickers" element={<StickersScreen />} />
        <Route path="/kid/:kidId/rewards" element={<PrizesScreen />} />
        <Route path="/parent" element={<ParentScreen />} />
        <Route path="/parent/history/:kidId" element={<HistoryScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppProvider fallback={<Splash />}>
          <AppRoutes />
        </AppProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
