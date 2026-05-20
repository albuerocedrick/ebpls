import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader, RefreshCw, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Select from '../../components/ui/Select';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS, STATUSES } from '../../utils/constants';
import toast from 'react-hot-toast';

const ApplicationExplorer = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page,
        limit: 50,
      });
      if (searchTerm) query.append('search', searchTerm);
      if (statusFilter) query.append('status', statusFilter);

      const res = await apiClient.get(`${API_ENDPOINTS.ADMIN_APPLICATIONS}?${query.toString()}`);
      if (res?.success) {
        setApplications(res.data);
        setTotal(res.meta?.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [page, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const statusColors = {
    [STATUSES.PENDING]: 'bg-yellow-100 text-yellow-800',
    [STATUSES.UNDER_REVIEW]: 'bg-blue-100 text-blue-800',
    [STATUSES.VERIFIED]: 'bg-indigo-100 text-indigo-800',
    [STATUSES.FOR_PAYMENT]: 'bg-purple-100 text-purple-800',
    [STATUSES.PAYMENT_PROCESSING]: 'bg-orange-100 text-orange-800',
    [STATUSES.PAYMENT_FAILED]: 'bg-red-100 text-red-800',
    [STATUSES.ISSUED]: 'bg-green-100 text-green-800',
    [STATUSES.RETURNED]: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Explorer</h1>
          <p className="text-sm text-gray-500 mt-1">
            Master queue of all business applications across the system.
          </p>
        </div>
        <button
          onClick={() => fetchApplications()}
          disabled={loading}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search App No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-800">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              fullWidth={false}
              size="sm"
              className="min-w-[180px]"
            >
              <option value="">All Statuses</option>
              {Object.values(STATUSES)
                .filter((s) => !['Retirement Pending', 'Retirement Assessed', 'Retirement Paid', 'Retired'].includes(s))
                .map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
            </Select>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-gray-100">
          {loading && applications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              <Loader className="animate-spin mx-auto mb-3" size={24} />
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto mb-3 text-gray-200" size={32} />
              <p className="text-sm text-gray-400">No applications found.</p>
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.application_no}
                onClick={() => navigate(`/admin/applications/${app.application_no}`)}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2.5 bg-gray-50 rounded-xl shrink-0 group-hover:bg-gray-100 transition-colors">
                    <FileText size={16} className="text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-gray-900 truncate">{app.business_name || 'N/A'}</p>
                      <span className="text-xs font-mono text-gray-400 shrink-0">{app.application_no}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400 truncate">{app.taxpayer_name || 'No Taxpayer'}</p>
                      <span className="text-gray-200">•</span>
                      <p className="text-xs text-gray-400">{app.type || 'N/A'}</p>
                      <span className="text-gray-200">•</span>
                      <p className="text-xs text-gray-400">{new Date(app.submitted_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusColors[app.status] || 'bg-gray-100 text-gray-800'}`}>
                    {app.status}
                  </span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && applications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing <span className="font-semibold text-gray-700">{applications.length}</span> of <span className="font-semibold text-gray-700">{total}</span> applications
            </p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 border border-gray-200 rounded-2xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <button 
                disabled={applications.length < 50}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationExplorer;
