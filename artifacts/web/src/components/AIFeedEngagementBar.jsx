import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Repeat, Bookmark } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

const AIFeedEngagementBar = ({ post, onCommentClick }) => {
  const { currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const checkInteractions = async () => {
      try {
        const [likeRes, bookmarkRes] = await Promise.all([
          pb.collection('ai_feed_likes').getList(1, 1, { filter: `post_id="${post.id}" && user_id="${currentUser.id}"`, $autoCancel: false }),
          pb.collection('ai_feed_bookmarks').getList(1, 1, { filter: `post_id="${post.id}" && user_id="${currentUser.id}"`, $autoCancel: false })
        ]);
        setIsLiked(likeRes.totalItems > 0);
        setIsBookmarked(bookmarkRes.totalItems > 0);
      } catch (e) {}
    };
    checkInteractions();
  }, [post.id, currentUser]);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser) return toast.error("Log in to like");
    try {
      if (isLiked) {
        const userLike = await pb.collection('ai_feed_likes').getFirstListItem(`post_id="${post.id}" && user_id="${currentUser.id}"`, { $autoCancel: false });
        await pb.collection('ai_feed_likes').delete(userLike.id, { $autoCancel: false });
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await pb.collection('ai_feed_likes').create({ post_id: post.id, user_id: currentUser.id }, { $autoCancel: false });
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (err) {}
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    if (!currentUser) return toast.error("Log in to bookmark");
    try {
      if (isBookmarked) {
        const bm = await pb.collection('ai_feed_bookmarks').getFirstListItem(`post_id="${post.id}" && user_id="${currentUser.id}"`, { $autoCancel: false });
        await pb.collection('ai_feed_bookmarks').delete(bm.id, { $autoCancel: false });
        setIsBookmarked(false);
        toast.success("Removed from bookmarks");
      } else {
        await pb.collection('ai_feed_bookmarks').create({ post_id: post.id, user_id: currentUser.id }, { $autoCancel: false });
        setIsBookmarked(true);
        toast.success("Saved to bookmarks");
      }
    } catch (err) {}
  };

  const handleRepost = (e) => {
    e.stopPropagation();
    if (!currentUser) return toast.error("Log in to repost");
    if (isReposted) {
      setIsReposted(false);
      setRepostCount(prev => Math.max(0, prev - 1));
    } else {
      setIsReposted(true);
      setRepostCount(prev => prev + 1);
      toast.success("Reposted to your feed");
    }
  };

  return (
    <div className="flex items-center justify-between mt-3 max-w-md text-muted-foreground">
      <button 
        onClick={(e) => { e.stopPropagation(); onCommentClick?.(); }} 
        className="flex items-center gap-2 group transition-colors"
      >
        <div className="p-2 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <MessageSquare className="w-4 h-4" />
        </div>
        <span className="text-xs group-hover:text-primary transition-colors">{post.comments_count || 0}</span>
      </button>

      <button 
        onClick={handleRepost} 
        className={`flex items-center gap-2 group transition-colors ${isReposted ? 'text-green-500' : ''}`}
      >
        <div className="p-2 rounded-full group-hover:bg-green-500/10 group-hover:text-green-500 transition-colors">
          <Repeat className="w-4 h-4" />
        </div>
        <span className={`text-xs group-hover:text-green-500 transition-colors ${isReposted ? 'text-green-500' : ''}`}>
          {repostCount}
        </span>
      </button>

      <button 
        onClick={handleLike} 
        className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-accent' : ''}`}
      >
        <div className="p-2 rounded-full group-hover:bg-accent/10 group-hover:text-accent transition-colors">
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </div>
        <span className={`text-xs group-hover:text-accent transition-colors ${isLiked ? 'text-accent' : ''}`}>
          {likeCount}
        </span>
      </button>

      <button 
        onClick={handleBookmark} 
        className={`flex items-center gap-2 group transition-colors ${isBookmarked ? 'text-primary' : ''}`}
      >
        <div className="p-2 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </div>
      </button>
    </div>
  );
};

export default AIFeedEngagementBar;