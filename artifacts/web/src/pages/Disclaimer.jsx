import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const Disclaimer = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Disclaimer | Starks Global Group</title>
      </Helmet>
      <Header />
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-3xl prose prose-invert">
          <h1 className="text-4xl font-bold mb-8">Disclaimer</h1>
          <p className="font-bold text-primary mb-8">We do not guarantee results. All systems require effort, testing, and optimization.</p>
          <p>The information contained on the Service is for general information purposes only. The Company assumes no responsibility for errors or omissions in the contents of the Service.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Disclaimer;