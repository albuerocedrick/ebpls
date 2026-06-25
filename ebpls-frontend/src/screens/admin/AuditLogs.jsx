import React, { useState, useEffect } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import Select from '../../components/ui/Select';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';
import toast from 'react-hot-toast';


const ACTION_COLORS = {
  APPLICATION_VERIFIED: 'text-gray-700 bg-gray-200',
  APPLICATION_RETURNED: 'text-gray-200 bg-gray-800',
  APPLICATION_STATUS_UPDATED: 'text-gray-600 bg-gray-100',
  FEE_ASSESSED: 'text-gray-700 bg-gray-200',
  FEE_OVERRIDE: 'text-gray-400 bg-gray-100',
  OTC_PAYMENT_RECORDED: 'text-white bg-gray-900',
  ONLINE_PAYMENT_INITIATED: 'text-gray-800 bg-gray-300',
  REQUIREMENT_UPLOADED: 'text-gray-600 bg-gray-100',
};

const getPaymentAmount = (log) => {
  if (!log) return null;
  const sources = [
    log.new_value?.amount,
    log.new_value?.amount_tendered,
    log.new_value?.total_amount,
    log.new_value?.amount_due,
    log.old_value?.amount,
    log.old_value?.amount_tendered,
    log.old_value?.total_amount,
    log.old_value?.amount_due,
  ];
  for (const val of sources) {
    if (val !== undefined && val !== null && !isNaN(Number(val))) {
      return Number(val);
    }
  }
  return null;
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  // To view details
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (filterAction) params.append('action', filterAction);
      if (filterRole) params.append('role', filterRole);

      const res = await apiClient.get(`${API_ENDPOINTS.ADMIN_AUDIT_LOGS}?${params.toString()}`);
      
      if (res?.success) {
        setLogs(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalRecords(res.pagination.total);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, filterRole]);

  const handleFilterSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionStyle = (action) => {
    return ACTION_COLORS[action] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          DPA 2012 compliance log — all system mutations are recorded immutably.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <form onSubmit={handleFilterSubmit} className="flex-1 flex gap-3 flex-wrap">
          <div className="w-64">
            <Select
              label="Action Type"
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              size="sm"
              className="min-w-[180px]"
            >
              <option value="">All Actions</option>
              {Object.keys(ACTION_COLORS).map(action => (
                <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </div>
          <div className="w-64">
            <Select
              label="Actor Role"
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              size="sm"
              className="min-w-[180px]"
            >
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="BPLO_Officer">BPLO Officer</option>
              <option value="Treasury_Officer">Treasury Officer</option>
              <option value="Barangay_Officer">Barangay Officer</option>
              <option value="Applicant">Applicant</option>
            </Select>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              <tr>
                <th className="px-6 py-4 w-44">Timestamp</th>
                <th className="px-6 py-4 w-52">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4 w-36">Entity ID</th>
                <th className="px-6 py-4 w-20 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-3" />
                    Loading compliance logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.04)] transition-all duration-200">
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-gray-900">{log.users?.email || 'System'}</div>
                      <div className="text-gray-400 mt-0.5">{log.users?.roles?.role_name || 'SYSTEM_ROLE'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border border-transparent ${getActionStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500 truncate max-w-[150px]">
                      {log.entity_id}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-all"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Showing <span className="font-semibold text-gray-700">{logs.length}</span> of <span className="font-semibold text-gray-700">{totalRecords}</span> logs
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 border border-gray-200 rounded-2xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-4 py-2 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* JSON Viewer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <ScrollText size={16} className="text-blue-600" />
                Immutable Log Record
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {(() => {
                const paymentAmount = getPaymentAmount(selectedLog);
                return (
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Action</span>
                      <span className="font-medium text-gray-900">{selectedLog.action}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Entity</span>
                      <span className="font-mono text-xs bg-gray-200/60 text-gray-700 px-1.5 py-0.5 rounded">{selectedLog.entity_type}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Actor ID</span>
                      <span className="font-mono text-xs text-gray-600">{selectedLog.user_id || 'System'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Timestamp</span>
                      <span className="font-mono text-xs text-gray-600">{new Date(selectedLog.created_at).toLocaleString()}</span>
                    </div>
                    {paymentAmount !== null && (
                      <div className="col-span-2 pt-2 border-t border-gray-200/60 mt-2">
                        <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Amount</span>
                        <span className="font-bold text-emerald-600 text-lg bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 inline-flex items-center gap-1">
                          ₱ {paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <div className="space-y-4">
                {selectedLog.old_value && (
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      Before Mutation
                    </h4>
                    <pre className="bg-[#fdf8f6] text-[#c53030] p-4 rounded-xl text-xs font-mono overflow-x-auto border border-[#fed7d7] shadow-inner">
                      {JSON.stringify(selectedLog.old_value, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_value && (
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      After Mutation
                    </h4>
                    <pre className="bg-[#f0fff4] text-[#276749] p-4 rounded-xl text-xs font-mono overflow-x-auto border border-[#c6f6d5] shadow-inner">
                      {JSON.stringify(selectedLog.new_value, null, 2)}
                    </pre>
                  </div>
                )}
                {!selectedLog.old_value && !selectedLog.new_value && (
                  <div className="text-center py-8 text-gray-400 text-sm italic">
                    No payload data captured for this action.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
