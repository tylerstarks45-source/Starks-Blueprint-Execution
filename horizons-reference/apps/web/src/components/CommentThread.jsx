import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Trash2, CornerDownRight, Heart } from 'lucide-react';
import { toast } from 'sonner';

const CommentThread = ({ postId }) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const fetchCommentsAndUsers = async () => {
    try {
      const result = await pb.collection('ai_feed_comments').getFullList({
        filter: `post_id="${postId}"`,
        sort: 'created_at',
        $autoCancel: false
      });
      setComments(result);

      const authorIds = [...new Set(result.map(c => c.author_id))];
      if (authorIds.length > 0) {
        const filterStr = authorIds.map(id => `id="${id}"`).join(' || ');
        const users = await pb.collection('users').getFullList({ filter: filterStr, $autoCancel: false });
        const map = {};
        users.forEach(u => map[u.id] = u);
        setUsersMap(map);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommentsAndUsers();
  }, [postId]);

  const handleSubmit = async (e, parentId = null) => {
    e.preventDefault();
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    try {
      const record = await pb.collection('ai_feed_comments').create({
        post_id: postId,
        author_id: currentUser.id,
        content: content,
        parent_comment_id: parentId || ""
      }, { $autoCancel: false });

      if (!usersMap[currentUser.id]) {
        setUsersMap(prev => ({ ...prev, [currentUser.id]: currentUser }));
      }

      setComments(prev => [...prev, record]);
      if (parentId) {
        setReplyTo(null);
        setReplyContent('');
      } else {
        setNewComment('');
      }
      toast.success("Comment posted");
    } catch (err) {
      toast.error("Failed to post comment");
    }
  };

  const handleDelete = async (id) => {
    try {
      await pb.collection('ai_feed_comments').delete(id, { $autoCancel: false });
      setComments(prev => prev.filter(c => c.id !== id && c.parent_comment_id !== id));
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const rootComments = comments.filter(c => !c.parent_comment_id);
  const repliesMap = {};
  comments.filter(c => c.parent_comment_id).forEach(c => {
    if (!repliesMap[c.parent_comment_id]) repliesMap[c.parent_comment_id] = [];
    repliesMap[c.parent_comment_id].push(c);
  });

  const renderComment = (comment, isReply = false) => {
    const author = usersMap[comment.author_id] || { name: 'User' };
    const dateStr = comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : 'Recently';

    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 mt-3 pl-4 border-l-2 border-white/10' : 'mt-6'}`}>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 border border-primary/30">
            {author.name ? author.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">{author.name || 'Anonymous'}</span>
              <span className="text-xs text-muted-foreground">{dateStr}</span>
            </div>
            <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{comment.content}</p>
            
            <div className="flex items-center gap-4 mt-2">
              <button className="text-xs font-medium text-muted-foreground hover:text-accent transition-colors flex items-center gap-1">
                <Heart className="w-3 h-3" /> Like
              </button>
              {!isReply && (
                <button onClick={() => setReplyTo(replyingTo === comment.id ? null : comment.id)} className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <CornerDownRight className="w-3 h-3" /> Reply
                </button>
              )}
              {currentUser?.id === comment.author_id && (
                <button onClick={() => handleDelete(comment.id)} className="text-xs font-medium text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>

            {replyingTo === comment.id && (
              <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-card border border-white/10 text-sm text-foreground rounded-lg px-3 py-2 focus:border-primary outline-none"
                  autoFocus
                />
                <button type="submit" disabled={!replyContent.trim()} className="neon-button py-1.5 px-4 text-xs">Reply</button>
              </form>
            )}

            {repliesMap[comment.id] && repliesMap[comment.id].map(reply => renderComment(reply, true))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" /> Discussion ({comments.length})
      </h3>

      <form onSubmit={(e) => handleSubmit(e, null)} className="mb-8 flex gap-3 items-start">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/30">
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="flex-1 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add to the discussion... Use @ to mention"
            className="w-full bg-card border border-white/10 text-foreground rounded-xl px-4 py-3 focus:border-primary outline-none resize-none min-h-[80px]"
          />
          <div className="flex justify-end mt-2">
            <button type="submit" disabled={!newComment.trim()} className="neon-button py-2 px-6 text-sm">Post Comment</button>
          </div>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-white/5 rounded" />
                <div className="h-4 w-full bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : rootComments.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8 bg-card/30 rounded-xl border border-dashed border-white/10">
          No comments yet. Start the discussion!
        </p>
      ) : (
        <div className="space-y-2">
          {rootComments.map(c => renderComment(c, false))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;