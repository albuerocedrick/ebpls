import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  Pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' },
  Sent: { icon: CheckCircle, color: 'text-gray-900', bg: 'bg-gray-100' },
  Failed: { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50' },
  Skipped: { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-50' },
};

const EmailLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  const [filterEvent, setFilterEvent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (filterEvent) params.append('trigger_event', filterEvent);
      if (filterStatus) params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiClient.get(`${API_ENDPOINTS.ADMIN_EMAIL_LOGS}?${params.toString()}`);
      if (response?.success) {
        setLogs(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalRecords(response.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
      toast.error('Failed to fetch email logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterEvent, filterStatus]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Email Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and audit outbound transactional email dispatch events.
          </p>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} 
          onClick={fetchLogs}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      
      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <form 
          onSubmit={(e) => { e.preventDefault(); setPage(1); fetchLogs(); }} 
          className="flex-1 flex gap-3 flex-wrap items-end"
        >
          <div className="w-64 min-w-[200px]">
            <Select
              label="Trigger Event"
              value={filterEvent}
              onChange={(e) => { setFilterEvent(e.target.value); setPage(1); }}
              size="sm"
              className="min-w-[200px]"
            >
              <option value="">All Events</option>
              <option value="ACCOUNT_CREATED">ACCOUNT_CREATED</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET</option>
              <option value="APPLICATION_SUBMITTED">APPLICATION_SUBMITTED</option>
              <option value="BARANGAY_CLEARANCE_REJECTED">BARANGAY_CLEARANCE_REJECTED</option>
              <option value="APPLICATION_RETURNED">APPLICATION_RETURNED</option>
              <option value="APPLICATION_VERIFIED">APPLICATION_VERIFIED</option>
              <option value="TOP_GENERATED">TOP_GENERATED</option>
              <option value="PAYMENT_RECORDED">PAYMENT_RECORDED</option>
              <option value="PERMIT_READY">PERMIT_READY</option>
              <option value="RETIREMENT_COMPLETE">RETIREMENT_COMPLETE</option>
            </Select>
          </div>

          <div className="w-48 min-w-[150px]">
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              size="sm"
              className="min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Sent">Sent</option>
              <option value="Failed">Failed</option>
              <option value="Skipped">Skipped</option>
            </Select>
          </div>

          <div className="flex-1 min-w-[280px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Recipient / App No</label>
            <input
              type="text"
              placeholder="Search email address or application number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:ring-4 focus:ring-gray-100 focus:border-gray-400 focus:bg-white transition-all"
            />
          </div>

          <button 
            type="submit" 
            className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-sm font-medium transition-all"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
          <Mail size={15} className="text-gray-400" />
          <p className="text-sm font-bold text-gray-900">Recent Dispatch Events</p>
        </div>
        <div>
          <div className="overflow-x-auto">
            <div className="min-w-[1000px] grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1.5fr] px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50/50 border-b border-gray-100">
              <span>Trigger Event / Subject</span>
              <span>Recipient</span>
              <span>Application / Context</span>
              <span>Status</span>
              <span>Retries</span>
              <span>Timestamp</span>
            </div>
            <div className="divide-y divide-border min-w-[1000px]">
              {loading && logs.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  Loading email logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No email logs found.
                </div>
              ) : (
                logs.map((log) => {
                  const StatusIcon = STATUS_CONFIG[log.status]?.icon || Clock;
                  return (
                    <div key={log.id} className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1.5fr] px-4 py-3 text-sm items-start hover:bg-gray-50/50 transition-colors duration-150">
                      
                      {/* Trigger Event & Subject */}
                      <div className="flex flex-col gap-1 pr-4">
                        <span className="font-mono font-semibold text-gray-900 text-xs">
                          {log.trigger_event}
                        </span>
                        <span className="text-xs text-gray-400 line-clamp-2">
                          {log.subject}
                        </span>
                      </div>

                      {/* Recipient */}
                      <div className="flex flex-col pr-4">
                        <span className="text-gray-900 truncate">
                          {log.recipient_name || 'No Name'}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          {log.recipient_email}
                        </span>
                      </div>

                      {/* Context / Application No */}
                      <div className="flex flex-col pr-4">
                        {log.application_no ? (
                          <span className="font-mono font-semibold text-gray-900 text-xs">
                            {log.application_no}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No Application context
                          </span>
                        )}
                        {log.error_message && (
                          <span className="text-xs text-red-500 mt-1 line-clamp-1" title={log.error_message}>
                            Error: {log.error_message}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[log.status]?.color} ${STATUS_CONFIG[log.status]?.bg}`}>
                          <StatusIcon size={12} />
                          {log.status}
                        </span>
                      </div>

                      {/* Retries */}
                      <div className="flex items-center">
                        <span className="font-mono text-gray-400">
                          {log.retry_count}
                        </span>
                      </div>

                      {/* Timestamps */}
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-900">
                          Created: {new Date(log.created_at).toLocaleString()}
                        </span>
                        {log.sent_at && (
                          <span className="text-xs text-green-600">
                            Sent: {new Date(log.sent_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing page <span className="font-semibold text-gray-700">{page}</span> of{' '}
              <span className="font-semibold text-gray-700">{totalPages}</span> ({totalRecords} records)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 border border-gray-200 rounded-2xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
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

export default EmailLogs;
