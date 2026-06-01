import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Cookie Policy | Starks Global Group</title>
      </Helmet>
      <Header />
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-3xl prose prose-invert">
          <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
          <p className="font-bold text-primary mb-8">We do not guarantee results. All systems require effort, testing, and optimization.</p>
          <p>This Cookie Policy explains what Cookies are and how We use them. You should read this policy so You can understand what type of cookies We use, or the information We collect using Cookies and how that information is used.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;