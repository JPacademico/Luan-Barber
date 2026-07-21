import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { HomePage } from './pages/HomePage';
import { RouteFallback } from './components/ui/RouteFallback';
import { InstallAppBanner } from './components/pwa/InstallAppBanner';
import { useAutoArchive } from './hooks/useAutoArchive';
import { useCrossTabSync } from './hooks/useCrossTabSync';
import { useBookingSync } from './hooks/useBookingSync';
import { useServicesSync } from './hooks/useServicesSync';
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
  // Loads bookings from the cloud/local repository and keeps every device/tab in sync.
  useBookingSync();
  // Prices come from the database — the same rows Pix charges from — not from this device.
  useServicesSync();
  // Bookings are archived against the 22:00 cut-off for as long as the app stays open.
  useAutoArchive();
  // Keeps shop configuration (services, prices, hours) in sync across tabs.
  useCrossTabSync();

  return (
    <>
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

      {/* App-wide install prompt; renders itself only when the browser offers installation. */}
      <InstallAppBanner />
    </>
  );
}

export default App;
