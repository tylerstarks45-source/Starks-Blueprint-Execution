import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, Zap } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';
import Header from '@/components/Header.jsx';

export default function SubscribeCancelPage() {
  return (
    <VideoBackground>
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-white/20 mb-8">
            <XCircle className="w-9 h-9 text-white/40" />
          </div>

          <h1 className="text-4xl font-bold font-mono mb-3 text-white">
            No worries.
          </h1>
          <p className="text-white/50 text-lg mb-4">
            You can upgrade any time — your account and current plan are unchanged.
          </p>
          <p className="text-white/30 text-sm mb-10">
            When you're ready, head to Pricing and choose the plan that fits your goals.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/25"
            >
              <Zap className="w-4 h-4" />
              View Plans
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </main>
    </VideoBackground>
  );
}
