import { useState, useCallback } from 'react';

export const useSystemGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const generateSystem = useCallback(async (query) => {
    if (!query || query.trim().length < 3) {
      setResults(null);
      setAiSuggestion(null);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAiSuggestion(null);

    try {
      const bpRes = await fetch('/api/blueprints');
      const blueprints = bpRes.ok ? await bpRes.json() : [];

      if (!blueprints || blueprints.length === 0) {
        setResults([]);
        return;
      }

      const bpList = blueprints.map(bp =>
        `ID:${bp.id} | SLUG:${bp.slug} | NAME:${bp.name} | DIFFICULTY:${bp.difficulty} | DESC:${bp.description}`
      ).join('\n');

      let aiMatches = null;
      try {
        const token = localStorage.getItem('sbep_auth_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch('/api/openrouter/complete', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            systemPrompt: `You are Starks Global Group's AI architect. Given a user's business goal, select the 1-3 MOST RELEVANT blueprints from the list below. 
Return ONLY a JSON array of blueprint IDs like: [1, 5, 3]
If nothing matches well, return the 2 closest ones anyway.

BLUEPRINTS:
${bpList}`,
            prompt: `User goal: "${query}"

Return ONLY the JSON array of matching blueprint IDs (e.g. [2, 7]).`,
            model: 'openai/gpt-4o-mini',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.content || '';
          const match = content.match(/\[[\d,\s]+\]/);
          if (match) {
            const ids = JSON.parse(match[0]);
            aiMatches = blueprints.filter(bp => ids.includes(bp.id));
            setAiSuggestion(content);
          }
        }
      } catch (aiErr) {
        console.warn('AI matching unavailable, falling back to keyword search');
      }

      if (aiMatches && aiMatches.length > 0) {
        setResults(aiMatches);
      } else {
        const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
        const matched = blueprints.filter(bp => {
          const text = `${bp.name} ${bp.description} ${bp.slug}`.toLowerCase();
          return keywords.some(kw => text.includes(kw));
        });
        setResults(matched.length > 0 ? matched : blueprints.slice(0, 3));
      }
    } catch (err) {
      setError('Failed to generate system. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateSystem, isGenerating, results, aiSuggestion, error };
};
