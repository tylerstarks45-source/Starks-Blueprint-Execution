import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Box, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';

const AINetworkModelsCard = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiServerClient.fetch('/ai/openrouter/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      setModels(Array.isArray(data) ? data : data.models || []);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20 h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
            <Box className="w-5 h-5 text-secondary" /> AI Network Models
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchModels} disabled={loading} className="hover:bg-muted/50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-grow overflow-auto max-h-[300px] custom-scrollbar">
        {loading && models.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-primary/50" />
            <p className="text-sm font-medium">Syncing network models...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-destructive">
            <AlertCircle className="w-6 h-6 mb-3 opacity-80" />
            <p className="text-sm mb-4 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchModels} className="transition-all active:scale-95">Retry Connection</Button>
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm font-medium">No models available in network.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Model</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Network</TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Cost / 1k</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model, idx) => (
                <TableRow key={idx} className="border-border/20 hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-sm text-foreground/90">{model.name || model.id}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] bg-muted/40 font-medium text-muted-foreground">
                      {model.provider || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-muted-foreground/80">
                    ${model.costPer1k || '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AINetworkModelsCard;