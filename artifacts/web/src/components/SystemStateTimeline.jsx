import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import pb from '@/lib/pocketbaseClient';
import { formatDistanceToNow } from 'date-fns';
import { Clock, ArrowRight, AlertCircle } from 'lucide-react';
import SystemStatusBadge from './SystemStatusBadge';

const SystemStateTimeline = ({ systemId }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!systemId) return;
      try {
        const records = await pb.collection('status_history').getList(1, 50, {
          filter: `system_id="${systemId}"`,
          sort: '-created_at',
          $autoCancel: false
        });
        setHistory(records.items);
      } catch (error) {
        console.error("Failed to fetch status history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [systemId]);

  if (isLoading) {
    return <div className="animate-pulse flex space-x-4 p-4"><div className="flex-1 space-y-4 py-1"><div className="h-2 bg-muted rounded w-3/4"></div><div className="space-y-3"><div className="h-2 bg-muted rounded"></div></div></div></div>;
  }

  if (history.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 text-center border border-dashed border-border rounded-xl">No state transitions recorded yet.</div>;
  }

  return (
    <div className="relative border-l border-border/50 ml-3 space-y-6 py-2">
      {history.map((record, index) => (
        <motion.div 
          key={record.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative pl-6"
        >
          <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary ring-4 ring-background" />
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
            <div className="flex items-center gap-2">
              {record.old_status && (
                <>
                  <span className="text-xs text-muted-foreground">{record.old_status}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </>
              )}
              <SystemStatusBadge status={record.new_status} size="sm" />
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 sm:ml-auto">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
            </span>
          </div>
          
          {record.reason && (
            <p className="text-xs text-muted-foreground mt-2 bg-muted/30 p-2 rounded-md border border-border/50 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              {record.reason}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default SystemStateTimeline;