import React, { useState, useEffect } from 'react';
import { Trophy, Medal, ArrowUpRight } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';

const WeeklyLeaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const result = await pb.collection('user_profiles').getList(1, 10, {
          sort: '-points',
          $autoCancel: false
        });
        setLeaders(result.items);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  if (isLoading) return <div className="glass-panel rounded-2xl p-6 animate-pulse h-64" />;

  return (
    <div className="glass-panel rounded-2xl p-5 sticky top-[160px]">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
        <Trophy className="w-5 h-5 text-accent" />
        <h3 className="font-bold text-foreground">Weekly Top 10</h3>
      </div>
      
      <div className="space-y-3 mb-4">
        {leaders.map((user, index) => (
          <div key={user.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold w-4 ${index < 3 ? 'text-accent' : 'text-muted-foreground'}`}>
                {index + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold border border-primary/30">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[100px]">
                {user.username || 'Anonymous'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-primary">{user.points || 0}</span>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full py-2 text-xs font-bold text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors flex items-center justify-center gap-1">
        Climb the ranks! <ArrowUpRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default WeeklyLeaderboard;