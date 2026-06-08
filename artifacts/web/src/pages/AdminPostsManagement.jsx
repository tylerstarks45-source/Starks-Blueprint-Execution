import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import AdminPostBuilder from '@/components/AdminPostBuilder.jsx';
import { formatDistanceToNow } from 'date-fns';

const AdminPostsManagement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    if (currentUser && !['SUPER_ADMIN', 'ADMIN', 'admin', 'FOUNDER_ADMIN'].includes(currentUser.role)) {
      toast.error("Unauthorized access.");
      navigate('/dashboard/ai-feed');
    }
  }, [currentUser, navigate]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const result = await pb.collection('ai_feed_posts').getList(1, 50, {
        sort: '-created',
        $autoCancel: false
      });
      setPosts(result.items);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load posts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
    try {
      await pb.collection('ai_feed_posts').delete(id, { $autoCancel: false });
      toast.success("Post deleted");
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      toast.error("Failed to delete post");
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      const updated = await pb.collection('ai_feed_posts').update(post.id, {
        is_published: !post.is_published
      }, { $autoCancel: false });
      toast.success(`Post ${updated.is_published ? 'published' : 'unpublished'}`);
      setPosts(prev => prev.map(p => p.id === post.id ? updated : p));
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setIsBuilderOpen(true);
  };

  const openCreate = () => {
    setEditingPost(null);
    setIsBuilderOpen(true);
  };

  const getPostTypeBadge = (type) => {
    switch(type) {
      case 'system_drop': return <span className="px-2.5 py-1 rounded bg-blue-600/10 text-blue-500 border border-blue-600/30 text-xs font-bold uppercase tracking-wider">System Drop</span>;
      case 'tool_drop': return <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">Tool Drop</span>;
      case 'update': return <span className="px-2.5 py-1 rounded bg-blue-700/10 text-blue-600 border border-blue-700/30 text-xs font-bold uppercase tracking-wider">Update</span>;
      case 'insight': return <span className="px-2.5 py-1 rounded bg-blue-400/10 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">Insight</span>;
      default: return <span className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground border border-border text-xs font-bold uppercase tracking-wider">{type}</span>;
    }
  };

  if (!['SUPER_ADMIN', 'ADMIN', 'admin', 'FOUNDER_ADMIN'].includes(currentUser?.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Helmet><title>Manage Feed | Starks Global Admin</title></Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/dashboard/ai-feed" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4 text-sm font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Feed
            </Link>
            <h1 className="text-3xl font-extrabold text-foreground">Manage AI Feed</h1>
            <p className="text-muted-foreground mt-1">Create, edit, and control the official broadcast feed.</p>
          </div>
          <button 
            onClick={openCreate}
            className="saas-button flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create Post
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Post</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-primary">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">
                      No posts found. Create your first broadcast.
                    </td>
                  </tr>
                ) : (
                  posts.map(post => (
                    <tr key={post.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-foreground text-sm max-w-[300px] truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(post.created), { addSuffix: true })}</p>
                      </td>
                      <td className="px-6 py-4">
                        {getPostTypeBadge(post.post_type)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-bold text-foreground">{post.views_count || 0}</span> views<br/>
                          <span className="font-bold text-foreground">{post.clicks_count || 0}</span> clicks
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {post.is_published ? (
                          <span className="flex items-center text-xs font-bold text-primary gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_hsl(var(--primary))]"></div> Published</span>
                        ) : (
                          <span className="flex items-center text-xs font-bold text-muted-foreground gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div> Draft</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleTogglePublish(post)}
                            className="p-2 bg-secondary/50 hover:bg-secondary text-foreground rounded-lg transition-colors"
                            title={post.is_published ? "Unpublish" : "Publish"}
                          >
                            {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => openEdit(post)}
                            className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(post.id)}
                            className="p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isBuilderOpen && (
        <AdminPostBuilder 
          existingPost={editingPost} 
          onClose={() => setIsBuilderOpen(false)} 
          onSuccess={fetchPosts} 
        />
      )}
    </div>
  );
};

export default AdminPostsManagement;