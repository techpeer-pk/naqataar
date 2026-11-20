import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusyProvider } from './context/BusyContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import Navbar from './components/shared/Navbar';
import Footer from './components/shared/Footer';
import BottomNav from './components/shared/BottomNav';
import PWAInstallPrompt from './components/shared/PWAInstallPrompt';
import NotificationPermissionPrompt from './components/shared/NotificationPermissionPrompt';
import ScrollToTop from './components/shared/ScrollToTop';
import ShutdownScreen from './components/shared/ShutdownScreen';
import AppTour from './components/shared/AppTour';
import { useForegroundMessages } from './hooks/useForegroundMessages';
import { usePwaUpdateNotice } from './hooks/usePwaUpdateNotice';
import { usePwaPushRegistration } from './hooks/usePwaPushRegistration';
import { useIsMobile } from './hooks/useIsMobile';
import { useAppShutdown } from './hooks/useAppShutdown';

// Naqatar = QuFree's clinic module only: customer booking flow + clinic-owner
// admin. QuFree's SuperAdmin / CSR / Ops / QunjeeEats / hotel / Nayasaa /
// Rasoomat / HealthCare / Gamify / find-business routes are not part of this
// app (they stay on qufree.web.app, same backend).
//
// Customer paths keep QuFree's /index/... prefix on purpose: Cloud Functions
// (owned by K:\QuFree\app_OLD, not changed by Naqatar) send push
// notifications with url '/index/my-appointments', and EmailJS templates
// link the same paths.

// Pulls in the Realtime Database SDK (firebase/database). Lazy so an
// anonymous visitor just browsing never pays for it.
const SupportChatWidget = lazy(() => import('./components/shared/SupportChatWidget'));

// Customer pages
import FindBusinessPage    from './pages/public/FindBusinessPage';
import ClinicHomePage      from './pages/public/ClinicHomePage';
import BusinessPage        from './pages/public/BusinessPage';
import BookingPage         from './pages/public/BookingPage';
import ConfirmationPage    from './pages/public/ConfirmationPage';
import MyAppointmentsPage  from './pages/public/MyAppointmentsPage';
import LoginPage           from './pages/public/LoginPage';
import CustomerRegister    from './pages/public/CustomerRegister';
import CustomerProfilePage from './pages/public/CustomerProfilePage';
import NotificationsPage   from './pages/public/NotificationsPage';

