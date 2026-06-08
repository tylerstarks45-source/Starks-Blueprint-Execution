import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const withAdminProtection = (WrappedComponent) => {
  return function AdminProtectedComponent(props) {
    const { currentUser, isLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated || !currentUser) {
          toast.error('Please log in to access this area.');
          navigate('/login', { state: { from: location.pathname }, replace: true });
          return;
        }

        const role = currentUser?.role?.toUpperCase();
        const ALLOWED = ['SUPER_ADMIN', 'ADMIN', 'FOUNDER_ADMIN'];
        if (!ALLOWED.includes(role)) {
          toast.error('Access denied. Administrator privileges required.');
          navigate('/dashboard', { replace: true });
        }
      }
    }, [isLoading, isAuthenticated, currentUser, navigate, location]);

    if (isLoading) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground animate-pulse">Verifying security clearance...</p>
        </div>
      );
    }

    const role = currentUser?.role?.toUpperCase();
    const ALLOWED = ['SUPER_ADMIN', 'ADMIN', 'FOUNDER_ADMIN'];
    if (!isAuthenticated || !currentUser || !ALLOWED.includes(role)) {
      return null; // Will redirect in useEffect
    }

    return <WrappedComponent {...props} />;
  };
};