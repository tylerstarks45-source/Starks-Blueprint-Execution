import React from 'react';
import DashboardPage from '@/pages/DashboardPage.jsx';

// The admin command center is rendered by DashboardPage -> DashboardRouter,
// which mounts AdminDashboardLayout for SUPER_ADMIN/admin roles. This route
// (/admin-dashboard, /admin/*) reuses that flow so admins land on the real
// analytics command center rather than a static placeholder.
const AdminDashboard = () => <DashboardPage />;

export default AdminDashboard;
