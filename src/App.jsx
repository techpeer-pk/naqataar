import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { SuperProtectedRoute } from './components/shared/SuperProtectedRoute';
import { EatsAdminProtectedRoute } from './components/shared/EatsAdminProtectedRoute';
import { CsrProtectedRoute } from './components/shared/CsrProtectedRoute';
import { OpsProtectedRoute } from './components/shared/OpsProtectedRoute';
import Navbar from './components/shared/Navbar';
import Footer from './components/shared/Footer';
import BottomNav from './components/shared/BottomNav';
import PWAInstallPrompt from './components/shared/PWAInstallPrompt';
import NotificationPermissionPrompt from './components/shared/NotificationPermissionPrompt';
import ScrollToTop from './components/shared/ScrollToTop';
import ShutdownScreen from './components/shared/ShutdownScreen';
import { useForegroundMessages } from './hooks/useForegroundMessages';
import { usePwaUpdateNotice } from './hooks/usePwaUpdateNotice';
import { usePwaPushRegistration } from './hooks/usePwaPushRegistration';
import { useIsMobile } from './hooks/useIsMobile';
import { useAppShutdown } from './hooks/useAppShutdown';

// Pulls in the Realtime Database SDK (firebase/database) — the one product
// in this app that isn't Firestore. Lazy so an anonymous visitor just
// browsing never pays for it; it only matters once someone eligible
// (Customer/Business Admin) is actually signed in.
const SupportChatWidget = lazy(() => import('./components/shared/SupportChatWidget'));

// Public pages
import HomePage           from './pages/public/HomePage';
// Disabled 2026-11-17 — "/" and "/index" now redirect to /find-business (see routes below).
// import HomePageV2         from './pages/public/HomePageV2';
import CategoryActionsPage from './pages/public/CategoryActionsPage';
import LandingPage        from './pages/public/LandingPage';
import BusinessPage       from './pages/public/BusinessPage';
import BookingPage        from './pages/public/BookingPage';
import HotelListingPage   from './pages/public/HotelListingPage';
import HotelBookingPage   from './pages/public/HotelBookingPage';
import RestaurantListingPage from './pages/public/RestaurantListingPage';
import ConfirmationPage   from './pages/public/ConfirmationPage';
import MyAppointmentsPage from './pages/public/MyAppointmentsPage';
import LoginPage          from './pages/public/LoginPage';
import CustomerRegister   from './pages/public/CustomerRegister';
import CustomerProfilePage from './pages/public/CustomerProfilePage';
import NotificationsPage from './pages/public/NotificationsPage';
import FindBusinessPage  from './pages/public/FindBusinessPage';

// Legal pages — rarely visited, lazy so they don't add to the core booking-flow bundle
const TermsPage         = lazy(() => import('./pages/public/TermsPage'));
const PrivacyPage       = lazy(() => import('./pages/public/PrivacyPage'));
const DocumentationPage = lazy(() => import('./pages/public/DocumentationPage'));

// Gamify — prototype "3 doors, 1 key" daily reveal, lazy for the same reason
const GamifyPage = lazy(() => import('./pages/public/GamifyPage'));

// HealthCare (Firestore business type stays 'sehatkamla', brand name is
// "HealthCare" — see CLAUDE.md) — category-grid + multi-vendor listing,
// same isolation reasoning as the legal pages
const HealthCarePage         = lazy(() => import('./pages/public/HealthCarePage'));
const HealthCareCategoryPage = lazy(() => import('./pages/public/HealthCareCategoryPage'));

// Nayasaa — category-grid + multi-vendor listing (same shape as SehatKamla),
// plus its own forked booking page (see NayasaaBookingPage.jsx header comment
// for why it isn't the shared HotelBookingPage).
const NayasaaPage         = lazy(() => import('./pages/public/NayasaaPage'));
const NayasaaCategoryPage = lazy(() => import('./pages/public/NayasaaCategoryPage'));
const NayasaaBookingPage  = lazy(() => import('./pages/public/NayasaaBookingPage'));

// Rasoomat (photography/videography) — category-grid + multi-vendor listing,
// same shape as SehatKamla. Plain appointment-slot booking (not a pool
// type), so it rides the existing generic BookingPage — no fork needed.
const RasoomatPage         = lazy(() => import('./pages/public/RasoomatPage'));
const RasoomatCategoryPage = lazy(() => import('./pages/public/RasoomatCategoryPage'));

