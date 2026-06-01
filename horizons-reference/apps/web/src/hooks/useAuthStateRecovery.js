import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

export const useAuthStateRecovery = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [recovered, setRecovered] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const recoverState = () => {
      if (pb.authStore.isValid && pb.authStore.model) {
        const model = pb.authStore.model;
        setUser(model);
        
        // Safely extract role, defaulting to 'USER'
        const userRole = model.role || (model.email === 'admin@starks.com' ? 'SUPER_ADMIN' : 'USER');
        setRole(userRole);
        
        // Extract permissions if they exist on the model, otherwise provide defaults based on role
        const userPermissions = model.permissions || (userRole === 'SUPER_ADMIN' ? ['all'] : ['read:own']);
        setPermissions(userPermissions);
        
        setRecovered(true);
      } else {
        setUser(null);
        setRole(null);
        setPermissions([]);
        setRecovered(false);
      }
    };

    if (!authLoading) {
      recoverState();
    }
  }, [authLoading, currentUser]);

  return { recovered, user, role, permissions, isLoading: authLoading };
};