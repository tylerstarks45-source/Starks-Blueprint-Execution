import React from 'react';
import PostCard from './PostCard.jsx';
import { Star } from 'lucide-react';

const FeaturedPostsSection = ({ posts }) => {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <Star className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Featured Insights</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedPostsSection;