import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext.jsx';
import { Loader2 } from 'lucide-react';
import AdminDashboardLayout from './admin/AdminDashboardLayout.jsx';
import UserDashboardLayout from './user/UserDashboardLayout.jsx';

const DashboardRouter = () => {
  const { role, isLoading } = useDashboard();
  const navigate = useNavigate();

  useEffect(() => {
    const validRoles = ['admin', 'ADMIN', 'SUPER_ADMIN', 'FOUNDER_ADMIN', 'USER'];
    
    if (!isLoading && role && !validRoles.includes(role)) {
      console.warn(`Invalid role detected: ${role}. Redirecting to login.`);
      navigate('/login', { replace: true });
    }
  }, [isLoading, role, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Loading dashboard...</p>
      </div>
    );
  }

  // Render Admin layout for all admin roles
  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'admin' || role === 'FOUNDER_ADMIN') {
    return <AdminDashboardLayout />;
  }

  // Default to User layout for 'USER' or any other valid role
  return <UserDashboardLayout />;
};

export default DashboardRouter;