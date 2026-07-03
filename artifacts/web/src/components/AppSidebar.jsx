import React, { useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Layers, Bot, Mail, Globe, Link2, Plug, Share2,
  ShoppingBag, BookOpen, CreditCard, ShieldCheck, ChevronLeft, ChevronRight,
  LogOut, X, Settings, Globe2, Zap, Users, Calendar, Building2, ScrollText,
  Brain,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useClient } from '@/contexts/ClientContext.jsx';
import NotificationBell from '@/components/NotificationBell.jsx';
import ClientWorkspaceSwitcher from '@/components/ClientWorkspaceSwitcher.jsx';
import BusinessSwitcher from '@/components/BusinessSwitcher.jsx';

const NAV_GROUPS = [
  {
    group: null,
    items: [
      { label: 'Dashboard',     path: '/dashboard',    icon: LayoutDashboard },
      { label: 'My Systems',    path: '/systems',      icon: Layers },
      { label: 'My Businesses', path: '/business-portfolio', icon: Building2 },
      { label: 'ASH Intelligence', path: '/ash-intelligence', icon: Brain },
      { label: 'Logs',          path: '/logs',         icon: ScrollText },
    ],
  },
  {
    group: 'REVENUE',
    items: [
      { label: 'Email',         path: '/email-marketing', icon: Mail },
      { label: 'Landing Pages', path: '/landing-pages',  icon: Globe },
      { label: 'Domains',       path: '/domains',         icon: Globe2 },
      { label: 'Affiliates',    path: '/affiliate-links', icon: Link2 },
    ],
  },
  {
    group: 'CONNECT',
    items: [
      { label: 'Connections',   path: '/connections',      icon: Plug },
      { label: 'Social',        path: '/social-accounts',  icon: Share2 },
      { label: 'Content Calendar', path: '/social',        icon: Calendar },
    ],
  },
  {
    group: 'EXPLORE',
    items: [
      { label: 'Marketplace',   path: '/marketplace',  icon: ShoppingBag },
      { label: 'Blueprints',    path: '/blueprints',   icon: BookOpen },
      { label: 'Credits',       path: '/credits',      icon: CreditCard },
    ],
  },
];

const AGENCY_TIERS = new Set(['operator', 'empire', 'pro', 'enterprise']);

