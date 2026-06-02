import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

export const useAutomationMonitor = (userId) => {
  const [data, setData] = useState({
    deployments: [],
    workflowLogs: [],
    healthStats: [],
    activityLogs: [],
    earnings: [],
    isLoading: true,
    error: null
  });

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const [deployments, workflows, health, activity, earningsRecords] = await Promise.all([
        pb.collection('deployments').getList(1, 10, { filter: `userId="${userId}"`, sort: '-updated', $autoCancel: false }),
        pb.collection('workflow_logs').getList(1, 15, { filter: `userId="${userId}"`, sort: '-created', $autoCancel: false }),
        pb.collection('automation_health').getList(1, 20, { filter: `userId="${userId}"`, $autoCancel: false }),
        pb.collection('activity_logs').getList(1, 20, { filter: `userId="${userId}"`, sort: '-created', $autoCancel: false }),
        pb.collection('earnings').getList(1, 30, { filter: `userId="${userId}"`, sort: '-created', $autoCancel: false })
      ]);

      setData({
        deployments: deployments.items,
        workflowLogs: workflows.items,
        healthStats: health.items,
        activityLogs: activity.items,
        earnings: earningsRecords.items,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error("Error fetching automation data:", err);
      setData(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
    // In a real app with PB real-time, we would subscribe here.
    // pb.collection('deployments').subscribe('*', fetchData);
    return () => {
      // pb.collection('deployments').unsubscribe('*');
    };
  }, [fetchData]);

  const calculateTotalEarnings = () => {
    return data.earnings.reduce((sum, record) => sum + (record.amount || 0), 0);
  };

  const getOverallHealth = () => {
    if (!data.healthStats.length) return 100;
    const total = data.healthStats.reduce((sum, h) => sum + (h.healthScore || 100), 0);
    return Math.round(total / data.healthStats.length);
  };

  const executeAction = async (systemId, actionType, description) => {
    try {
      await pb.collection('activity_logs').create({
        userId,
        systemId,
        actionType,
        description
      }, { $autoCancel: false });
      toast.success(`${actionType} command executed.`);
      fetchData();
    } catch (err) {
      toast.error(`Failed to execute ${actionType}`);
    }
  };

  return {
    ...data,
    refresh: fetchData,
    totalEarnings: calculateTotalEarnings(),
    overallHealth: getOverallHealth(),
    executeAction
  };
};