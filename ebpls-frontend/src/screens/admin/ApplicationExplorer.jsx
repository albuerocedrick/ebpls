import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader, RefreshCw, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-md shadow-sm border text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={18} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
            >
              <option value="">All Statuses</option>
              {Object.values(STATUSES)
                .filter((s) => !['Retirement Pending', 'Retirement Assessed', 'Retirement Paid', 'Retired'].includes(s))
                .map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">App No.</th>
                <th className="px-6 py-4 font-semibold">Business / Taxpayer</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Submitted</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && applications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Loader className="animate-spin mx-auto mb-4" size={24} />
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-4 text-gray-400" size={32} />
                    No applications found.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.application_no} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {app.application_no}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{app.business_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{app.taxpayer_name || 'No Taxpayer Info'} • {app.taxpayer_email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {app.type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[app.status] || 'bg-gray-100 text-gray-800'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/admin/applications/${app.application_no}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && applications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-sm text-gray-600">
            <div>
              Showing <span className="font-medium">{applications.length}</span> of <span className="font-medium">{total}</span> applications
            </div>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={applications.length < 50}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
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
