import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';

export const useSystemGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const generateSystem = useCallback(async (query) => {
    if (!query || query.trim().length < 3) {
      setResults(null);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Simple keyword matching against blueprints
      const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
      
      const blueprints = await pb.collection('blueprints').getFullList({
        expand: 'required_tools',
        $autoCancel: false
      });

      const matched = blueprints.filter(bp => {
        const text = `${bp.name} ${bp.description} ${bp.system_name} ${bp.goal_tags?.join(' ')}`.toLowerCase();
        return keywords.some(kw => text.includes(kw));
      });

      if (matched.length > 0) {
        setResults(matched);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Error generating system:", err);
      setError("Failed to generate system. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateSystem,
    isGenerating,
    results,
    error
  };
};