export default function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { activeWorkspace } = useClient();
  const ref = useRef(null);

  const isSuperAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'FOUNDER_ADMIN';

  const isAgencyUser =
    isSuperAdmin ||
    AGENCY_TIERS.has(currentUser?.membershipTier || '');

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  useEffect(() => {
    const handler = (e) => {
      if (mobileOpen && ref.current && !ref.current.contains(e.target)) {
        onMobileClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen, onMobileClose]);

  const sidebarCls = [
    'fixed left-0 top-0 h-screen z-40 flex flex-col',
    'bg-[#090909]/97 backdrop-blur-xl border-r border-white/8',
    'transition-all duration-300 ease-in-out',
    collapsed ? 'lg:w-16' : 'lg:w-60',
    'w-72',
    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
  ].join(' ');

  const handleNavClick = () => {
    if (mobileOpen) onMobileClose();
  };

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <aside ref={ref} className={sidebarCls}>
      {/* ── Logo row ─────────────────────────────── */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/6 shrink-0">
        {!collapsed && (
          <Link to="/dashboard" onClick={handleNavClick} className="flex items-center gap-2 min-w-0">
            <img
              src="https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/4c35c9e2294c3d0e16fb5ed3a74c5ddc.png"
              alt="Starks Global Group"
              className="h-8 w-auto object-contain shrink-0"
            />
          </Link>
        )}
        {collapsed && (
          <Link to="/dashboard" onClick={handleNavClick} className="flex items-center justify-center w-full">
            <img
              src="https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/4c35c9e2294c3d0e16fb5ed3a74c5ddc.png"
              alt="Starks Global Group"
              className="h-7 w-auto object-contain"
            />
          </Link>
        )}

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Desktop collapse toggle */}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Client workspace switcher ─────────────── */}
      {isAgencyUser && <ClientWorkspaceSwitcher collapsed={collapsed} />}

      {/* ── Business switcher ─────────────────────── */}
      <BusinessSwitcher collapsed={collapsed} />

      {/* ── Build with ASH — primary CTA ─────────── */}
      <div className={`px-2 pt-3 pb-1 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        <Link
          to="/builder"
          onClick={handleNavClick}
          title={collapsed ? 'Build with ASH' : undefined}
          className={[
            'flex items-center gap-2.5 rounded-xl font-semibold transition-all duration-150',
            'bg-gradient-to-r from-violet-600/90 to-violet-500/80 border border-violet-400/30',
            'hover:from-violet-500 hover:to-violet-400/90 hover:border-violet-400/50',
            'shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]',
            'text-white',
            collapsed ? 'justify-center p-2.5 w-10 h-10' : 'px-3.5 py-2.5 w-full',
          ].join(' ')}
        >
          <Zap className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
          {!collapsed && <span className="text-sm leading-none">Build with ASH</span>}
        </Link>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">
        {NAV_GROUPS.map((grp, gi) => (
          <React.Fragment key={gi}>
            {grp.group && !collapsed && (
              <p className="px-2 pt-4 pb-1 text-[9px] font-mono font-semibold tracking-[0.15em] text-white/25 uppercase select-none">
                {grp.group}
              </p>
            )}
            {grp.group && collapsed && <div className="h-2" />}
            {grp.items.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  title={collapsed ? item.label : undefined}
                  className={[
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
                    collapsed ? 'justify-center px-2' : '',
                    active
                      ? 'bg-violet-500/12 border border-violet-500/20 text-violet-300'
                      : 'text-white/45 hover:text-white/85 hover:bg-white/5 border border-transparent',
                  ].join(' ')}
                >
                  <span className="relative shrink-0">
                    <item.icon
                      className={`shrink-0 transition-colors ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} ${active ? 'text-violet-400' : 'text-white/40 group-hover:text-white/70'}`}
                    />
                  </span>
                  {!collapsed && (
                    <span className="font-medium truncate leading-none">{item.label}</span>
                  )}
                  {active && !collapsed && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-violet-400 shrink-0" />
                  )}
                </Link>
              );
            })}
          </React.Fragment>
        ))}

        {/* Clients link — agency tiers only */}
        {isAgencyUser && (
          <>
            {!collapsed && (
              <p className="px-2 pt-4 pb-1 text-[9px] font-mono font-semibold tracking-[0.15em] text-white/25 uppercase select-none">
                AGENCY
              </p>
            )}
            {collapsed && <div className="h-2" />}
            <Link
              to="/clients"
              onClick={handleNavClick}
              title={collapsed ? 'Clients' : undefined}
              className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
                collapsed ? 'justify-center px-2' : '',
                isActive('/clients')
                  ? 'bg-violet-500/12 border border-violet-500/20 text-violet-300'
                  : 'text-white/45 hover:text-white/85 hover:bg-white/5 border border-transparent',
              ].join(' ')}
            >
              <Users className={`shrink-0 transition-colors ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} ${isActive('/clients') ? 'text-violet-400' : 'text-white/40 group-hover:text-white/70'}`} />
              {!collapsed && <span className="font-medium truncate leading-none">Clients</span>}
              {isActive('/clients') && !collapsed && (
                <span className="ml-auto w-1 h-1 rounded-full bg-violet-400 shrink-0" />
              )}
            </Link>
          </>
        )}

        {/* Admin link */}
        {isSuperAdmin && (
          <>
            {!collapsed && (
              <p className="px-2 pt-4 pb-1 text-[9px] font-mono font-semibold tracking-[0.15em] text-amber-400/50 uppercase select-none">
                ADMIN
              </p>
            )}
            {collapsed && <div className="h-2" />}
            <Link
              to="/admin"
              onClick={handleNavClick}
              title={collapsed ? 'Admin' : undefined}
              className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
                collapsed ? 'justify-center px-2' : '',
                isActive('/admin')
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                  : 'text-white/45 hover:text-white/85 hover:bg-white/5 border border-transparent',
              ].join(' ')}
            >
              <ShieldCheck className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} ${isActive('/admin') ? 'text-amber-400' : 'text-white/40 group-hover:text-amber-400/70'} transition-colors`} />
              {!collapsed && <span className="font-medium truncate leading-none">Admin Panel</span>}
            </Link>
          </>
        )}
      </nav>

      {/* ── Bottom area ──────────────────────────── */}
      <div className="shrink-0 border-t border-white/6 py-3 px-2 space-y-1">
        {/* Notification bell */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-1'}`}>
          <NotificationBell sidebarMode collapsed={collapsed} />
        </div>

        {/* Settings link */}
        <Link
          to="/settings"
          onClick={handleNavClick}
          title={collapsed ? 'Settings' : undefined}
          className={[
            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 w-full',
            collapsed ? 'justify-center px-2' : '',
            isActive('/settings')
              ? 'bg-violet-500/12 border border-violet-500/20 text-violet-300'
              : 'text-white/35 hover:text-white/70 hover:bg-white/5 border border-transparent',
          ].join(' ')}
        >
          <Settings className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} transition-colors`} />
          {!collapsed && <span className="font-medium truncate leading-none">Settings</span>}
        </Link>

        {/* Expand toggle when collapsed (desktop) */}
        {collapsed && (
          <button
            onClick={onToggle}
            title="Expand sidebar"
            className="hidden lg:flex w-full items-center justify-center py-2.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/70 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* User row */}
        <div
          className={`flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors cursor-default ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? `Signed in as ${currentUser?.email || currentUser?.name || 'Unknown user'}` : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/50 to-violet-700/50 border border-violet-500/30 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold font-mono text-violet-200">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest truncate leading-none">
                Signed in as
              </p>
              <p className="text-[10px] text-white/60 font-mono truncate mt-1" title={currentUser?.email || ''}>
                {currentUser?.email || currentUser?.name || 'Unknown user'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => { logout(); navigate('/'); }}
              title="Sign out"
              className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/12 text-white/25 hover:text-red-400/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Logout when collapsed */}
        {collapsed && (
          <button
            onClick={() => { logout(); navigate('/'); }}
            title="Sign out"
            className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400/70 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
