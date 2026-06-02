import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

export const useSessionValidation = () => {
  const { currentUser, logout } = useAuth();
  const [isValid, setIsValid] = useState(true);
  const [lastValidated, setLastValidated] = useState(Date.now());
  const [validationError, setValidationError] = useState(null);

  const validateSession = useCallback(() => {
    if (!currentUser || !pb.authStore.isValid) {
      setIsValid(false);
      return false;
    }

    try {
      const token = pb.authStore.token;
      if (!token) {
        throw new Error('No token found');
      }

      // Decode JWT payload to check expiration
      const payloadBase64 = token.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);
      
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();

      if (currentTime >= expirationTime) {
        throw new Error('Token expired');
      }

      setIsValid(true);
      setLastValidated(currentTime);
      setValidationError(null);
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      setIsValid(false);
      setValidationError(error.message);
      logout();
      return false;
    }
  }, [currentUser, logout]);

  useEffect(() => {
    // Validate immediately on mount
    validateSession();

    // Validate every 5 minutes (300000 ms)
    const intervalId = setInterval(validateSession, 300000);

    return () => clearInterval(intervalId);
  }, [validateSession]);

  return { isValid, lastValidated, validationError };
};