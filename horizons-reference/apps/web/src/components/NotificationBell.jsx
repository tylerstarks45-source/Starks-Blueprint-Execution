import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageSquare, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';

const NotificationBell = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      try {
        // Fetch posts by current user to match against
        const userPosts = await pb.collection('ai_feed_posts').getFullList({
          filter: `author_id="${currentUser.id}"`,
          $autoCancel: false
        });

        if (userPosts.length === 0) return;
        const postIds = userPosts.map(p => `"${p.id}"`).join(',');

        // Fetch recent likes on these posts
        const likes = await pb.collection('ai_feed_likes').getList(1, 10, {
          filter: `post_id ?= [${postIds}] && user_id != "${currentUser.id}"`,
          sort: '-created_at',
          $autoCancel: false
        });

        // Fetch recent comments on these posts
        const comments = await pb.collection('ai_feed_comments').getList(1, 10, {
          filter: `post_id ?= [${postIds}] && author_id != "${currentUser.id}"`,
          sort: '-created_at',
          $autoCancel: false
        });

        const allNotifications = [
          ...likes.items.map(l => ({ ...l, type: 'like', date: new Date(l.created_at) })),
          ...comments.items.map(c => ({ ...c, type: 'comment', date: new Date(c.created_at) }))
        ].sort((a, b) => b.date - a.date).slice(0, 15);

        setNotifications(allNotifications);
        setUnreadCount(allNotifications.length); // Simple unread logic for demo
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setUnreadCount(0); // Mark as read when opening
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-foreground focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-destructive rounded-full border border-background shadow-[0_0_8px_hsl(var(--destructive)/0.8)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-2xl overflow-hidden z-50 border-white/10 shadow-2xl"
          >
            <div className="p-4 border-b border-white/5 bg-muted/30">
              <h3 className="font-bold text-foreground">Notifications</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                  No recent activity on your posts.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notif) => (
                    <Link 
                      key={notif.id} 
                      to={`/dashboard/ai-feed/${notif.post_id}`} // Simple routing, assuming slug isn't strictly required if we adjust router, or we need to map id to slug. Assuming ID works.
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notif.type === 'like' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                        {notif.type === 'like' ? <Heart className="w-4 h-4 fill-current" /> : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">
                          <span className="font-bold">Someone</span> 
                          {notif.type === 'like' ? ' liked your post.' : ' commented on your post.'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.date.toLocaleDateString()} at {notif.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;