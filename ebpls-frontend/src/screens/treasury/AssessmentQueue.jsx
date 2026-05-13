import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Loader2, RefreshCw, Filter, X } from 'lucide-react';
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

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, applications]);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/treasury/queue');
      if (res.success) {
        setApplications(res.data);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const applyFilters = () => {
    let result = [...applications];

    // 1. Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(app => 
        app.application_no.toLowerCase().includes(term) || 
        app.businesses?.business_name?.toLowerCase().includes(term)
      );
    }

    // 2. Status Filter
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
    { label: 'Processing', value: STATUSES.PAYMENT_PROCESSING }
  ];

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      <p className="text-white/40 text-sm font-mono tracking-widest">LOADING QUEUE...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 treasury-canvas p-2">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Treasury Queue</h1>
          <p className="text-white/40 text-xs font-mono mt-1">TOTAL PENDING: {applications.length}</p>
        </div>
        <button 
          onClick={fetchQueue} 
          className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all active:rotate-180 duration-500"
          title="Refresh Queue"
        >
          <RefreshCw size={20}/>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input 
            type="text"
            placeholder="Search by App No or Business Name..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white 
                       placeholder:text-white/20 outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap
                ${statusFilter === opt.value 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-white/40 hover:text-white/70'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-sm shadow-2xl">
        <div className="grid grid-cols-4 px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest border-b border-white/10 bg-white/5">
          <span>App No</span>
          <span>Business</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>
        
        {filteredApps.length > 0 ? (
          filteredApps.map(app => (
            <div key={app.application_no} className="grid grid-cols-4 px-6 py-4 items-center border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
              <span className="font-mono text-white text-sm group-hover:text-blue-400 transition-colors">{app.application_no}</span>
              <span className="text-white/70 text-sm truncate font-medium">{app.businesses?.business_name}</span>
              <div className="flex items-center"><Badge status={app.status} size="sm" /></div>
              <div className="text-right">
                <Button 
                  size="sm" 
                  variant="primary" 
                  className="!py-1.5 !px-4"
                  onClick={() => navigate(`/treasury/assess/${app.application_no}`)}
                  rightIcon={<ArrowRight size={14} />}
                >
                  Process
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <Filter size={40} className="text-white/10" />
            <div>
              <p className="text-white/40 font-medium">No matching applications found</p>
              <p className="text-white/20 text-xs font-mono mt-1 uppercase tracking-widest">Adjust filters or search term</p>
            </div>
            { (searchTerm || statusFilter !== 'ALL') && (
              <button 
                onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
                className="text-blue-400/60 hover:text-blue-400 text-xs font-bold uppercase tracking-widest mt-2"
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