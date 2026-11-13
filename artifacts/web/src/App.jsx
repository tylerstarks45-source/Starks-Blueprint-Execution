
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from 'sonner';

// Context Providers
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { CreditsModalProvider } from '@/contexts/CreditsModalContext.jsx';
import { ClientProvider } from '@/contexts/ClientContext.jsx';
import { BusinessProvider } from '@/contexts/BusinessContext.jsx';
import { WhiteLabelProvider, useWhiteLabel } from '@/contexts/WhiteLabelContext.jsx';
import OutOfCreditsModal from '@/components/OutOfCreditsModal.jsx';
import AshDock from '@/components/ash/AshDock.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';

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
const PublicLandingPage      = lazy(() => import('@/pages/PublicLandingPage.jsx'));
const ProductDetailPage     = lazy(() => import('@/pages/ProductDetailPage.jsx'));
const ToolDetailPage        = lazy(() => import('@/pages/ToolDetailPage.jsx'));
const AboutPage             = lazy(() => import('@/pages/AboutPage.jsx'));
const ContactPage           = lazy(() => import('@/pages/ContactPage.jsx'));
const BlueprintsPage        = lazy(() => import('@/pages/BlueprintsPage.jsx'));
const BlueprintDetailPage   = lazy(() => import('@/pages/BlueprintDetailPage.jsx'));
const BlueprintSubmitPage   = lazy(() => import('@/pages/BlueprintSubmitPage.jsx'));
const HowItWorksPage        = lazy(() => import('@/pages/HowItWorksPage.jsx'));
const BusinessModelPage     = lazy(() => import('@/pages/BusinessModelPage.jsx'));
const ResearchLabPage       = lazy(() => import('@/pages/ResearchLabPage.jsx'));
const DeveloperPage         = lazy(() => import('@/pages/DeveloperPage.jsx'));
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
const SystemLogsPage        = lazy(() => import('@/pages/SystemLogsPage.jsx'));
const BusinessLogsPage      = lazy(() => import('@/pages/BusinessLogsPage.jsx'));
const ConnectionsHubPage    = lazy(() => import('@/pages/ConnectionsHubPage.jsx'));
const SocialAccountsPage    = lazy(() => import('@/pages/SocialAccountsPage.jsx'));
const SocialCalendarPage    = lazy(() => import('@/pages/SocialCalendarPage.jsx'));
const SystemsListPage       = lazy(() => import('@/pages/SystemsListPage.jsx'));
const MyStackPage           = lazy(() => import('@/pages/MyStackPage.jsx'));
const DomainsPage           = lazy(() => import('@/pages/DomainsPage.jsx'));
const BusinessPortfolioPage     = lazy(() => import('@/pages/BusinessPortfolioPage.jsx'));
const BusinessImportWizardPage  = lazy(() => import('@/pages/BusinessImportWizardPage.jsx'));
const BusinessCommandCenterPage = lazy(() => import('@/pages/BusinessCommandCenterPage.jsx'));
const CreditsPage           = lazy(() => import('@/pages/CreditsPage.jsx'));
const WorkspacePage         = lazy(() => import('@/pages/WorkspacePage.jsx'));
const MemoryPage            = lazy(() => import('@/pages/MemoryPage.jsx'));
const AshIntelligencePage   = lazy(() => import('@/pages/AshIntelligencePage.jsx'));
const AshBrainPage          = lazy(() => import('@/pages/AshBrainPage.jsx'));
const StatsPage             = lazy(() => import('@/pages/StatsPage.jsx'));
const AshGuidePage          = lazy(() => import('@/pages/AshGuidePage.jsx'));
const EmpirePage            = lazy(() => import('@/pages/EmpirePage.jsx'));
const IncomeStreamsPage     = lazy(() => import('@/pages/IncomeStreamsPage.jsx'));
const AssetVaultPage        = lazy(() => import('@/pages/AssetVaultPage.jsx'));
const BusinessTypesPage     = lazy(() => import('@/pages/BusinessTypesPage.jsx'));
const LandingPagesPage      = lazy(() => import('@/pages/LandingPagesPage.jsx'));
const UserLandingPageCanvas = lazy(() => import('@/pages/UserLandingPageCanvas.jsx'));
const AffiliateLinkManagerPage = lazy(() => import('@/pages/AffiliateLinkManagerPage.jsx'));
const EmailMarketingPage    = lazy(() => import('@/pages/EmailMarketingPage.jsx'));
const ReferPage             = lazy(() => import('@/pages/ReferPage.jsx'));
const ClientsPage           = lazy(() => import('@/pages/ClientsPage.jsx'));
const ClientPortalPage      = lazy(() => import('@/pages/ClientPortalPage.jsx'));
const RefPage               = lazy(() => import('@/pages/RefPage.jsx'));
const AnalyticsPage         = lazy(() => import('@/pages/AnalyticsPage.jsx'));

