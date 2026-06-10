/**
 * entry-server.jsx — Vite SSR render entry point
 *
 * Used by prerender.mjs at build time to produce route-specific HTML.
 * This file is NEVER loaded in the browser; it only runs in Node.js via
 * vite.ssrLoadModule().
 *
 * All public-facing page imports are EAGER here so renderToString() sees full
 * component trees rather than Suspense spinner fallbacks.
 *
 * The auth context is provided as a guest (isLoading:false, isAuthenticated:false)
 * so public pages render their full content instead of loading skeletons.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';

import { AuthContext } from './contexts/AuthContext.jsx';
import { CreditsModalProvider } from './contexts/CreditsModalContext.jsx';

import HomePage              from './pages/HomePage.jsx';
import MarketplacePage       from './pages/MarketplacePage.jsx';
import PricingPage           from './pages/PricingPage.jsx';
import AboutPage             from './pages/AboutPage.jsx';
import ContactPage           from './pages/ContactPage.jsx';
import BlueprintsPage        from './pages/BlueprintsPage.jsx';
import HowItWorksPage        from './pages/HowItWorksPage.jsx';
import BusinessModelPage     from './pages/BusinessModelPage.jsx';
import ResearchLabPage       from './pages/ResearchLabPage.jsx';
import WhyTrustUsPage        from './pages/WhyTrustUsPage.jsx';
import UpdatesPage           from './pages/UpdatesPage.jsx';
import PrivacyPolicy         from './pages/PrivacyPolicy.jsx';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage.jsx';
import AffiliateDisclosure   from './pages/AffiliateDisclosure.jsx';
import EarningsDisclaimer    from './pages/EarningsDisclaimer.jsx';
import LoginPage             from './pages/LoginPage.jsx';
import SignupPage             from './pages/SignupPage.jsx';
import PasswordResetPage     from './pages/PasswordResetPage.jsx';
import VerifyEmailPage       from './pages/VerifyEmailPage.jsx';

const SSR_AUTH = {
  currentUser: null,
  currentUserRole: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ success: false, error: 'SSR' }),
  signup: async () => ({ success: false, error: 'SSR' }),
  logout: () => {},
  resetPassword: async () => ({ success: false, error: 'SSR' }),
};

export function render(url) {
  try {
    return renderToString(
      <StaticRouter location={url}>
        <AuthContext.Provider value={SSR_AUTH}>
          <CreditsModalProvider>
            <Routes>
              <Route path="/"                     element={<HomePage />} />
              <Route path="/marketplace"           element={<MarketplacePage />} />
              <Route path="/pricing"               element={<PricingPage />} />
              <Route path="/about"                 element={<AboutPage />} />
              <Route path="/contact"               element={<ContactPage />} />
              <Route path="/blueprints"            element={<BlueprintsPage />} />
              <Route path="/how-it-works"          element={<HowItWorksPage />} />
              <Route path="/business-model"        element={<BusinessModelPage />} />
              <Route path="/research-lab"          element={<ResearchLabPage />} />
              <Route path="/why-trust-us"          element={<WhyTrustUsPage />} />
              <Route path="/updates"               element={<UpdatesPage />} />
              <Route path="/privacy-policy"        element={<PrivacyPolicy />} />
              <Route path="/terms-and-conditions"  element={<TermsAndConditionsPage />} />
              <Route path="/affiliate-disclosure"  element={<AffiliateDisclosure />} />
              <Route path="/earnings-disclaimer"   element={<EarningsDisclaimer />} />
              <Route path="/login"                 element={<LoginPage />} />
              <Route path="/signup"                element={<SignupPage />} />
              <Route path="/reset-password"        element={<PasswordResetPage />} />
              <Route path="/verify-email"          element={<VerifyEmailPage />} />
            </Routes>
          </CreditsModalProvider>
        </AuthContext.Provider>
      </StaticRouter>,
    );
  } catch (err) {
    console.error(`[SSR] render failed for ${url}: ${err.message}`);
    return '';
  }
}
