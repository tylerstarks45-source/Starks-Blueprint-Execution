import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';
import NotificationBell from '@/components/NotificationBell.jsx';

export default function AuthLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <VideoBackground>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <div
        className={[
          'flex flex-col min-h-screen transition-[margin-left] duration-300 ease-in-out',
          collapsed ? 'lg:ml-16' : 'lg:ml-60',
        ].join(' ')}
      >
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between h-14 px-4 border-b border-white/8 bg-black/60 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/4c35c9e2294c3d0e16fb5ed3a74c5ddc.png"
            alt="SBEP"
            className="h-8 w-auto object-contain"
          />
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </VideoBackground>
  );
}
