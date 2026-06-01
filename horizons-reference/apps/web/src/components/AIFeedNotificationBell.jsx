import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageSquare, Repeat, ShieldCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatDistanceToNow } from 'date-fns';

const AIFeedNotificationBell = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      try {
        const result = await pb.collection('user_notifications').getList(1, 20, {
          filter: `user_id="${currentUser.id}"`,
          sort: '-created',
          expand: 'actor_id',
          $autoCancel: false
        });
        setNotifications(result.items);
        setUnreadCount(result.items.filter(n => !n.read).length);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();

    // Subscribe to realtime updates
    pb.collection('user_notifications').subscribe('*', function (e) {
      if (e.action === 'create' && e.record.user_id === currentUser.id) {
        setNotifications(prev => [e.record, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
      }
    });

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      pb.collection('user_notifications').unsubscribe('*');
    };
  }, [currentUser]);

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await Promise.all(unreadIds.map(id => 
        pb.collection('user_notifications').update(id, { read: true }, { $autoCancel: false })
      ));
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) markAsRead();
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notif) => {
    setIsOpen(false);
    if (!notif.read) {
      pb.collection('user_notifications').update(notif.id, { read: true }, { $autoCancel: false }).catch(console.error);
    }
    if (notif.post_id) {
      // Navigate to post detail - assume slug is fetched or we route by ID (requires detail page to handle ID)
      // Since schema doesn't expand post slug automatically, routing by ID or generic feed might be needed.
      // For now, redirect to feed and user can find it, or if detail page supports ID, use that.
      navigate(`/dashboard/ai-feed`); 
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-accent" />;
      case 'comment':
      case 'reply': return <MessageSquare className="w-5 h-5 text-primary" />;
      case 'mention': return <span className="text-secondary font-bold text-lg">@</span>;
      case 'official_drop': return <ShieldCheck className="w-5 h-5 text-secondary" />;
      case 'trending': return <TrendingUp className="w-5 h-5 text-green-400" />;
      default: return <Bell className="w-5 h-5 text-foreground" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="p-2 rounded-full hover:bg-white/10 transition-all active:scale-95 relative flex items-center justify-center text-foreground"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-card border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-foreground text-lg">Notifications</h3>
            {unreadCount > 0 && <span className="text-xs text-primary font-medium">{unreadCount} unread</span>}
          </div>
          <div className="max-h-[400px] overflow-y-auto hide-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer flex gap-4 ${!notif.read ? 'bg-primary/[0.03]' : ''}`}
                >
                  <div className="mt-1 shrink-0 bg-background/50 p-2 rounded-full border border-white/5 shadow-sm">
                    {getIcon(notif.type)}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      {notif.type === 'like' && <span>Someone liked your post</span>}
                      {notif.type === 'comment' && <span>Someone commented on your post</span>}
                      {notif.type === 'reply' && <span>Someone replied to your comment</span>}
                      {notif.type === 'official_drop' && <span><strong className="text-secondary">Official Drop:</strong> Check out the latest release!</span>}
                      {notif.type === 'mention' && <span>You were mentioned in a post</span>}
                      {notif.type === 'trending' && <span>Your post is trending!</span>}
                    </p>
                    <span className="text-xs text-muted-foreground mt-1.5 block">
                      {formatDistanceToNow(new Date(notif.created), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIFeedNotificationBell;