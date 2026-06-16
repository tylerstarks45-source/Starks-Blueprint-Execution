import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, Settings2 } from 'lucide-react';
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

const AIResponseTestPanel = () => {
  const [model, setModel] = useState(MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!prompt.trim()) {
      toast.error('Prompt cannot be empty');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const response = await apiServerClient.fetch('/ai/openrouter/send-test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model, 
          prompt,
          temperature: temperature[0],
          maxTokens: parseInt(maxTokens, 10) || 2048
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send prompt');
      }
      
      const data = await response.json();
      setResult(data);
      toast.success('AI Output received');
    } catch (error) {
      console.error('Send prompt error:', error);
      toast.error(error.message || 'Failed to get AI Output');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" /> Test AI Response
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-7">
            <div className="space-y-2.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-background/50 border-border/50 transition-colors hover:border-border">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Temperature</label>
                <span className="text-xs font-mono bg-muted/50 text-muted-foreground px-2 py-1 rounded-md border border-border/30">{temperature[0]}</span>
              </div>
              <Slider 
                value={temperature} 
                onValueChange={setTemperature} 
                max={1} 
                step={0.1} 
                className="py-2 cursor-pointer"
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Tokens</label>
              <Input 
                type="number" 
                value={maxTokens} 
                onChange={(e) => setMaxTokens(e.target.value)}
                min={1}
                max={4096}
                className="bg-background/50 border-border/50 text-foreground transition-colors hover:border-border focus-visible:ring-primary/30"
              />
            </div>

            <Button onClick={handleSend} disabled={loading || !prompt.trim()} className="w-full transition-all duration-200 active:scale-[0.98] shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings2 className="w-4 h-4 mr-2" />}
              Test AI Response
            </Button>
          </div>

          {/* Right Column: Input & Output */}
          <div className="lg:col-span-8 space-y-5 flex flex-col">
            <Textarea 
              placeholder="Enter your detailed prompt here..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[160px] bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground resize-y transition-colors hover:border-border focus-visible:ring-primary/30"
            />
            
            {result && (
              <div className="flex-grow bg-muted/10 border border-border/40 rounded-xl p-5 flex flex-col shadow-inner">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/30">
                  <h4 className="text-sm font-semibold text-foreground tracking-tight">AI Output</h4>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-[10px] font-mono bg-background/50 text-muted-foreground">{result.responseTimeMs || 0}ms</Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono bg-background/50 text-muted-foreground">{result.usage?.total || 0} compute units</Badge>
                  </div>
                </div>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap font-mono overflow-y-auto max-h-[350px] ash-scroll leading-relaxed">
                  {result.content || result.response || 'No content returned.'}
                </div>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default AIResponseTestPanel;