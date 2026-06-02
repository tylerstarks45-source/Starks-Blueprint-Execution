import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useRoleAwareRendering } from '@/hooks/useRoleAwareRendering.js';
import { useSessionValidation } from '@/hooks/useSessionValidation.js';
import DashboardRouter from '@/components/dashboard/DashboardRouter.jsx';
import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { toast } from 'sonner';

const ProtectedDashboardLoader = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { isAdmin } = useRoleAwareRendering();
  const { isValid, validationError } = useSessionValidation();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || !isValid) {
        toast.error('Session invalid. Please log in.');
        navigate('/login', { replace: true });
        return;
      }

      // If they are trying to access an admin-specific dashboard route but aren't admin
      // (Assuming this loader might be used for strict admin routes in the future)
      // For now, DashboardRouter handles the split, but we ensure they are at least logged in.
      
      setIsChecking(false);
    }
  }, [authLoading, currentUser, isValid, navigate]);

  if (authLoading || isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Securing connection to Command Center...
        </p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Connection Error</h2>
        <p className="text-muted-foreground max-w-md">
          We encountered a security validation error while loading your dashboard.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          <RefreshCcw className="w-4 h-4 mr-2" /> Retry Connection
        </Button>
      </div>
    );
  }

  return <DashboardRouter />;
};

export default ProtectedDashboardLoader;