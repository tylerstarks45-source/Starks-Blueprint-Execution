import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout.jsx';
import LogsPanel from '@/components/logs/LogsPanel.jsx';

export default function BusinessLogsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <div className="min-h-screen text-white">
        <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate(`/business/${id}`)}
              className="text-gray-500 hover:text-white transition-colors text-sm font-mono"
            >
              ← Business
            </button>
            <span className="text-white/10">/</span>
            <span className="text-sm font-mono text-gray-400">Logs</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">Activity Logs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Unified event log for this business — every build, deploy, automation, connection, and recovery action.
            </p>
          </div>
          <LogsPanel endpoint={`/api/businesses/${id}/logs`} title="Business Activity Logs" />
        </div>
      </div>
    </AuthLayout>
  );
}