// Subscribe success/cancel pages
const SubscribeSuccessPage  = lazy(() => import('@/pages/SubscribeSuccessPage.jsx'));
const SubscribeCancelPage   = lazy(() => import('@/pages/SubscribeCancelPage.jsx'));

// Leaderboard page (public)
const LeaderboardPage       = lazy(() => import('@/pages/LeaderboardPage.jsx'));

// Media Studio page
const MediaGenPage          = lazy(() => import('@/pages/MediaGenPage.jsx'));

// Settings page
const UserSettingsPage      = lazy(() => import('@/pages/UserSettingsPage.jsx'));

// Activity log page
const UserLogsPage          = lazy(() => import('@/pages/UserLogsPage.jsx'));

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

// Redirect legacy /business-portfolio/:id → /business/:id (command center)
const BusinessDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/business/${id}`} replace />;
};

const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
    <h1 className="text-7xl font-extrabold text-primary mb-4">404</h1>
    <h2 className="text-3xl font-bold mb-4 text-foreground">Page Not Found</h2>
    <p className="text-xl text-muted-foreground mb-8 max-w-md">
      The page you're looking for doesn't exist, has been moved, or is under construction.
    </p>
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <a href="/" className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 hover:scale-105 transition-all">
        Return home
      </a>
      <a href="/dashboard" className="px-8 py-3 border border-border font-semibold rounded-lg text-foreground hover:bg-muted/30 transition-all">
        Go to dashboard
      </a>
      <a href="/blueprints" className="px-8 py-3 border border-border font-semibold rounded-lg text-foreground hover:bg-muted/30 transition-all">
        Browse blueprints
      </a>
    </div>
  </div>
);

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Renders the page <title> via Helmet.  When a white-label config is active,
 * we use the agency brand name so Helmet-managed rerenders never revert it
 * back to the platform name.
 */
const WhiteLabelHelmet = () => {
  const { config } = useWhiteLabel();
  const title = config?.brandName
    ? `${config.brandName}`
    : 'Starks Global Group — Build. Launch. Run. Scale. With ASH AI.';
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content="The AI Business Operating System for entrepreneurs. Select a blueprint, connect your tools, and let ASH AI build and run your automated income systems from one powerful dashboard." />
    </Helmet>
  );
};

const App = () => {
  return (
    <WhiteLabelProvider>
    <Router>
      <AuthProvider>
        <ClientProvider>
        <BusinessProvider>
        <CreditsModalProvider>
          <WhiteLabelHelmet />

          <ErrorBoundary>
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
              <Route path="/blueprints/submit" element={<BlueprintSubmitPage />} />
              <Route path="/blueprints/:slug" element={<BlueprintDetailPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/business-model" element={<BusinessModelPage />} />
              <Route path="/research-lab" element={<ResearchLabPage />} />
              <Route path="/developer" element={<DeveloperPage />} />
              <Route path="/why-trust-us" element={<WhyTrustUsPage />} />
              <Route path="/updates" element={<UpdatesPage />} />

              {/* Legal pages — lazy */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
              <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
              <Route path="/earnings-disclaimer" element={<EarningsDisclaimer />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/subscribe/success" element={<SubscribeSuccessPage />} />
              <Route path="/subscribe/cancel" element={<SubscribeCancelPage />} />

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
              <Route path="/domains" element={
                <ProtectedRoute><DomainsPage /></ProtectedRoute>
              } />
              <Route path="/build/:systemInstanceId" element={
                <ProtectedRoute><BuildRedirect /></ProtectedRoute>
              } />
              <Route path="/systems/:id" element={
                <ProtectedRoute><UserSystemDetailPage /></ProtectedRoute>
              } />
              <Route path="/systems/:id/logs" element={
                <ProtectedRoute><SystemLogsPage /></ProtectedRoute>
              } />
              <Route path="/connections" element={
                <ProtectedRoute><ConnectionsHubPage /></ProtectedRoute>
              } />
              <Route path="/social-accounts" element={
                <ProtectedRoute><SocialAccountsPage /></ProtectedRoute>
              } />
              <Route path="/social" element={
                <ProtectedRoute><SocialCalendarPage /></ProtectedRoute>
              } />
              <Route path="/systems" element={
                <ProtectedRoute><SystemsListPage /></ProtectedRoute>
              } />
              <Route path="/business-portfolio" element={
                <ProtectedRoute><BusinessPortfolioPage /></ProtectedRoute>
              } />
              <Route path="/business-portfolio/:id" element={<BusinessDetailRedirect />} />
              <Route path="/business/:id" element={
                <ProtectedRoute><BusinessCommandCenterPage /></ProtectedRoute>
              } />
              <Route path="/business/:id/logs" element={
                <ProtectedRoute><BusinessLogsPage /></ProtectedRoute>
              } />
              <Route path="/business-import" element={
                <ProtectedRoute><BusinessImportWizardPage /></ProtectedRoute>
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
              <Route path="/workspace" element={
                <ProtectedRoute><WorkspacePage /></ProtectedRoute>
              } />
              <Route path="/media" element={
                <ProtectedRoute><MediaGenPage /></ProtectedRoute>
              } />
              <Route path="/memory" element={
                <ProtectedRoute><MemoryPage /></ProtectedRoute>
              } />
              <Route path="/ash-intelligence" element={
                <ProtectedRoute><AshIntelligencePage /></ProtectedRoute>
              } />
              <Route path="/ash-brain" element={
                <ProtectedRoute><AshBrainPage /></ProtectedRoute>
              } />
              <Route path="/stats" element={
                <ProtectedRoute><StatsPage /></ProtectedRoute>
              } />
              <Route path="/ash-guide" element={
                <ProtectedRoute><AshGuidePage /></ProtectedRoute>
              } />
              <Route path="/empire" element={
                <ProtectedRoute><EmpirePage /></ProtectedRoute>
              } />
              <Route path="/income-streams" element={
                <ProtectedRoute><IncomeStreamsPage /></ProtectedRoute>
              } />
              <Route path="/asset-vault" element={
                <ProtectedRoute><AssetVaultPage /></ProtectedRoute>
              } />
              <Route path="/business-types" element={
                <ProtectedRoute><BusinessTypesPage /></ProtectedRoute>
              } />
              <Route path="/landing-pages" element={
                <ProtectedRoute><LandingPagesPage /></ProtectedRoute>
              } />
              <Route path="/landing-pages/:id/canvas" element={
                <ProtectedRoute><UserLandingPageCanvas /></ProtectedRoute>
              } />
              <Route path="/affiliate-links" element={
                <ProtectedRoute><AffiliateLinkManagerPage /></ProtectedRoute>
              } />
              <Route path="/email-marketing" element={
                <ProtectedRoute><EmailMarketingPage /></ProtectedRoute>
              } />
              <Route path="/refer" element={
                <ProtectedRoute><ReferPage /></ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute><ClientsPage /></ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
              } />
              <Route path="/logs" element={
                <ProtectedRoute><UserLogsPage /></ProtectedRoute>
              } />
              {/* Public landing pages — no auth, no chrome */}
              <Route path="/p/:username/:slug" element={<PublicLandingPage />} />

              <Route path="/ref/:code" element={<RefPage />} />
              <Route path="/portal/:token" element={<ClientPortalPage />} />

              <Route path="/settings" element={
                <ProtectedRoute><UserSettingsPage /></ProtectedRoute>
              } />
              <Route path="/settings/branding" element={
                <ProtectedRoute><UserSettingsPage defaultTab="branding" /></ProtectedRoute>
              } />
              <Route path="/settings/developer" element={
                <ProtectedRoute><UserSettingsPage defaultTab="developer" /></ProtectedRoute>
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
          </ErrorBoundary>

          {/* Global credit exhaustion modal — listens for sbep:out-of-credits events */}
          <OutOfCreditsModal />
          <AshDock />

          <Toaster position="bottom-right" />
        </CreditsModalProvider>
        </BusinessProvider>
        </ClientProvider>
      </AuthProvider>
    </Router>
    </WhiteLabelProvider>
  );
};

export default App;
