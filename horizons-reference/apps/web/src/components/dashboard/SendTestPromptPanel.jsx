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

const SendTestPromptPanel = () => {
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
      toast.success('Response received');
    } catch (error) {
      console.error('Send prompt error:', error);
      toast.error(error.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="cinematic-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" /> Advanced Prompt Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Model</label>
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

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-muted-foreground">Temperature</label>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{temperature[0]}</span>
              </div>
              <Slider 
                value={temperature} 
                onValueChange={setTemperature} 
                max={1} 
                step={0.1} 
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Max Tokens</label>
              <Input 
                type="number" 
                value={maxTokens} 
                onChange={(e) => setMaxTokens(e.target.value)}
                min={1}
                max={4096}
                className="bg-background border-border text-foreground"
              />
            </div>

            <Button onClick={handleSend} disabled={loading || !prompt.trim()} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings2 className="w-4 h-4 mr-2" />}
              Send Prompt
            </Button>
          </div>

          {/* Right Column: Input & Output */}
          <div className="lg:col-span-8 space-y-4 flex flex-col">
            <Textarea 
              placeholder="Enter your detailed prompt here..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[150px] bg-background border-border text-foreground placeholder:text-muted-foreground resize-y"
            />
            
            {result && (
              <div className="flex-grow bg-muted/20 border border-border rounded-xl p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-border/50">
                  <h4 className="text-sm font-bold text-foreground">Response</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">{result.responseTimeMs || 0}ms</Badge>
                    <Badge variant="outline" className="text-[10px]">{result.usage?.total || 0} tokens</Badge>
                  </div>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap font-mono overflow-y-auto max-h-[300px]">
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

export default SendTestPromptPanel;