import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Loader2, RefreshCw, Filter, X, ClipboardList } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { STATUSES } from '../../utils/constants';

const AssessmentQueue = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => { fetchQueue(); }, []);

  useEffect(() => { applyFilters(); }, [searchTerm, statusFilter, applications]);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/treasury/queue');
      if (res.success) setApplications(res.data);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const applyFilters = () => {
    let result = [...applications];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(app =>
        app.application_no.toLowerCase().includes(term) ||
        app.businesses?.business_name?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(app => app.status === statusFilter);
    }
    setFilteredApps(result);
  };

  const filterOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Verified', value: STATUSES.VERIFIED },
    { label: 'For Assessment', value: STATUSES.FOR_ASSESSMENT },
    { label: 'Assessed', value: STATUSES.ASSESSED },
    { label: 'For Payment', value: STATUSES.FOR_PAYMENT },
    { label: 'Processing', value: STATUSES.PAYMENT_PROCESSING },
  ];

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
      <p className="text-gray-400 text-sm">Loading queue...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Treasury Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {applications.length} application{applications.length !== 1 ? 's' : ''} pending
          </p>
        </div>
        <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={fetchQueue}>
          Refresh
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by App No or Business Name..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-11 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl overflow-x-auto">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={[
                'px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
                statusFilter === opt.value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-4 px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
          <span>App No</span>
          <span>Business</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {/* Table Body */}
        {filteredApps.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredApps.map(app => (
              <div key={app.application_no} className="grid grid-cols-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors group">
                <span className="font-mono text-sm font-semibold text-gray-900">{app.application_no}</span>
                <span className="text-sm text-gray-600 truncate font-medium">{app.businesses?.business_name}</span>
                <div><Badge status={app.status} size="sm" /></div>
                <div className="text-right">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(`/treasury/assess/${app.application_no}`)}
                    rightIcon={<ArrowRight size={14} />}
                  >
                    Process
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <ClipboardList size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400">No matching applications found.</p>
            {(searchTerm || statusFilter !== 'ALL') && (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentQueue;