// Legal pages — rarely visited, lazy so they stay out of the booking bundle
const TermsPage   = lazy(() => import('./pages/public/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));

// Clinic admin pages
import AdminRegister     from './pages/admin/AdminRegister';
import Dashboard         from './pages/admin/Dashboard';
import AppointmentsPage  from './pages/admin/AppointmentsPage';
import ServicesPage      from './pages/admin/ServicesPage';
import ProfilePage       from './pages/admin/ProfilePage';
import AdminInvoicesPage from './pages/admin/InvoicesPage';

import './styles/global.css';

const Loading = () => <div className="loading-screen"><div className="spinner" /></div>;

const HIDE_SHELL_EXACT  = ['/index/login', '/index/register', '/admin/login', '/admin/register'];
const HIDE_FOOTER_PATHS = ['/index/booking', '/admin'];

function AppLayout() {
  const { pathname } = useLocation();
  const { user, isCsr, isSuperAdmin } = useAuth();
  const hideShell  = HIDE_SHELL_EXACT.includes(pathname);
  const hideFooter = hideShell || HIDE_FOOTER_PATHS.some(p => pathname.startsWith(p));
  // BottomNav on every customer page; staff (clinic admin) pages use the
  // top Navbar only. Admin login/register keep it, same as QuFree.
  const isAdminPath   = pathname.startsWith('/admin');
  const showBottomNav = pathname === '/admin/login' || pathname === '/admin/register' || !isAdminPath;
  // Dock the chat trigger into the bar only when the bar is on screen
  // (mobile width) — on desktop the bar is CSS-hidden.
  const isMobile   = useIsMobile(990);
  const chatDocked = showBottomNav && isMobile;

  useForegroundMessages();
  usePwaUpdateNotice();
  usePwaPushRegistration();
  const isShutdown = useAppShutdown();

  // One hit per app load (shared QuFree visitor counter, RTDB). Dynamic
  // import keeps firebase/database out of the main bundle.
  useEffect(() => {
    import('./hooks/useVisitorCounter').then((m) => m.recordVisit());
  }, []);

  // Presence for QuFree SuperAdmin's online/offline dot (same backend).
  useEffect(() => {
    if (!user || isSuperAdmin) return;
    let cleanup;
    const basePath = isCsr ? 'csrStatus' : 'status';
    import('./hooks/usePresence').then((m) => { cleanup = m.trackPresence(user.uid, basePath); });
    return () => cleanup?.();
  }, [user?.uid, isCsr, isSuperAdmin]);

  // config/appStatus shutdown (toggled by QuFree SuperAdmin in the Console)
  // locks this app too — same backend.
  if (isShutdown) {
    return <ShutdownScreen />;
  }

  return (
    <>
      <ScrollToTop />
      {!hideShell && <Navbar />}
      <main className={showBottomNav ? 'has-bottom-nav' : ''}>
      <Routes>
        {/* Customer */}
        {/* "/" = QuFree's find-a-business-by-number page (as-is). */}
        <Route path="/"                             element={<FindBusinessPage />} />
        {/* Clinic list with Medical/Aesthetic tabs (was "/" in P2). */}
        <Route path="/clinics"                      element={<ClinicHomePage />} />
        <Route path="/index/business/:id"           element={<BusinessPage />} />
        <Route path="/index/login"                  element={<LoginPage />} />
        <Route path="/index/register"               element={<CustomerRegister />} />
        <Route path="/index/booking/:businessId"    element={<BookingPage />} />
        <Route path="/index/confirm"                element={<ConfirmationPage />} />
        <Route path="/index/my-appointments"        element={<MyAppointmentsPage />} />
        <Route path="/index/profile"                element={<CustomerProfilePage />} />
        <Route path="/index/notifications"          element={<NotificationsPage />} />
        <Route path="/terms"   element={<Suspense fallback={<Loading />}><TermsPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<Loading />}><PrivacyPage /></Suspense>} />

        {/* QuFree home URLs → find-business home */}
        <Route path="/index"         element={<Navigate to="/" replace />} />
        <Route path="/find-business" element={<Navigate to="/" replace />} />

        {/* Clinic admin — auth */}
        <Route path="/admin"          element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login"    element={<LoginPage />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* Clinic admin — protected */}
        <Route path="/admin/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
        <Route path="/admin/services"     element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
        <Route path="/admin/profile"      element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin/invoices"     element={<ProtectedRoute><AdminInvoicesPage /></ProtectedRoute>} />

        {/* Anything else (incl. QuFree-only URLs) → clinic home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </main>

      {!hideFooter && <Footer hasBottomNav={showBottomNav} />}
      <BottomNav showChatTab={chatDocked} visible={showBottomNav} />
      <AppTour />
      <NotificationPermissionPrompt />
      <div className={showBottomNav ? 'shell-has-bottom-nav' : ''}>
        <PWAInstallPrompt />
        {(chatDocked || isAdminPath) && (
          <Suspense fallback={null}>
            <SupportChatWidget docked={chatDocked} />
          </Suspense>
        )}
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          className: 'toast-custom',
          style: {
            background: '#fff',
            color: '#1A2E35',
            border: '1px solid #EAEAEA',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#065F46', secondary: '#fff' } },
          error:   { duration: 5000, iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <BusyProvider>
    <AuthProvider>
      {/* BusinessPage / ConfirmationPage still import useCart (QuFree's
          dine-in pre-order). Unused for clinics; kept so they render. */}
      <CartProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </BusyProvider>
  );
}
