import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, RefreshCw, ArrowUpRight, ArrowDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
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
    const interval = setInterval(() => fetchHealth(false, true), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const dbPct = healthData ? Math.round((healthData.activeConnections / (healthData.maxConnections || 100)) * 100) : 0;
  const storagePct = healthData ? ((healthData.storageSize / (1024 * 1024 * 1024)) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">System Health</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time monitoring of BOSS backend infrastructure.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-200 px-3 py-2 rounded-2xl">
            <Clock size={13} />
            <span>Auto-refresh: 60s</span>
          </div>
          <button
            onClick={() => fetchHealth(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-2xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !healthData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-44 bg-white rounded-3xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : healthData ? (
        <>
          {/* Top Row: Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* API Status — Hero Card */}
            <div className="group bg-gray-900 p-6 rounded-3xl hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] transition-all duration-300 relative overflow-hidden">
              <div className="absolute -bottom-8 -right-8 opacity-5">
                <Activity size={120} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">System Status</p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-2.5 w-2.5">
                    <span className="inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <span className="text-2xl font-extrabold text-white">All Systems Online</span>
                </div>
                <p className="text-xs text-gray-500">
                  Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* DB Connections */}
            <div className="group bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300">
              <div className="flex items-start justify-between mb-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DB Connections</p>
                <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                  <Database size={17} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="text-3xl font-extrabold text-gray-900">{healthData.activeConnections}</span>
                <span className="text-sm text-gray-400 font-medium">/ {healthData.maxConnections || 100}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-gray-800 transition-all duration-700" style={{ width: `${Math.min(dbPct, 100)}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-2.5 font-medium">{dbPct}% pool capacity used</p>
            </div>

            {/* Storage */}
            <div className="group bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300">
              <div className="flex items-start justify-between mb-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Storage</p>
                <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                  <Server size={17} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="text-3xl font-extrabold text-gray-900">{formatBytes(healthData.storageSize)}</span>
                <span className="text-sm text-gray-400 font-medium">/ 1 GB</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-gray-800 transition-all duration-700" style={{ width: `${Math.min(storagePct, 100)}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-2.5 font-medium">{storagePct.toFixed(1)}% of free tier used</p>
            </div>
          </div>

          {/* Bottom Row: Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* API Traffic */}
            <div className="group bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">API Traffic Volume</p>
                  <p className="text-xs text-gray-400 mt-1">Since last server restart</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                  <ArrowUpRight size={17} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Reads (GET)</p>
                  <span className="text-2xl font-extrabold text-gray-900">{healthData.apiReads || 0}</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Writes (POST)</p>
                  <span className="text-2xl font-extrabold text-gray-900">{healthData.apiWrites || 0}</span>
                </div>
              </div>
            </div>

            {/* Error Rate */}
            <div className="group bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Error Rate</p>
                  <p className="text-xs text-gray-400 mt-1">Application exceptions</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                  <AlertTriangle size={17} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${(healthData.errorRate || 0) === 0 ? 'bg-gray-50' : 'bg-red-50'}`}>
                  {(healthData.errorRate || 0) === 0
                    ? <CheckCircle size={24} className="text-gray-400" />
                    : <AlertTriangle size={24} className="text-red-500" />
                  }
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-gray-900">{healthData.errorRate || 0}</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(healthData.errorRate || 0) === 0 ? 'No exceptions. System healthy.' : 'Exceptions caught. Review logs.'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
          <Activity size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Unable to load system health data.</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
