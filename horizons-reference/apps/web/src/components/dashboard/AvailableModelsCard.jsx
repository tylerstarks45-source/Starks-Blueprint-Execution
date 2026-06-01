import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Box, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';

const AvailableModelsCard = () => {
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
      // Handle both direct array and wrapped object responses
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
    <Card className="cinematic-card h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <Box className="w-5 h-5 text-secondary" /> Available Models
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchModels} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-grow overflow-auto max-h-[300px]">
        {loading && models.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading models...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-destructive">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchModels}>Retry</Button>
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No models available.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Cost / 1k</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model, idx) => (
                <TableRow key={idx} className="border-border/50">
                  <TableCell className="font-medium text-xs">{model.name || model.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] bg-muted/50">
                      {model.provider || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-muted-foreground">
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

export default AvailableModelsCard;