import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authH = () => { const t = localStorage.getItem('sbep_auth_token'); return t ? { Authorization: `Bearer ${t}` } : {}; };

const fmtDate = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const NotificationBell = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef(null);

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data.slice(0, 12) : []);
      }
    } catch { /* silently ignore */ } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isAuthenticated) { fetchNotifications(); }
  }, [fetchNotifications, isAuthenticated]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: authH() });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, isRead: true } : n));
    } catch { /* silently ignore */ }
  };

  const markAllRead = () => notifications.filter(n => !n.read && !n.isRead).forEach(n => markRead(n.id));

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setIsOpen(v => !v); if (!isOpen) fetchNotifications(); }}
        className="relative flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-blue-500 text-white text-[9px] font-bold rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
            <p className="text-sm font-bold text-foreground">Notifications</p>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"/></div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2"/>
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <button key={n.id} onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-border/40 hover:bg-muted/20 transition-colors ${!n.read && !n.isRead ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start gap-2">
                  {!n.read && !n.isRead && <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"/>}
                  <div className={!n.read && !n.isRead ? '' : 'ml-3.5'}>
                    <p className="text-sm font-medium text-foreground leading-snug">{n.title || n.message}</p>
                    {n.title && n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{fmtDate(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;