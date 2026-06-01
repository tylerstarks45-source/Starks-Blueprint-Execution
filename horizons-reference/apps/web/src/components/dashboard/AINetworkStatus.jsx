import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const AINetworkStatus = () => {
  const [status, setStatus] = useState('idle'); // idle, checking, connected, error
  const [healthInfo, setHealthInfo] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus('checking');
    try {
      const response = await apiServerClient.fetch('/ai/openrouter/test-connection', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Connection test failed');
      }
      
      const data = await response.json();
      setHealthInfo(data);
      setStatus('connected');
      setLastCheck(new Date());
      toast.success('Starks AI Engine connection successful');
    } catch (error) {
      console.error('Connection test error:', error);
      setStatus('error');
      toast.error('Failed to connect to Starks AI Engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20 h-full">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" /> Starks AI Engine
          </CardTitle>
          {status === 'connected' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-medium"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>}
          {status === 'error' && <Badge variant="destructive" className="font-medium"><XCircle className="w-3 h-3 mr-1" /> Disconnected</Badge>}
          {status === 'checking' && <Badge variant="outline" className="text-amber-500 border-amber-500/20 font-medium"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking</Badge>}
          {status === 'idle' && <Badge variant="outline" className="text-muted-foreground font-medium"><AlertCircle className="w-3 h-3 mr-1" /> Unknown</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        <div className="grid grid-cols-2 gap-5 text-sm">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Network Status</p>
            <p className="font-mono font-medium text-foreground">{healthInfo?.status || '—'}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Latency</p>
            <p className="font-mono font-medium text-foreground">{healthInfo?.latencyMs ? `${healthInfo.latencyMs}ms` : '—'}</p>
          </div>
          <div className="space-y-1.5 col-span-2">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Last Checked</p>
            <p className="font-mono font-medium text-foreground">{lastCheck ? lastCheck.toLocaleTimeString() : '—'}</p>
          </div>
        </div>
        
        <Button 
          onClick={testConnection} 
          disabled={loading} 
          className="w-full mt-2 transition-all duration-200 active:scale-[0.98]"
          variant="secondary"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Network className="w-4 h-4 mr-2" />}
          Check Network
        </Button>
      </CardContent>
    </Card>
  );
};

export default AINetworkStatus;