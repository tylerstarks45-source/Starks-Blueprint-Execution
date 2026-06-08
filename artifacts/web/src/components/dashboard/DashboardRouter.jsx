import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2 } from 'lucide-react';
import AdminDashboardLayout from './admin/AdminDashboardLayout.jsx';
import UserDashboardLayout from './user/UserDashboardLayout.jsx';

// Only this specific email may see the admin dashboard.
const ADMIN_EMAIL = 'tylerstarks45@gmail.com';
const ADMIN_ROLES = ['admin', 'ADMIN', 'SUPER_ADMIN', 'FOUNDER_ADMIN'];

const DashboardRouter = () => {
  const { role, isLoading } = useDashboard();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const validRoles = ['admin', 'ADMIN', 'SUPER_ADMIN', 'FOUNDER_ADMIN', 'USER'];
    if (!isLoading && role && !validRoles.includes(role)) {
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

  // Admin layout ONLY for the authorised founder email — role alone is not enough
  const isAdminUser =
    ADMIN_ROLES.includes(role) &&
    currentUser?.email === ADMIN_EMAIL;

  if (isAdminUser) {
    return <AdminDashboardLayout />;
  }

  return <UserDashboardLayout />;
};

export default DashboardRouter;
