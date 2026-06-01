import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import pb from '@/lib/pocketbaseClient.js';
import { Activity, Wrench, Layers, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const LiveActivitySection = () => {
  const [activities, setActivities] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const [updatesRes, blueprintsRes] = await Promise.all([
          pb.collection('updates').getList(1, 5, { sort: '-created', $autoCancel: false }),
          pb.collection('blueprints').getList(1, 3, { sort: '-created', $autoCancel: false })
        ]);

        const combined = [
          ...updatesRes.items.map(u => ({
            id: `u-${u.id}`,
            type: 'update',
            icon: Wrench,
            text: `New tool added: ${u.title}`,
            time: u.created,
            color: 'text-blue-400'
          })),
          ...blueprintsRes.items.map(b => ({
            id: `b-${b.id}`,
            type: 'blueprint',
            icon: Layers,
            text: `System updated: ${b.name}`,
            time: b.created,
            color: 'text-emerald-400'
          })),
          {
            id: 'static-1',
            type: 'users',
            icon: Users,
            text: 'Users building systems now',
            time: new Date().toISOString(),
            color: 'text-purple-400'
          }
        ].sort((a, b) => new Date(b.time) - new Date(a.time));

        setActivities(combined.slice(0, 5));
      } catch (err) {
        console.error("Error fetching live activity:", err);
      }
    };

    fetchActivities();
  }, []);

  useEffect(() => {
    if (activities.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activities]);

  if (activities.length === 0) return null;

  const currentActivity = activities[currentIndex];

  return (
    <section className="py-6 bg-background border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-bold text-destructive uppercase tracking-wider">Live Platform Activity</span>
            </div>
            
            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="relative h-6 w-64 overflow-hidden hidden sm:block">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentActivity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center gap-2"
                >
                  <currentActivity.icon className={`w-4 h-4 ${currentActivity.color}`} />
                  <span className="text-sm font-medium text-foreground truncate">{currentActivity.text}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <Link to="/dashboard/updates" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center">
            View All Updates <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        {/* Mobile View Activity */}
        <div className="mt-3 sm:hidden text-center h-6 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentActivity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              <currentActivity.icon className={`w-4 h-4 ${currentActivity.color}`} />
              <span className="text-sm font-medium text-foreground truncate">{currentActivity.text}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default LiveActivitySection;