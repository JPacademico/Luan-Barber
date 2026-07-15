import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { HomePage } from './pages/HomePage';
import { RouteFallback } from './components/ui/RouteFallback';
import { useAutoArchive } from './hooks/useAutoArchive';
import { useCrossTabSync } from './hooks/useCrossTabSync';
import { useApplyTheme } from './hooks/useApplyTheme';

/**
 * Home stays in the main bundle — it is the landing route and must paint immediately.
 * The other two are split out: the checkout drags in the form/validation stack and the admin
 * panel its entire CMS, and a visitor reading the home page should download neither.
 */
const BookingPage = lazy(() =>
  import('./pages/BookingPage').then((m) => ({ default: m.BookingPage }))
);
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

function App() {
  // Owns the `dark` class on <html> for every route, admin included.
  useApplyTheme();
  // Bookings are archived against the 22:00 cut-off for as long as the app stays open.
  useAutoArchive();
  // Without this, an already-open /admin tab never sees bookings taken on the public site.
  useCrossTabSync();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
