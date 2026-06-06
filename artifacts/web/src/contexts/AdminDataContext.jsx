import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const [revenueRefreshing, setRevenueRefreshing] = useState(false);
  const [revenueError, setRevenueError] = useState(null);
  const [revenueLastUpdated, setRevenueLastUpdated] = useState(null);
  const revenueLoadedRef = useRef(false);

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
    if (revenueLoadedRef.current) {
      setRevenueRefreshing(true);
    } else {
      setRevenueLoading(true);
    }
    setRevenueError(null);
    try {
      setRevenue(await adminApi.getRevenueActivity());
      setRevenueLastUpdated(new Date());
      revenueLoadedRef.current = true;
    } catch (e) {
      setRevenueError(e.message || 'Failed to load revenue activity');
    } finally {
      setRevenueLoading(false);
      setRevenueRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    loadHealth();
    loadDashboard();
    loadRevenue();
    const healthId = setInterval(loadHealth, 30000);
    const revenueId = setInterval(loadRevenue, 60000);
    return () => {
      clearInterval(healthId);
      clearInterval(revenueId);
    };
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
    revenueRefreshing,
    revenueError,
    revenueLastUpdated,
    reloadRevenue: loadRevenue,
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
};

export default AdminDataContext;
