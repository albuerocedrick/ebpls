import { useState, useEffect } from 'react';
import { ScrollText, Loader2, X } from 'lucide-react';
import Select from '../../components/ui/Select';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';
import toast from 'react-hot-toast';

/**
 * Known audit actions, in rough lifecycle order.
 *
 * @policy  Neutral zinc only — weight, not hue, carries emphasis. A payment
 *          being recorded is the heaviest event in the log, so it gets the
 *          solid zinc-900 fill; routine mutations stay hairline.
 */
const ACTION_STYLES = {
  APPLICATION_VERIFIED: 'bg-zinc-200 text-zinc-700 ring-1 ring-zinc-300',
  APPLICATION_RETURNED: 'bg-zinc-800 text-zinc-100',
  APPLICATION_STATUS_UPDATED: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
  FEE_ASSESSED: 'bg-zinc-200 text-zinc-700 ring-1 ring-zinc-300',
  FEE_OVERRIDE: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
  OTC_PAYMENT_RECORDED: 'bg-zinc-900 text-white',
  ONLINE_PAYMENT_INITIATED: 'bg-zinc-300 text-zinc-800 ring-1 ring-zinc-400',
  REQUIREMENT_UPLOADED: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
};

const DEFAULT_ACTION_STYLE = 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200';

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

  // Loads on mount and whenever the page or a filter changes. The fetch lives
  // inside the effect and does not set state before its first await, so it does
  // not trigger a cascading render.
  useEffect(() => {
    let cancelled = false;

    const fetchLogs = async () => {
      try {
        const params = new URLSearchParams({ page, limit });
        if (filterAction) params.append('action', filterAction);
        if (filterRole) params.append('role', filterRole);

        const res = await apiClient.get(`${API_ENDPOINTS.ADMIN_AUDIT_LOGS}?${params.toString()}`);

        if (cancelled) return;
        if (res?.success) {
          setLogs(res.data);
          setTotalPages(res.pagination.totalPages);
          setTotalRecords(res.pagination.total);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        toast.error('Failed to load audit logs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLogs();
    return () => { cancelled = true; };
  }, [page, filterAction, filterRole]);

  // Changing a filter resets to page 1, which the effect above picks up.
  const handleFilterSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
  };

  const getActionStyle = (action) => ACTION_STYLES[action] || DEFAULT_ACTION_STYLE;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Compliance
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Audit logs
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          DPA 2012 compliance log — all system mutations are recorded immutably.
        </p>
      </div>

      <div className="flex flex-col items-end gap-4 md:flex-row">
        <form onSubmit={handleFilterSubmit} className="flex flex-1 flex-wrap gap-3">
          <div className="w-64">
            <Select
              label="Action Type"
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              size="sm"
            >
              <option value="">All Actions</option>
              {Object.keys(ACTION_STYLES).map(action => (
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

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
              <tr>
                <th className="w-44 px-5 py-3.5 font-normal">Timestamp</th>
                <th className="w-52 px-5 py-3.5 font-normal">Actor</th>
                <th className="px-5 py-3.5 font-normal">Action</th>
                <th className="w-36 px-5 py-3.5 font-normal">Entity ID</th>
                <th className="w-20 px-5 py-3.5 text-center font-normal">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center text-sm text-zinc-500">
                    <Loader2 size={22} className="mx-auto mb-3 animate-spin text-zinc-300" />
                    Loading compliance logs…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center text-sm text-zinc-500">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                    <td className="px-5 py-3.5 font-mono text-[11px] whitespace-nowrap text-zinc-600 tabular-nums">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-medium text-zinc-900">{log.users?.email || 'System'}</div>
                      <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                        {log.users?.roles?.role_name || 'System role'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase ${getActionStyle(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="max-w-[150px] truncate px-5 py-3.5 font-mono text-[11px] text-zinc-500">
                      {log.entity_id}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
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
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <p className="text-xs text-zinc-500">
            Showing <span className="font-mono text-zinc-900 tabular-nums">{logs.length}</span> of{' '}
            <span className="font-mono text-zinc-900 tabular-nums">{totalRecords}</span> logs
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors duration-200 hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              Previous
            </button>
            <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* JSON Viewer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm duration-200 animate-in fade-in">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl duration-200 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ScrollText size={15} className="text-zinc-500" />
                <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                  Immutable log record
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors duration-200 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
              >
                <X size={15} />
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto p-5">
              {(() => {
                const paymentAmount = getPaymentAmount(selectedLog);
                return (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm">
                    <div>
                      <span className="mb-1 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Action</span>
                      <span className="font-medium text-zinc-900">{selectedLog.action.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="mb-1 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Entity</span>
                      <span className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">{selectedLog.entity_type}</span>
                    </div>
                    <div>
                      <span className="mb-1 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Actor ID</span>
                      <span className="font-mono text-[11px] text-zinc-600">{selectedLog.user_id || 'System'}</span>
                    </div>
                    <div>
                      <span className="mb-1 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Timestamp</span>
                      <span className="font-mono text-[11px] text-zinc-600 tabular-nums">{new Date(selectedLog.created_at).toLocaleString()}</span>
                    </div>
                    {paymentAmount !== null && (
                      <div className="col-span-2 mt-2 border-t border-zinc-200 pt-3">
                        <span className="mb-1 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Payment amount</span>
                        <span className="font-mono text-lg font-semibold text-zinc-900 tabular-nums">
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
                    <h4 className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
                      <span aria-hidden="true" className="h-px w-6 flex-none bg-zinc-300" />
                      Before mutation
                    </h4>
                    <pre className="overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-700">
                      {JSON.stringify(selectedLog.old_value, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_value && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
                      <span aria-hidden="true" className="h-px w-6 flex-none bg-zinc-900" />
                      After mutation
                    </h4>
                    <pre className="overflow-x-auto rounded-md border border-zinc-300 bg-white p-4 font-mono text-xs text-zinc-900">
                      {JSON.stringify(selectedLog.new_value, null, 2)}
                    </pre>
                  </div>
                )}
                {!selectedLog.old_value && !selectedLog.new_value && (
                  <div className="py-8 text-center text-sm text-zinc-500">
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
