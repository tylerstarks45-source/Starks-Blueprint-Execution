import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedAdminRoute = ({ children }) => {
  const { currentUser, currentUserRole, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !currentUser) {
        toast.error('Please log in to access this page.');
        navigate('/login', { state: { from: location.pathname }, replace: true });
        return;
      }

      if (currentUserRole !== 'SUPER_ADMIN') {
        toast.error('Access denied. Admin privileges required.');
        navigate('/user-dashboard', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, currentUser, currentUserRole, navigate, location]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Verifying admin credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser || currentUserRole !== 'SUPER_ADMIN') {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;