import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async (force = false, bgSync = false) => {
    if (!bgSync) setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN_HEALTH);
      if (res?.success) {
        setHealthData(res.data);
        if (force) toast.success('Dashboard refreshed');
      }
    } catch (err) {
      if (!bgSync) toast.error('Failed to load system health');
    } finally {
      if (!bgSync) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Poll the health endpoint every 60 seconds (aligned with backend TTL)
    const interval = setInterval(() => {
      fetchHealth(false, true);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time monitoring of eBPLS backend infrastructure.
          </p>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          disabled={loading}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-md shadow-sm border text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && !healthData ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
          <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
          <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
        </div>
      ) : healthData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* DB Connections Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">DB Connections Capacity</h3>
              <Database size={20} className="text-blue-500" />
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {healthData.activeConnections}
                </span>
                <span className="text-sm text-gray-500">
                  / {healthData.maxConnections || 100} limit
                </span>
              </div>
              {/* Connection progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    (healthData.activeConnections / (healthData.maxConnections || 100)) > 0.8
                      ? 'bg-red-500'
                      : (healthData.activeConnections / (healthData.maxConnections || 100)) > 0.5
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      ((healthData.activeConnections / (healthData.maxConnections || 100)) * 100),
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {Math.round((healthData.activeConnections / (healthData.maxConnections || 100)) * 100)}% active connections pool capacity
            </p>
          </div>

          {/* Storage Capacity Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Storage Plan Capacity</h3>
              <Server size={20} className="text-purple-500" />
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {formatBytes(healthData.storageSize)}
                </span>
                <span className="text-sm text-gray-500">
                  / 1.00 GB plan quota
                </span>
              </div>
              {/* Storage progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-purple-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      (healthData.storageSize / (1024 * 1024 * 1024)) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {((healthData.storageSize / (1024 * 1024 * 1024)) * 100).toFixed(2)}% of 1 GB Free Tier limit used
            </p>
          </div>

          {/* API Status Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">API Status</h3>
              <Activity size={20} className="text-green-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <div className="text-3xl font-bold text-gray-900">Online</div>
            </div>
            <p className="text-xs text-gray-500">
              Last check: {new Date(healthData.timestamp).toLocaleTimeString()}
            </p>
          </div>

          {/* Traffic Volume Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">API Traffic Volume</h3>
              <Activity size={20} className="text-blue-500" />
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-400 mb-1">Reads (GET)</p>
                <div className="text-3xl font-bold text-gray-900">{healthData.apiReads || 0}</div>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Writes (Mutations)</p>
                <div className="text-3xl font-bold text-gray-900">{healthData.apiWrites || 0}</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Total requests handled since last server restart
            </p>
          </div>

          {/* Application Errors Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Application Error Rate</h3>
              <Activity size={20} className={(healthData.errorRate || 0) > 0 ? "text-red-500" : "text-green-500"} />
            </div>
            <div className={`text-3xl font-bold ${(healthData.errorRate || 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
              {healthData.errorRate || 0}
            </div>
            <p className="text-xs text-gray-500">
              {(healthData.errorRate || 0) === 0 ? 'Zero server exceptions logged. System healthy.' : 'Exceptions caught. Review logs.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed">
          <p className="text-gray-500">No data available.</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
