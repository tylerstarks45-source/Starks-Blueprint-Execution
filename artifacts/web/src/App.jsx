
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from 'sonner';

// Context Providers
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { CreditsModalProvider } from '@/contexts/CreditsModalContext.jsx';
import OutOfCreditsModal from '@/components/OutOfCreditsModal.jsx';

// Security Routes
import ProtectedRoute from '@/components/security/ProtectedRoute.jsx';
import ProtectedAdminRoute from '@/components/security/ProtectedAdminRoute.jsx';

// Critical public pages — loaded eagerly so first paint is immediate
import HomePage from '@/pages/HomePage.jsx';
import MarketplacePage from '@/pages/MarketplacePage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import SignupPage from '@/pages/SignupPage.jsx';
import PricingPage from '@/pages/PricingPage.jsx';

// Secondary public pages — deferred until visited
const ProductDetailPage     = lazy(() => import('@/pages/ProductDetailPage.jsx'));
const ToolDetailPage        = lazy(() => import('@/pages/ToolDetailPage.jsx'));
const AboutPage             = lazy(() => import('@/pages/AboutPage.jsx'));
const ContactPage           = lazy(() => import('@/pages/ContactPage.jsx'));
const BlueprintsPage        = lazy(() => import('@/pages/BlueprintsPage.jsx'));
const BlueprintDetailPage   = lazy(() => import('@/pages/BlueprintDetailPage.jsx'));
const HowItWorksPage        = lazy(() => import('@/pages/HowItWorksPage.jsx'));
const BusinessModelPage     = lazy(() => import('@/pages/BusinessModelPage.jsx'));
const ResearchLabPage       = lazy(() => import('@/pages/ResearchLabPage.jsx'));
const WhyTrustUsPage        = lazy(() => import('@/pages/WhyTrustUsPage.jsx'));
const UpdatesPage           = lazy(() => import('@/pages/UpdatesPage.jsx'));
const PasswordResetPage     = lazy(() => import('@/pages/PasswordResetPage.jsx'));
const VerifyEmailPage       = lazy(() => import('@/pages/VerifyEmailPage.jsx'));

// Legal pages — small but never on the critical path
const PrivacyPolicy             = lazy(() => import('@/pages/PrivacyPolicy.jsx'));
const TermsAndConditionsPage    = lazy(() => import('@/pages/TermsAndConditionsPage.jsx'));
const AffiliateDisclosure       = lazy(() => import('@/pages/AffiliateDisclosure.jsx'));
const EarningsDisclaimer        = lazy(() => import('@/pages/EarningsDisclaimer.jsx'));

// Protected user pages — never needed before login
const DashboardPage         = lazy(() => import('@/pages/DashboardPage.jsx'));
const SystemBuilderPage     = lazy(() => import('@/pages/SystemBuilderPage.jsx'));
const BuilderPage           = lazy(() => import('@/pages/BuilderPage.jsx'));
const LibraryPage           = lazy(() => import('@/pages/LibraryPage.jsx'));
const SavedSystemsPage      = lazy(() => import('@/pages/SavedSystemsPage.jsx'));
const BuildPage             = lazy(() => import('@/pages/BuildPage.jsx'));
const UserSystemDetailPage  = lazy(() => import('@/pages/UserSystemDetailPage.jsx'));
const ConnectionsHubPage    = lazy(() => import('@/pages/ConnectionsHubPage.jsx'));
const SystemsListPage       = lazy(() => import('@/pages/SystemsListPage.jsx'));
const MyStackPage           = lazy(() => import('@/pages/MyStackPage.jsx'));
const CreditsPage           = lazy(() => import('@/pages/CreditsPage.jsx'));

// Admin pages — never needed outside admin session
const AdminDashboard        = lazy(() => import('@/pages/AdminDashboard.jsx'));

