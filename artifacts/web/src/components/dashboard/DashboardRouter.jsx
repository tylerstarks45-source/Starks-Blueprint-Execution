import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2 } from 'lucide-react';
import AdminDashboardLayout from './admin/AdminDashboardLayout.jsx';
import UserDashboardLayout from './user/UserDashboardLayout.jsx';

const ADMIN_EMAILS = ['tylerstarks45@gmail.com', 'tylerstarks77@gmail.com'];
const ADMIN_ROLES = ['admin', 'ADMIN', 'SUPER_ADMIN', 'FOUNDER_ADMIN'];

const DashboardRouter = () => {
  const { role: dashboardRole, isLoading } = useDashboard();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Prefer the live role from the auth context (set on login, fully reactive)
  // and fall back to the dashboard context / localStorage value. This avoids a
  // stale-role race where a fresh admin login lands on the user dashboard until
  // a full page reload.
  const role = currentUser?.role || dashboardRole;

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

  const isAdminUser =
    ADMIN_ROLES.includes(role) &&
    ADMIN_EMAILS.includes(currentUser?.email);

  if (isAdminUser) {
    return <AdminDashboardLayout />;
  }

  return <UserDashboardLayout />;
};

export default DashboardRouter;
