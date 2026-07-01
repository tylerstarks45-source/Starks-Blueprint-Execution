import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, X, Zap, AlertCircle, Info, Star, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authH = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const fmtDate = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const typeIcon = (type) => {
  if (!type) return Info;
  if (type.includes('success') || type.includes('complete')) return Zap;
  if (type.includes('warn') || type.includes('error') || type.includes('fail')) return AlertCircle;
  if (type.includes('star') || type.includes('reward')) return Star;
  return Info;
};

const typeDot = (type) => {
  if (!type) return 'bg-violet-400';
  if (type.includes('success') || type.includes('complete')) return 'bg-emerald-400';
  if (type.includes('warn')) return 'bg-amber-400';
  if (type.includes('error') || type.includes('fail')) return 'bg-rose-400';
  return 'bg-violet-400';
};

const NotificationBell = ({ sidebarMode = false, collapsed = false }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length + pendingApprovals.length;

  // Pending ASH Operations Mode approvals are surfaced in the bell alongside
  // regular notifications — they always count as "unread" until the owner
  // approves/rejects them from the Approval Queue.
  const feedItems = [
    ...pendingApprovals.map((a) => ({
      id: `approval-${a.id}`,
      approvalId: a.id,
      businessId: a.businessId,
      title: a.title,
      message: a.description || 'ASH is waiting on your approval.',
      type: 'approval_pending',
      createdAt: a.createdAt,
      read: false,
      isApproval: true,
    })),
    ...notifications,
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const [notifRes, approvalsRes] = await Promise.all([
        fetch(`/api/notifications?userId=${currentUser.id}`, { headers: authH() }),
        fetch('/api/approvals?status=pending', { headers: authH() }),
      ]);
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(Array.isArray(data) ? data.slice(0, 20) : []);
      }
      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setPendingApprovals(Array.isArray(data) ? data : []);
      }
    } catch { /* silently ignore */ } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications, isAuthenticated]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: authH() });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n)));
    } catch { /* silently ignore */ }
  };

  const markAllRead = (e) => {
    e.stopPropagation();
    notifications.filter((n) => !n.read && !n.isRead).forEach((n) => markRead(n.id));
  };

  const handleItemClick = (item) => {
    if (item.isApproval) {
      setIsOpen(false);
      if (item.businessId) navigate(`/business/${item.businessId}`);
      return;
    }
    markRead(item.id);
  };

  if (!isAuthenticated) return null;

  /* ── Sidebar mode: nav-item style button + panel ── */
  if (sidebarMode) {
    return (
      <div className="relative w-full" ref={ref}>
        <button
          onClick={() => { setIsOpen((v) => !v); if (!isOpen) fetchNotifications(); }}
          title={collapsed ? 'Notifications' : undefined}
          className={[
            'group flex items-center gap-3 rounded-lg py-2.5 text-sm transition-all duration-150 w-full',
            collapsed ? 'justify-center px-2' : 'px-3',
            isOpen
              ? 'bg-violet-500/12 border border-violet-500/20 text-violet-300'
              : 'text-white/45 hover:text-white/85 hover:bg-white/5 border border-transparent',
          ].join(' ')}
        >
          <div className="relative shrink-0">
            <Bell className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} ${isOpen ? 'text-violet-400' : 'text-white/40 group-hover:text-white/70'} transition-colors`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center bg-violet-500 text-white text-[8px] font-bold rounded-full px-0.5 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {!collapsed && (
            <>
              <span className="font-medium truncate leading-none flex-1 text-left">Notifications</span>
              {unreadCount > 0 && (
                <span className="shrink-0 min-w-[18px] flex items-center justify-center bg-violet-500/80 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </>
          )}
        </button>

        {isOpen && (
          <div className={[
            'absolute z-50 bg-[#0d0d0d] border border-white/12 rounded-2xl shadow-2xl overflow-hidden',
            'w-80',
            collapsed ? 'left-full ml-3 bottom-0' : 'left-0 right-0 bottom-full mb-2',
          ].join(' ')}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-violet-400" />
                <p className="text-sm font-bold text-white/85">Notifications</p>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-[9px] font-mono font-bold text-violet-400">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[10px] text-white/35 hover:text-violet-400 font-mono transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" /> All read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : feedItems.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-white/12 mx-auto mb-2.5" />
                  <p className="text-sm text-white/30 font-mono">No notifications yet</p>
                  <p className="text-[10px] text-white/18 font-mono mt-1">ASH activity will appear here</p>
                </div>
              ) : (
                feedItems.map((n, i) => {
                  const unread = n.isApproval || (!n.read && !n.isRead);
                  const IconComp = n.isApproval ? ShieldAlert : typeIcon(n.type);
                  return (
                    <button
                      key={`${n.id}-${i}`}
                      onClick={() => handleItemClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors ${unread ? 'bg-violet-500/4' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${n.isApproval ? 'bg-amber-500/15 border border-amber-500/20' : unread ? 'bg-violet-500/15 border border-violet-500/20' : 'bg-white/4 border border-white/8'}`}>
                          <IconComp className={`w-3 h-3 ${n.isApproval ? 'text-amber-400' : unread ? 'text-violet-400' : 'text-white/30'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug font-medium ${unread ? 'text-white/85' : 'text-white/50'}`}>
                            {n.title || n.message}
                          </p>
                          {n.title && n.message && (
                            <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{n.message}</p>
                          )}
                          <p className="text-[9px] text-white/22 font-mono mt-1">
                            {n.isApproval ? 'Needs approval · ' : ''}{fmtDate(n.createdAt)}
                          </p>
                        </div>
                        {unread && (
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.isApproval ? 'bg-amber-400' : typeDot(n.type)}`} />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Standard header bell ── */
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setIsOpen((v) => !v); if (!isOpen) fetchNotifications(); }}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/8 text-white/45 hover:text-white/80 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-violet-500 text-white text-[9px] font-bold rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0d0d0d] border border-white/12 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-violet-400" />
              <p className="text-sm font-bold text-white/85">Notifications</p>
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-white/35 hover:text-violet-400 font-mono transition-colors flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> All read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="py-8 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : feedItems.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-white/12 mx-auto mb-2" />
                <p className="text-sm text-white/30 font-mono">No notifications yet</p>
              </div>
            ) : (
              feedItems.map((n, i) => {
                const unread = n.isApproval || (!n.read && !n.isRead);
                return (
                  <button
                    key={`${n.id}-${i}`}
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors ${unread ? 'bg-violet-500/4' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {unread && <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.isApproval ? 'bg-amber-400' : 'bg-violet-400'}`} />}
                      <div className={unread ? '' : 'ml-4'}>
                        <p className={`text-xs font-medium leading-snug ${unread ? 'text-white/85' : 'text-white/50'}`}>
                          {n.title || n.message}
                        </p>
                        {n.title && n.message && (
                          <p className="text-[10px] text-white/30 mt-0.5">{n.message}</p>
                        )}
                        <p className="text-[9px] text-white/22 font-mono mt-1">
                          {n.isApproval ? 'Needs approval · ' : ''}{fmtDate(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
