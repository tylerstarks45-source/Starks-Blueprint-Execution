import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import adminApi from '@/lib/adminApi.js';

const AdminDataContext = createContext(undefined);

export const useAdminData = () => {
  const ctx = useContext(AdminDataContext);
  if (ctx === undefined) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return ctx;
};

export const AdminDataProvider = ({ children }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  const [revenue, setRevenue] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalytics(await adminApi.getAnalytics());
    } catch (e) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      setHealth(await adminApi.getHealth());
    } catch (e) {
      setHealthError(e.message || 'Failed to load health');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      setDashboard(await adminApi.getDashboard());
    } catch (e) {
      setDashboardError(e.message || 'Failed to load dashboard');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      setRevenue(await adminApi.getRevenueActivity());
    } catch (e) {
      setRevenueError(e.message || 'Failed to load revenue activity');
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    loadHealth();
    loadDashboard();
    loadRevenue();
    const id = setInterval(loadHealth, 30000);
    return () => clearInterval(id);
  }, [loadAnalytics, loadHealth, loadDashboard, loadRevenue]);

  const value = {
    analytics,
    loading,
    error,
    reloadAnalytics: loadAnalytics,
    health,
    healthLoading,
    healthError,
    reloadHealth: loadHealth,
    dashboard,
    dashboardLoading,
    dashboardError,
    reloadDashboard: loadDashboard,
    revenue,
    revenueLoading,
    revenueError,
    reloadRevenue: loadRevenue,
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
};

export default AdminDataContext;
