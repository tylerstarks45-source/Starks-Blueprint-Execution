
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from 'sonner';

// Context Providers
import { AuthProvider } from '@/contexts/AuthContext.jsx';

// Security Routes
import ProtectedRoute from '@/components/security/ProtectedRoute.jsx';
import ProtectedAdminRoute from '@/components/security/ProtectedAdminRoute.jsx';

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
import HowItWorksPage from '@/pages/HowItWorksPage.jsx';
import BusinessModelPage from '@/pages/BusinessModelPage.jsx';
import ResearchLabPage from '@/pages/ResearchLabPage.jsx';
import WhyTrustUsPage from '@/pages/WhyTrustUsPage.jsx';
import PrivacyPolicy from '@/pages/PrivacyPolicy.jsx';
import TermsAndConditionsPage from '@/pages/TermsAndConditionsPage.jsx';
import AffiliateDisclosure from '@/pages/AffiliateDisclosure.jsx';
import EarningsDisclaimer from '@/pages/EarningsDisclaimer.jsx';

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
        <Helmet>
          <title>Starks Global Group</title>
          <meta name="description" content="Premium AI Tools and Systems" />
        </Helmet>
        
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/product/:productId" element={<ProductDetailPage />} />
          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blueprints" element={<BlueprintsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/business-model" element={<BusinessModelPage />} />
          <Route path="/research-lab" element={<ResearchLabPage />} />
          <Route path="/why-trust-us" element={<WhyTrustUsPage />} />
          
          {/* Legal Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
          <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
          <Route path="/earnings-disclaimer" element={<EarningsDisclaimer />} />

          {/* Protected User Dashboard Routes 
              Notice the trailing /* which is crucial for DashboardRouter to handle nested paths like /dashboard/ai-feed */}
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          {/* Protected Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } />

          {/* Catch-all Route - Renders 404 instead of a redirect loop */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        
        <Toaster position="bottom-right" />
      </AuthProvider>
    </Router>
  );
};

export default App;