// Beach Huts — 3rd room-pool type (see BeachHutsBookingPage.jsx header
// comment). No dedicated listing page of its own — browsed via the generic
// /index/browse?type=beachhuts (Entertainment category tile), only the
// booking page is a fork.
const BeachHutsBookingPage = lazy(() => import('./pages/public/BeachHutsBookingPage'));

// Admin pages
import AdminRegister from './pages/admin/AdminRegister';
import Dashboard     from './pages/admin/Dashboard';
import AppointmentsPage from './pages/admin/AppointmentsPage';
import RoomsPage     from './pages/admin/RoomsPage';
import ServicesPage  from './pages/admin/ServicesPage';
import ProfilePage   from './pages/admin/ProfilePage';
import AdminInvoicesPage from './pages/admin/InvoicesPage';

import './styles/global.css';

// SuperAdmin pages — lazy-loaded: recharts + this whole subtree is only ever
// needed by the handful of people who open /superadmin, not the booking flow
// every customer hits, so it code-splits into its own chunk.
const SuperAdminLayout          = lazy(() => import('./components/superadmin/SuperAdminLayout'));
const SuperAdminLogin           = lazy(() => import('./pages/superadmin/SuperAdminLogin'));
const SuperAdminOverview        = lazy(() => import('./pages/superadmin/OverviewPage'));
const SuperAdminUsers           = lazy(() => import('./pages/superadmin/UsersPage'));
const SuperAdminBusinesses      = lazy(() => import('./pages/superadmin/BusinessesPage'));
const SuperAdminBusinessDetail  = lazy(() => import('./pages/superadmin/BusinessDetailPage'));
const SuperAdminAppointments    = lazy(() => import('./pages/superadmin/AppointmentsPage'));
const SuperAdminReservations    = lazy(() => import('./pages/superadmin/ReservationsPage'));
const SuperAdminInvoices        = lazy(() => import('./pages/superadmin/InvoicesPage'));
const SuperAdminReports         = lazy(() => import('./pages/superadmin/ReportsPage'));
const SuperAdminActivityLog     = lazy(() => import('./pages/superadmin/ActivityLogPage'));
const SuperAdminSessionLogs     = lazy(() => import('./pages/superadmin/SessionLogsPage'));
const SuperAdminCsrActivity     = lazy(() => import('./pages/superadmin/CsrActivityLogPage'));
const SuperAdminProfile         = lazy(() => import('./pages/superadmin/ProfilePage'));
const SuperAdminOrders          = lazy(() => import('./pages/superadmin/OrdersPage'));
const SuperAdminFaqs            = lazy(() => import('./pages/superadmin/FaqsPage'));
const SuperAdminPushCampaigns   = lazy(() => import('./pages/superadmin/PushCampaignsPage'));
const SuperAdminAdManagement    = lazy(() => import('./pages/superadmin/AdManagementPage'));
const SuperAdminGamifySettings  = lazy(() => import('./pages/superadmin/GamifySettingsPage'));

// QunjeeEats — customer storefront + Ops console, all lazy: the booking flow
// never pays for the food-ordering chunk and vice versa.
const EatsHomePage          = lazy(() => import('./pages/public/eats/EatsHomePage'));
const EatsBusinessPage      = lazy(() => import('./pages/public/eats/EatsBusinessPage'));
const PreFoodOrderPage      = lazy(() => import('./pages/public/eats/PreFoodOrderPage'));
const EatsCartPage          = lazy(() => import('./pages/public/eats/CartPage'));
const EatsCheckoutPage      = lazy(() => import('./pages/public/eats/CheckoutPage'));
const EatsOrderConfirmation = lazy(() => import('./pages/public/eats/OrderConfirmationPage'));
const EatsMyOrdersPage      = lazy(() => import('./pages/public/eats/MyOrdersPage'));
const EatsAdminLayout       = lazy(() => import('./components/eatsadmin/EatsAdminLayout'));
const EatsAdminLogin        = lazy(() => import('./pages/eatsadmin/EatsAdminLogin'));
const EatsAdminFoodVends    = lazy(() => import('./pages/eatsadmin/FoodVendsPage'));
const EatsAdminFoodVendMenu = lazy(() => import('./pages/eatsadmin/FoodVendMenuPage'));
const EatsAdminOrders       = lazy(() => import('./pages/eatsadmin/OrdersPage'));

// Owner-managed vendor console (F2) — lazy so the shared eats-admin pages
// they wrap stay out of the main chunk.
const AdminMenuPage   = lazy(() => import('./pages/admin/MenuPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/OrdersPage'));

