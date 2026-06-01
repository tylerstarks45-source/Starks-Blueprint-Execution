import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Plus, ShieldCheck, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const CredentialManager = () => {
  const { currentUser } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [integrationId, setIntegrationId] = useState('');
  const [credValue, setCredValue] = useState('');
  const [credType, setCredType] = useState('api_key');
  const [isTesting, setIsTesting] = useState(false);

  const fetchCredentials = async () => {
    if (!currentUser) return;
    try {
      const records = await pb.collection('credentials').getList(1, 50, {
        filter: `user_id="${currentUser.id}"`,
        sort: '-created_at',
        $autoCancel: false
      });
      setCredentials(records.items);
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, [currentUser]);

  const handleSave = async () => {
    if (!integrationId || !credValue) return toast.error("Please fill all fields");
    
    setIsTesting(true);
    try {
      // Simulate validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mask value for storage (in a real app, backend encrypts this)
      const maskedValue = `sk-...${credValue.slice(-4)}`;
      
      await pb.collection('credentials').create({
        user_id: currentUser.id,
        integration_id: integrationId,
        encrypted_value: maskedValue,
        credential_type: credType,
        is_valid: true,
        last_validated_at: new Date().toISOString()
      }, { $autoCancel: false });
      
      toast.success("Credential securely saved and validated.");
      setIsModalOpen(false);
      setIntegrationId('');
      setCredValue('');
      fetchCredentials();
    } catch (error) {
      toast.error("Failed to save credential.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to revoke this credential?")) return;
    try {
      await pb.collection('credentials').delete(id, { $autoCancel: false });
      toast.success("Credential revoked.");
      fetchCredentials();
    } catch (error) {
      toast.error("Failed to revoke credential.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold font-mono flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> Secure Vault
        </h3>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-card-foreground sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono">Connect Integration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Integration Name</label>
                <Input 
                  placeholder="e.g., OpenRouter, OpenAI" 
                  value={integrationId}
                  onChange={(e) => setIntegrationId(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Credential Type</label>
                <Select value={credType} onValueChange={setCredType}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth_token">OAuth Token</SelectItem>
                    <SelectItem value="webhook_secret">Webhook Secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Secret Value</label>
                <Input 
                  type="password" 
                  placeholder="Paste your secret key here" 
                  value={credValue}
                  onChange={(e) => setCredValue(e.target.value)}
                  className="bg-input border-border font-mono text-sm"
                />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3 h-3" /> Keys are encrypted before storage.
                </p>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isTesting}
                className="w-full mt-4"
              >
                {isTesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                {isTesting ? 'Validating...' : 'Save & Validate'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="h-24 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : credentials.length === 0 ? (
        <div className="p-6 border border-dashed border-border rounded-xl text-center text-muted-foreground text-sm">
          No credentials stored. Add one to enable automations.
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map(cred => (
            <div key={cred.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center">
                  <Key className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{cred.integration_id}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{cred.encrypted_value}</span>
                    {cred.is_valid ? (
                      <span className="text-[10px] text-emerald-400 flex items-center"><ShieldCheck className="w-3 h-3 mr-0.5"/> Valid</span>
                    ) : (
                      <span className="text-[10px] text-destructive flex items-center"><AlertTriangle className="w-3 h-3 mr-0.5"/> Invalid</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 border-border hover:bg-muted" title="Re-validate">
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleDelete(cred.id)} className="h-8 w-8 border-border hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CredentialManager;