// Global fetch interceptor — fires sbep:out-of-credits when any API call returns 402
if (typeof window !== 'undefined') {
  const _origFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await _origFetch(...args);
    if (res.status === 402) {
      const clone = res.clone();
      clone.json().then((data) => {
        if (data?.code === 'out_of_credits') {
          window.dispatchEvent(new CustomEvent('sbep:out-of-credits', { detail: data }));
        }
      }).catch(() => {});
    }
    return res;
  };
}

// Redirect /build/:id → /systems/:id (param-based, preserves the id)
const BuildRedirect = () => {
  const { systemInstanceId } = useParams();
  return <Navigate to={`/systems/${systemInstanceId}`} replace />;
};

// Redirect /tools/:id → /marketplace/product/:id (canonical tool-detail URL)
const ToolDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/marketplace/product/${id}`} replace />;
};

const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
    <h1 className="text-7xl font-extrabold text-primary mb-4">404</h1>
    <h2 className="text-3xl font-bold mb-4 text-foreground">Page Not Found</h2>
    <p className="text-xl text-muted-foreground mb-8 max-w-md">
      The page you're looking for doesn't exist, has been moved, or is under construction.
    </p>
    <a href="/" className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 hover:scale-105 transition-all">
      Return to Safety
    </a>
  </div>
);

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <CreditsModalProvider>
          <Helmet>
            <title>Starks Global Group</title>
            <meta name="description" content="Premium AI Tools and Systems" />
          </Helmet>

          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Critical public pages — eager */}
              <Route path="/" element={<HomePage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pricing" element={<PricingPage />} />

              {/* Secondary public pages — lazy */}
              <Route path="/marketplace/product/:productId" element={<ProductDetailPage />} />
              <Route path="/tools/:id" element={<ToolDetailRedirect />} />
              <Route path="/reset-password" element={<PasswordResetPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/blueprints" element={<BlueprintsPage />} />
              <Route path="/blueprints/:slug" element={<BlueprintDetailPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/business-model" element={<BusinessModelPage />} />
              <Route path="/research-lab" element={<ResearchLabPage />} />
              <Route path="/why-trust-us" element={<WhyTrustUsPage />} />
              <Route path="/updates" element={<UpdatesPage />} />

              {/* Legal pages — lazy */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
              <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
              <Route path="/earnings-disclaimer" element={<EarningsDisclaimer />} />

              {/* Protected user routes — requires login; all lazy */}
              <Route path="/dashboard/*" element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
              } />
              <Route path="/user-dashboard" element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
              } />
              <Route path="/system-builder" element={
                <ProtectedRoute><SystemBuilderPage /></ProtectedRoute>
              } />
              <Route path="/saved-systems" element={
                <ProtectedRoute><SavedSystemsPage /></ProtectedRoute>
              } />
              <Route path="/my-stack" element={
                <ProtectedRoute><MyStackPage /></ProtectedRoute>
              } />
              <Route path="/build/:systemInstanceId" element={
                <ProtectedRoute><BuildRedirect /></ProtectedRoute>
              } />
              <Route path="/systems/:id" element={
                <ProtectedRoute><UserSystemDetailPage /></ProtectedRoute>
              } />
              <Route path="/connections" element={
                <ProtectedRoute><ConnectionsHubPage /></ProtectedRoute>
              } />
              <Route path="/systems" element={
                <ProtectedRoute><SystemsListPage /></ProtectedRoute>
              } />
              <Route path="/builder" element={
                <ProtectedRoute><BuilderPage /></ProtectedRoute>
              } />
              <Route path="/library" element={
                <ProtectedRoute><LibraryPage /></ProtectedRoute>
              } />
              <Route path="/credits" element={
                <ProtectedRoute><CreditsPage /></ProtectedRoute>
              } />

              {/* Admin routes — lazy */}
              <Route path="/admin/*" element={
                <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
              } />
              <Route path="/admin-dashboard" element={
                <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
              } />

              {/* Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>

          {/* Global credit exhaustion modal — listens for sbep:out-of-credits events */}
          <OutOfCreditsModal />

          <Toaster position="bottom-right" />
        </CreditsModalProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
