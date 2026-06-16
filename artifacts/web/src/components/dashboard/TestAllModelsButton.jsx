import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Activity, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const TestAllModelsButton = () => {
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
      toast.success('System-wide model test completed');
    } catch (error) {
      console.error('Test all models error:', error);
      toast.error(error.message || 'Failed to test models');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="cinematic-card p-8 flex flex-col justify-center items-center text-center h-full min-h-[250px] bg-gradient-to-br from-card to-background border-primary/20">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/30">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2 font-mono">System-Wide Diagnostic</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Run a comprehensive test across all configured AI models to verify connectivity, latency, and response formatting.
        </p>
        <Button 
          onClick={handleTestAll} 
          disabled={loading} 
          size="lg" 
          className="w-full max-w-[250px] shadow-cinematic"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Models...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 mr-2" />
              Test All Models
            </>
          )}
        </Button>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Diagnostic Results
            </DialogTitle>
          </DialogHeader>
          
          {results && (
            <div className="space-y-6 pt-4">
              <div className="flex gap-4 justify-center">
                <div className="text-center px-4 py-2 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase">Total</p>
                  <p className="text-xl font-bold">{results.summary?.total || 0}</p>
                </div>
                <div className="text-center px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-emerald-500 uppercase">Success</p>
                  <p className="text-xl font-bold text-emerald-500">{results.summary?.success || 0}</p>
                </div>
                <div className="text-center px-4 py-2 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-xs text-destructive uppercase">Failed</p>
                  <p className="text-xl font-bold text-destructive">{results.summary?.failed || 0}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 ash-scroll">
                {results.results?.map((res, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {res.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-bold font-mono">{res.model}</p>
                        {res.error && <p className="text-xs text-destructive mt-0.5">{res.error}</p>}
                      </div>
                    </div>
                    {res.responseTimeMs && (
                      <Badge variant="outline" className="font-mono text-[10px]">
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

export default TestAllModelsButton;