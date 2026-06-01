import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useRoleAwareRendering } from '@/hooks/useRoleAwareRendering.js';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = ({ children, requiredRole, fallback }) => {
  const { currentUser, isLoading, isAuthenticated } = useAuth();
  const { canRender } = useRoleAwareRendering();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !currentUser) {
        toast.error('Please log in to access this page.');
        navigate('/login', { state: { from: location.pathname }, replace: true });
        return;
      }

      if (requiredRole && !canRender(requiredRole)) {
        toast.error('Unauthorized access. Redirecting to dashboard.');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, currentUser, requiredRole, canRender, navigate, location]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Verifying credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return null; // Will redirect in useEffect
  }

  if (requiredRole && !canRender(requiredRole)) {
    return fallback || null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;