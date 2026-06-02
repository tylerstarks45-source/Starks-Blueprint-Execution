import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';

export const useInvalidSessionHandler = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const clearAuthState = useCallback(() => {
    pb.authStore.clear();
    logout();
  }, [logout]);

  const redirectToLoginWithMessage = useCallback((message) => {
    toast.error(message);
    navigate('/login', { state: { from: location.pathname, reason: message }, replace: true });
  }, [navigate, location]);

  const handleInvalidSession = useCallback((reason = 'Your session has expired.') => {
    clearAuthState();
    redirectToLoginWithMessage(reason);
  }, [clearAuthState, redirectToLoginWithMessage]);

  const detectInvalidSession = useCallback((error) => {
    const status = error?.response?.status || error?.status;
    const isAuthError = status === 401 || error?.message?.toLowerCase().includes('token expired');
    
    if (isAuthError) {
      handleInvalidSession('Session expired. Please log in again.');
      return true;
    }
    return false;
  }, [handleInvalidSession]);

  return {
    handleInvalidSession,
    detectInvalidSession,
    clearAuthState,
    redirectToLoginWithMessage
  };
};