// CSR (Customer Support) console — same isolation pattern as /eatsadmin.
// See docs/CRM-Support.md.
const CsrLayout           = lazy(() => import('./components/csr/CsrLayout'));
const CsrLogin            = lazy(() => import('./pages/csr/CsrLogin'));
const CsrLookup           = lazy(() => import('./pages/csr/LookupPage'));
const CsrSubjectDetail    = lazy(() => import('./pages/csr/SubjectDetailPage'));
const CsrTicketsQueue     = lazy(() => import('./pages/csr/TicketsQueuePage'));
const CsrTicketDetail     = lazy(() => import('./pages/csr/TicketDetailPage'));
const CsrLiveChat         = lazy(() => import('./pages/csr/LiveChatPage'));
const CsrProfile          = lazy(() => import('./pages/csr/CsrProfilePage'));

// Operations console — same isolation pattern as /superadmin, /eatsadmin,
// /qufreecrm. See docs/Operations-Console.md. Phase A: login + overview
// only; Businesses/Appointments/Reservations/Orders land in Phase B.
const OpsLayout        = lazy(() => import('./components/oprations/OpsLayout'));
const OpsLogin         = lazy(() => import('./pages/oprations/OpsLogin'));
const OpsOverview      = lazy(() => import('./pages/oprations/OverviewPage'));
const OpsBusinesses    = lazy(() => import('./pages/oprations/BusinessesPage'));
const OpsAppointments  = lazy(() => import('./pages/oprations/AppointmentsPage'));
const OpsReservations  = lazy(() => import('./pages/oprations/ReservationsPage'));
const OpsOrders        = lazy(() => import('./pages/oprations/OrdersPage'));

const HIDE_SHELL_EXACT = ['/', '/index', '/index/login', '/index/register', '/admin/login', '/admin/register'];
const HIDE_FOOTER_PATHS = ['/index/booking', '/bookinghotels', '/nayasaa-booking', '/beachhuts-booking', '/admin', '/qunjeeats/cart', '/qunjeeats/checkout', '/pfo', '/gamify'];
const HIDE_SHELL_PATHS = ['/superadmin', '/eatsadmin', '/qufreecrm', '/oprations'];
// Same customer-facing scope BottomNav renders itself for — kept as a single
// source of truth here so main/Footer/PWAInstallPrompt/SupportChatWidget can
// all react to whether the fixed bar is occupying the bottom of the screen.
const BOTTOM_NAV_PATHS = ['/index', '/bookinghotels', '/hotel-booking', '/restaurant-booking', '/qunjeeats', '/healthcare', '/nayasaa', '/rasoomat', '/pfo', '/gamify'];

// Old /sehatkamla/:category links keep working — redirects to the renamed
// /healthcare/:category route while preserving the category param (a plain
// <Navigate> can't interpolate it).
function SehatkamlaCategoryRedirect() {
  const { category } = useParams();
  return <Navigate to={`/healthcare/${category}`} replace />;
}

