import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

export const useToolSave = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [savedToolsMap, setSavedToolsMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchSavedTools = useCallback(async () => {
    if (!isAuthenticated || !currentUser) return;
    try {
      const records = await pb.collection('saved_tools').getFullList({
        filter: `userId="${currentUser.id}"`,
        $autoCancel: false,
      });
      const map = {};
      records.forEach(r => {
        map[r.toolId] = r.id;
      });
      setSavedToolsMap(map);
    } catch (error) {
      console.error('Error fetching saved tools:', error);
    }
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    fetchSavedTools();
  }, [fetchSavedTools]);

  const isToolSaved = (toolId) => !!savedToolsMap[toolId];

  const toggleToolSave = async (toolId) => {
    if (!isAuthenticated || !currentUser) {
      toast.error('You must be logged in to save tools.');
      return;
    }
    
    setIsLoading(true);
    try {
      if (isToolSaved(toolId)) {
        const recordId = savedToolsMap[toolId];
        await pb.collection('saved_tools').delete(recordId, { $autoCancel: false });
        setSavedToolsMap(prev => {
          const next = { ...prev };
          delete next[toolId];
          return next;
        });
        toast.success('Tool removed from saved');
      } else {
        const record = await pb.collection('saved_tools').create({
          userId: currentUser.id,
          toolId: toolId
        }, { $autoCancel: false });
        setSavedToolsMap(prev => ({
          ...prev,
          [toolId]: record.id
        }));
        toast.success('Tool saved!');
      }
    } catch (error) {
      console.error('Error toggling tool save:', error);
      toast.error('Failed to update saved tools.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isToolSaved,
    toggleToolSave,
    isLoading,
    fetchSavedTools
  };
};