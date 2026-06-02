import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';

export const useRoleAwareRendering = () => {
  const { currentUser } = useAuth();

  const getRoleLevel = useCallback((role) => {
    if (!role) return 0;
    const normalizedRole = role.toUpperCase();
    if (normalizedRole === 'SUPER_ADMIN') return 3;
    if (normalizedRole === 'ADMIN') return 2;
    if (normalizedRole === 'USER') return 1;
    return 0;
  }, []);

  const userRole = currentUser?.role || (currentUser?.email === 'admin@starks.com' ? 'SUPER_ADMIN' : 'USER');
  const currentLevel = getRoleLevel(userRole);

  const canRender = useCallback((requiredRole) => {
    if (!requiredRole) return true;
    const requiredLevel = getRoleLevel(requiredRole);
    return currentLevel >= requiredLevel;
  }, [currentLevel, getRoleLevel]);

  const isAdmin = useCallback(() => {
    return currentLevel >= 2;
  }, [currentLevel]);

  const isSuperAdmin = useCallback(() => {
    return currentLevel === 3;
  }, [currentLevel]);

  return {
    canRender,
    getRoleLevel,
    isAdmin,
    isSuperAdmin
  };
};