
import React from 'react';
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
import SubscriptionGate from '@/components/security/SubscriptionGate.jsx';

// Pages
import HomePage from '@/pages/HomePage.jsx';
import MarketplacePage from '@/pages/MarketplacePage.jsx';
import ProductDetailPage from '@/pages/ProductDetailPage.jsx';
import DashboardPage from '@/pages/DashboardPage.jsx';
import AdminDashboard from '@/pages/AdminDashboard.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import SignupPage from '@/pages/SignupPage.jsx';
import AboutPage from '@/pages/AboutPage.jsx';
import ContactPage from '@/pages/ContactPage.jsx';
import BlueprintsPage from '@/pages/BlueprintsPage.jsx';
import BlueprintDetailPage from '@/pages/BlueprintDetailPage.jsx';
import HowItWorksPage from '@/pages/HowItWorksPage.jsx';
import BusinessModelPage from '@/pages/BusinessModelPage.jsx';
import ResearchLabPage from '@/pages/ResearchLabPage.jsx';
import WhyTrustUsPage from '@/pages/WhyTrustUsPage.jsx';
import PrivacyPolicy from '@/pages/PrivacyPolicy.jsx';
import TermsAndConditionsPage from '@/pages/TermsAndConditionsPage.jsx';
import AffiliateDisclosure from '@/pages/AffiliateDisclosure.jsx';
import EarningsDisclaimer from '@/pages/EarningsDisclaimer.jsx';
import SystemBuilderPage from '@/pages/SystemBuilderPage.jsx';
import BuilderPage from '@/pages/BuilderPage.jsx';
import SavedSystemsPage from '@/pages/SavedSystemsPage.jsx';
import BuildPage from '@/pages/BuildPage.jsx';
import UserSystemDetailPage from '@/pages/UserSystemDetailPage.jsx';
import ConnectionsHubPage from '@/pages/ConnectionsHubPage.jsx';
import PricingPage from '@/pages/PricingPage.jsx';
import ToolDetailPage from '@/pages/ToolDetailPage.jsx';
import MyStackPage from '@/pages/MyStackPage.jsx';
import UpdatesPage from '@/pages/UpdatesPage.jsx';
import PasswordResetPage from '@/pages/PasswordResetPage.jsx';
import VerifyEmailPage from '@/pages/VerifyEmailPage.jsx';
import SystemsListPage from '@/pages/SystemsListPage.jsx';
import CreditsPage from '@/pages/CreditsPage.jsx';

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

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <CreditsModalProvider>
          <Helmet>
            <title>Starks Global Group</title>
            <meta name="description" content="Premium AI Tools and Systems" />
          </Helmet>

          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/product/:productId" element={<ProductDetailPage />} />
            <Route path="/tools/:id" element={<ToolDetailPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
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

            {/* Legal Pages */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
            <Route path="/earnings-disclaimer" element={<EarningsDisclaimer />} />

            {/* Protected User Routes — requires login + active subscription */}
            <Route path="/dashboard/*" element={
              <ProtectedRoute><SubscriptionGate><DashboardPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/user-dashboard" element={
              <ProtectedRoute><SubscriptionGate><DashboardPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/system-builder" element={
              <ProtectedRoute><SubscriptionGate><SystemBuilderPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/saved-systems" element={
              <ProtectedRoute><SubscriptionGate><SavedSystemsPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/my-stack" element={
              <ProtectedRoute><SubscriptionGate><MyStackPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/build/:systemInstanceId" element={
              <ProtectedRoute><SubscriptionGate><BuildRedirect /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/systems/:id" element={
              <ProtectedRoute><SubscriptionGate><UserSystemDetailPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/connections" element={
              <ProtectedRoute><SubscriptionGate><ConnectionsHubPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/systems" element={
              <ProtectedRoute><SubscriptionGate><SystemsListPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/builder" element={
              <ProtectedRoute><SubscriptionGate><BuilderPage /></SubscriptionGate></ProtectedRoute>
            } />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/credits" element={
              <ProtectedRoute><SubscriptionGate><CreditsPage /></SubscriptionGate></ProtectedRoute>
            } />

            {/* Protected Admin Routes */}
            <Route path="/admin/*" element={
              <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
            } />
            <Route path="/admin-dashboard" element={
              <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
            } />

            {/* Catch-all Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>

          {/* Global credit exhaustion modal — listens for sbep:out-of-credits events */}
          <OutOfCreditsModal />

          <Toaster position="bottom-right" />
        </CreditsModalProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
