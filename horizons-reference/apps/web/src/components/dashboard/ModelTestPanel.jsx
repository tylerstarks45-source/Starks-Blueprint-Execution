import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Loader2, Clock, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' }
];

const ModelTestPanel = () => {
  const [model, setModel] = useState(MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a test prompt');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const response = await apiServerClient.fetch('/ai/openrouter/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, testPrompt: prompt })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Model test failed');
      }
      
      const data = await response.json();
      setResult(data);
      toast.success('Test completed successfully');
    } catch (error) {
      console.error('Model test error:', error);
      toast.error(error.message || 'Failed to run model test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="cinematic-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" /> Quick Model Test
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="w-full md:w-1/3">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-2/3 flex gap-2">
            <Input 
              placeholder="Enter test prompt (e.g., 'Say hello world')" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
            />
            <Button onClick={handleTest} disabled={loading || !prompt.trim()} className="shrink-0">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Run Test
            </Button>
          </div>
        </div>

        {result && (
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-center pb-3 border-b border-border/50">
              <Badge variant="outline" className="bg-background"><Cpu className="w-3 h-3 mr-1.5 text-primary" /> {result.model || model}</Badge>
              <Badge variant="outline" className="bg-background"><Clock className="w-3 h-3 mr-1.5 text-amber-400" /> {result.responseTimeMs || 0}ms</Badge>
              <Badge variant="outline" className="bg-background">
                Tokens: {result.usage?.prompt || 0} in / {result.usage?.completion || 0} out
              </Badge>
            </div>
            <div className="text-sm text-foreground whitespace-pre-wrap font-mono bg-background/50 p-4 rounded-lg border border-border/50">
              {result.content || result.response || 'No content returned.'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelTestPanel;