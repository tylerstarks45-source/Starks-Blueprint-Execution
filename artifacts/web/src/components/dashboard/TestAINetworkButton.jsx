import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Activity, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const TestAINetworkButton = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleTestAll = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const response = await apiServerClient.fetch('/ai/testing/test-all-models', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate system-wide test');
      }
      
      const data = await response.json();
      setResults(data);
      setShowModal(true);
      toast.success('System-wide network test completed');
    } catch (error) {
      console.error('Test AI network error:', error);
      toast.error(error.message || 'Failed to test AI network');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-card/80 to-background/80 backdrop-blur-md border-primary/20 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/40 p-8 flex flex-col justify-center items-center text-center h-full min-h-[260px]">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20 shadow-inner">
          <Activity className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2 tracking-tight text-foreground">System-Wide Diagnostic</h3>
        <p className="text-sm text-muted-foreground mb-7 max-w-sm leading-relaxed">
          Run a comprehensive test across all configured AI models to verify connectivity, latency, and response formatting.
        </p>
        <Button 
          onClick={handleTestAll} 
          disabled={loading} 
          size="lg" 
          className="w-full max-w-[260px] shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Network...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 mr-2" />
              Test AI Network
            </>
          )}
        </Button>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-medium tracking-tight flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-primary" /> Diagnostic Results
            </DialogTitle>
          </DialogHeader>
          
          {results && (
            <div className="space-y-6 pt-5">
              <div className="flex gap-4 justify-center">
                <div className="text-center px-5 py-3 bg-muted/20 rounded-xl border border-border/40 shadow-sm flex-1">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total</p>
                  <p className="text-2xl font-bold font-mono text-foreground/90">{results.summary?.total || 0}</p>
                </div>
                <div className="text-center px-5 py-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-sm flex-1">
                  <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mb-1">Success</p>
                  <p className="text-2xl font-bold font-mono text-emerald-500">{results.summary?.success || 0}</p>
                </div>
                <div className="text-center px-5 py-3 bg-destructive/10 rounded-xl border border-destructive/20 shadow-sm flex-1">
                  <p className="text-[10px] text-destructive font-semibold uppercase tracking-wider mb-1">Failed</p>
                  <p className="text-2xl font-bold font-mono text-destructive">{results.summary?.failed || 0}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 ash-scroll">
                {results.results?.map((res, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-muted/10 border border-border/30 rounded-xl hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3.5">
                      {res.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground/90">{res.model}</p>
                        {res.error && <p className="text-xs text-destructive/90 mt-1 font-medium">{res.error}</p>}
                      </div>
                    </div>
                    {res.responseTimeMs && (
                      <Badge variant="secondary" className="font-mono text-[10px] bg-background/50 text-muted-foreground border-border/30">
                        {res.responseTimeMs}ms
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestAINetworkButton;