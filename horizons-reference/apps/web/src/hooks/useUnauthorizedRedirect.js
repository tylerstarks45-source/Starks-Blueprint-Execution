import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

export const useUnauthorizedRedirect = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectToLogin = useCallback((reason = 'Please log in to continue.') => {
    toast.error(reason);
    navigate('/login', { state: { from: location.pathname, reason }, replace: true });
  }, [navigate, location]);

  const redirectToDashboard = useCallback((message = 'You do not have permission to access this area.') => {
    toast.error(message);
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handlePermissionError = useCallback((error) => {
    const status = error?.response?.status || error?.status;
    if (status === 403) {
      redirectToDashboard('Access denied. Insufficient permissions.');
      return true;
    }
    return false;
  }, [redirectToDashboard]);

  const handleAuthError = useCallback((error) => {
    const status = error?.response?.status || error?.status;
    if (status === 401) {
      redirectToLogin('Session expired or invalid. Please log in again.');
      return true;
    }
    return false;
  }, [redirectToLogin]);

  // Optional auto-monitor
  useEffect(() => {
    if (currentUser === null && !isAuthenticated && location.pathname !== '/login') {
      // We don't auto-redirect here to avoid loops on public pages, 
      // but this hook can be expanded if strict global protection is needed.
    }
  }, [currentUser, isAuthenticated, location.pathname]);

  return {
    redirectToLogin,
    redirectToDashboard,
    handlePermissionError,
    handleAuthError
  };
};