function AppLayout() {
  const { pathname } = useLocation();
  const { user, isCsr, isSuperAdmin } = useAuth();
  const hideShell  = HIDE_SHELL_EXACT.includes(pathname) || HIDE_SHELL_PATHS.some(p => pathname.startsWith(p));
  const hideFooter = hideShell || HIDE_FOOTER_PATHS.some(p => pathname.startsWith(p));
  // /pfo is a focused dine-in pre-order flow (like checkout) — the support
  // chat bubble would just cover the sticky cart bar there. Deliberately not
  // tied to hideShell — that also covers the home page, which should keep
  // its chat widget.
  const hideChat = pathname.startsWith('/pfo');
  // Floating chat bubble hidden 2026-09-24 on every customer-facing
  // (user-end) page — the chat itself stays reachable there through
  // BottomNav's "Help" tab (docked mode). Staff consoles keep the bubble.
  const STAFF_CHAT_PATHS = ['/admin', '/superadmin', '/eatsadmin', '/qufreecrm', '/oprations'];
  const isStaffPath = STAFF_CHAT_PATHS.some(p => pathname.startsWith(p));
  // "/" is the same HomePage as "/index" (see routes below) but isn't itself
  // prefixed by "/index", so BOTTOM_NAV_PATHS alone would miss it.
  // const showBottomNav = pathname === '/' || pathname === '/admin/login' || pathname === '/admin/register' || BOTTOM_NAV_PATHS.some(p => pathname.startsWith(p));
  // Deny-list since 2026-09-24 (was the BOTTOM_NAV_PATHS allow-list above,
  // which new verticals kept missing, e.g. /beachhuts-booking): BottomNav
  // shows on every customer page except staff consoles and the focused /pfo
  // flow. Single source of truth: BottomNav itself now just takes `visible`.
  // /admin/login + /admin/register keep it, same as before.
  const NO_BOTTOM_NAV_PATHS = ['/admin', '/superadmin', '/eatsadmin', '/qufreecrm', '/oprations', '/pfo'];
  const showBottomNav = pathname === '/admin/login' || pathname === '/admin/register' || !NO_BOTTOM_NAV_PATHS.some(p => pathname.startsWith(p));
  // Only actually dock the chat trigger into the bar once it's visible on
  // screen (mobile width) — on desktop the bar is CSS-hidden even on these
  // same routes, so docking there would strand the chat trigger nowhere.
  const isMobile = useIsMobile(990);
  const chatDocked = showBottomNav && isMobile && !hideChat;

  useForegroundMessages();
  usePwaUpdateNotice();
  usePwaPushRegistration();
  const isShutdown = useAppShutdown();

  // One hit per app load. Dynamically imported so firebase/database only
  // loads after the initial paint, not as part of the main bundle — same
  // reasoning as SupportChatWidget being lazy() above.
  useEffect(() => {
    import('./hooks/useVisitorCounter').then((m) => m.recordVisit());
  }, []);

  // Presence for SuperAdmin's online/offline dot — only real customers and
  // business admins report themselves under status/; SuperAdmin accounts are
  // the same shared auth users (just allowlisted), excluded so they don't
  // show up as "online users" in their own console. CSR accounts ARE tracked,
  // but under a separate csrStatus/ node — SuperAdmin-only login/logout audit
  // (see functions/index.js logCsrSessionOnDisconnect), never mixed into the
  // customer/admin online count.
  useEffect(() => {
    if (!user || isSuperAdmin) return;
    let cleanup;
    const basePath = isCsr ? 'csrStatus' : 'status';
    import('./hooks/usePresence').then((m) => { cleanup = m.trackPresence(user.uid, basePath); });
    return () => cleanup?.();
  }, [user?.uid, isCsr, isSuperAdmin]);

  // SuperAdmin keeps full access during a shutdown (login + console) so they
  // can monitor/investigate while everything else is locked. The toggle
  // itself is Console-only — see config/appStatus in firestore.rules.
  if (isShutdown && !pathname.startsWith('/superadmin')) {
    return <ShutdownScreen />;
  }

  return (
    <>
      <ScrollToTop />
      {!hideShell && <Navbar />}
      <main className={showBottomNav ? 'has-bottom-nav' : ''}>
      <Routes>
        {/* Standalone PWA home — serves the same HomePageV2 design as /index
            (2026-08-31 nav-consistency pass: previously "/" and "/index"
            showed two different category models, and "/" was unreachable
            from any nav link since Navbar's Home always points at /index). */}
        {/* 2026-11-17: "/" and "/index" now land on the business-number
            lookup instead of HomePageV2. */}
        {/* <Route path="/" element={<HomePageV2 />} /> */}
        <Route path="/" element={<Navigate to="/find-business" replace />} />

        {/* Public routes */}
        {/* <Route path="/index"                        element={<HomePageV2 />} /> */}
        <Route path="/index"                        element={<Navigate to="/find-business" replace />} />
        <Route path="/index/business/:id"           element={<BusinessPage />} />
        <Route path="/find-business"                element={<FindBusinessPage />} />

        {/* Re-enabled 2026-11-17 (moved out of the DISABLED block below):
            customer login/account, booking flow, legal pages, gamify. */}
        <Route path="/index/login"                  element={<LoginPage />} />
        <Route path="/index/register"               element={<CustomerRegister />} />
        <Route path="/index/booking/:businessId"    element={<BookingPage />} />
        <Route path="/index/confirm"                element={<ConfirmationPage />} />
        <Route path="/index/my-appointments"        element={<MyAppointmentsPage />} />
        <Route path="/index/profile"               element={<CustomerProfilePage />} />
        <Route path="/index/notifications"         element={<NotificationsPage />} />
        <Route path="/terms" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <TermsPage />
          </Suspense>
        } />
        <Route path="/privacy" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <PrivacyPage />
          </Suspense>
        } />
        <Route path="/gamify" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <GamifyPage />
          </Suspense>
        } />

        {/* DISABLED 2026-11-17 — every other public route is switched off;
            "/", "/index", "/find-business", "/index/business/:id" and the
            re-enabled routes just above stay live. Code kept as-is: change `false` to `true` to re-enable. */}
        {false && (<>
        {/* Temporary: old HomePage design parked here while /index gets the new qunjee.com-style design. */}
        <Route path="/indexTemp"                    element={<HomePage />} />
        <Route path="/index/:category"              element={<CategoryActionsPage />} />
        <Route path="/index/browse"                 element={<LandingPage />} />
        <Route path="/hotel-booking"                element={<HotelListingPage />} />
        <Route path="/bookinghotels/:businessId"    element={<HotelBookingPage />} />
        {/* Separate top-level path (no dedicated /beachhuts listing page to
            nest under) — same pattern as /bookinghotels vs /hotel-booking. */}
        <Route path="/beachhuts-booking/:businessId" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <BeachHutsBookingPage />
          </Suspense>
        } />
        <Route path="/restaurant-booking"           element={<RestaurantListingPage />} />
        <Route path="/documentation" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <DocumentationPage />
          </Suspense>
        } />
        <Route path="/healthcare" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <HealthCarePage />
          </Suspense>
        } />
        <Route path="/healthcare/:category" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <HealthCareCategoryPage />
          </Suspense>
        } />
        {/* Old brand URL — keep working, redirect to the new one */}
        <Route path="/sehatkamla" element={<Navigate to="/healthcare" replace />} />
        <Route path="/sehatkamla/:category" element={<SehatkamlaCategoryRedirect />} />
        <Route path="/nayasaa" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <NayasaaPage />
          </Suspense>
        } />
        <Route path="/nayasaa/:category" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <NayasaaCategoryPage />
          </Suspense>
        } />
        {/* Separate top-level path (not nested under /nayasaa/:category) so
            the booking route can never collide with a category slug —
            same pattern as /bookinghotels vs /hotel-booking. */}
        <Route path="/nayasaa-booking/:businessId" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <NayasaaBookingPage />
          </Suspense>
        } />
        <Route path="/rasoomat" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <RasoomatPage />
          </Suspense>
        } />
        <Route path="/rasoomat/:category" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <RasoomatCategoryPage />
          </Suspense>
        } />
        </>)}
        {/* END DISABLED public routes */}

        {/* Admin auth */}
        <Route path="/admin"          element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login"    element={<LoginPage />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* Admin protected */}
        <Route path="/admin/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
        <Route path="/admin/rooms"        element={<ProtectedRoute><RoomsPage /></ProtectedRoute>} />
        <Route path="/admin/services"     element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
        <Route path="/admin/profile"      element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin/invoices"     element={<ProtectedRoute><AdminInvoicesPage /></ProtectedRoute>} />
        {/* F2 — owner-managed vendors: menu + incoming orders, only useful
            when the business has offersOrdering (pages guard for it) */}
        <Route path="/admin/menu" element={
          <ProtectedRoute>
            <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
              <AdminMenuPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/admin/orders" element={
          <ProtectedRoute>
            <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
              <AdminOrdersPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* SuperAdmin — its own lazy chunk, wrapped once in Suspense */}
        <Route path="/superadmin/login" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <SuperAdminLogin />
          </Suspense>
        } />
        <Route path="/superadmin" element={
          <SuperProtectedRoute>
            <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
              <SuperAdminLayout />
            </Suspense>
          </SuperProtectedRoute>
        }>
          <Route index                    element={<SuperAdminOverview />} />
          <Route path="users"             element={<SuperAdminUsers />} />
          <Route path="businesses"        element={<SuperAdminBusinesses />} />
          <Route path="businesses/:id"    element={<SuperAdminBusinessDetail />} />
          <Route path="appointments"      element={<SuperAdminAppointments />} />
          <Route path="reservations"      element={<SuperAdminReservations />} />
          <Route path="orders"            element={<SuperAdminOrders />} />
          <Route path="invoices"          element={<SuperAdminInvoices />} />
          <Route path="reports"           element={<SuperAdminReports />} />
          <Route path="activity"          element={<SuperAdminActivityLog />} />
          <Route path="sessions"          element={<SuperAdminSessionLogs />} />
          <Route path="csr-activity"      element={<SuperAdminCsrActivity />} />
          <Route path="faqs"              element={<SuperAdminFaqs />} />
          <Route path="push"              element={<SuperAdminPushCampaigns />} />
          <Route path="ads"               element={<SuperAdminAdManagement />} />
          <Route path="gamify"            element={<SuperAdminGamifySettings />} />
          <Route path="profile"           element={<SuperAdminProfile />} />
        </Route>

        {/* DISABLED 2026-11-17 — QunjeeEats storefront + /pfo are public
            routes too, switched off with the rest. Change `false` to `true`
            to re-enable. */}
        {false && (<>
        {/* QunjeeEats storefront — its own lazy chunk */}
        <Route path="/qunjeeats" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <Outlet />
          </Suspense>
        }>
          <Route index                   element={<EatsHomePage />} />
          <Route path="business/:id"     element={<EatsBusinessPage />} />
          <Route path="cart"             element={<EatsCartPage />} />
          <Route path="checkout"         element={<EatsCheckoutPage />} />
          <Route path="confirm"          element={<EatsOrderConfirmation />} />
          <Route path="my-orders"        element={<EatsMyOrdersPage />} />
        </Route>

        {/* Pre-Food Order (PFO) — dine-in pre-order deep link, always tied to
            an appointment via ?appt=. Short top-level path (not nested under
            /qunjeeats) since it's reached from a link, not browsed to. */}
        <Route path="/pfo/:businessId" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <PreFoodOrderPage />
          </Suspense>
        } />
        </>)}
        {/* END DISABLED QunjeeEats routes */}

        {/* QunjeeEats Ops console — same isolation pattern as /superadmin */}
        <Route path="/eatsadmin/login" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <EatsAdminLogin />
          </Suspense>
        } />
        <Route path="/eatsadmin" element={
          <EatsAdminProtectedRoute>
            <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
              <EatsAdminLayout />
            </Suspense>
          </EatsAdminProtectedRoute>
        }>
          <Route index                     element={<EatsAdminFoodVends />} />
          <Route path="foodvends/:id/menu" element={<EatsAdminFoodVendMenu />} />
          <Route path="orders"             element={<EatsAdminOrders />} />
        </Route>

        {/* CSR (Customer Support) console — same isolation pattern as /superadmin */}
        <Route path="/qufreecrm/login" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <CsrLogin />
          </Suspense>
        } />
        <Route path="/qufreecrm" element={
          <CsrProtectedRoute>
            <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
              <CsrLayout />
            </Suspense>
          </CsrProtectedRoute>
        }>
          <Route index                  element={<CsrLookup />} />
          <Route path="subject/:type/:id" element={<CsrSubjectDetail />} />
          <Route path="livechat"        element={<CsrLiveChat />} />
          <Route path="tickets"         element={<CsrTicketsQueue />} />
          <Route path="tickets/:id"     element={<CsrTicketDetail />} />
          <Route path="profile"         element={<CsrProfile />} />
        </Route>

        {/* Operations console — same isolation pattern as /superadmin */}
        <Route path="/oprations/login" element={
          <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
            <OpsLogin />
          </Suspense>
        } />
        <Route path="/oprations" element={
          <OpsProtectedRoute>
            <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
              <OpsLayout />
            </Suspense>
          </OpsProtectedRoute>
        }>
          <Route index                element={<OpsOverview />} />
          <Route path="businesses"    element={<OpsBusinesses />} />
          <Route path="appointments"  element={<OpsAppointments />} />
          <Route path="reservations"  element={<OpsReservations />} />
          <Route path="orders"        element={<OpsOrders />} />
        </Route>

        {/* Unknown URLs land on the in-app browse page. */}
        {/* <Route path="*" element={<Navigate to="/index/browse" replace />} /> */}
        {/* 2026-11-17: /index/browse is disabled above — unknown (and now
            disabled) URLs land on /find-business instead. */}
        <Route path="*" element={<Navigate to="/find-business" replace />} />
      </Routes>
      </main>

      {!hideFooter && <Footer hasBottomNav={showBottomNav} />}
      <BottomNav showChatTab={chatDocked} visible={showBottomNav} />
      <NotificationPermissionPrompt />
      <div className={showBottomNav ? 'shell-has-bottom-nav' : ''}>
        <PWAInstallPrompt />
        {/* {!hideChat && ( */}
        {!hideChat && (chatDocked || isStaffPath) && (
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
            // color: '#1C223F',
            color: '#1A2E35', // 2026-11-17 Qufree text colour
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
    <AuthProvider>
      {/* CartProvider is app-wide (cheap, localStorage-backed) so the booking
          confirmation page can start a dine-in pre-order cart (F1). */}
      <CartProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
