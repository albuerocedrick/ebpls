// Treasury counter payments for Cash and Manager Check.
import { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Banknote, 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  Search
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import apiClient from '../../utils/apiClient';
import { ROUTES, STATUSES } from '../../utils/constants';

const CashierPOS = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appNo = searchParams.get('app');
  const [assessment, setAssessment] = useState(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [isProcessingOTC, setIsProcessingOTC] = useState(false);
  const [otcError, setOtcError] = useState(null);
  const [isOtcSuccess, setIsOtcSuccess] = useState(false);
  const [otcMethod, setOtcMethod] = useState('Cash'); 
  const [tendered, setTendered] = useState('');
  const [generatedOrNumber, setGeneratedOrNumber] = useState('');
  const [checkDetails, setCheckDetails] = useState({ number: '', bank: '' });

  // Quick Application Selector when no ?app= is provided
  const [payableApps, setPayableApps] = useState([]);
  const [isPayableLoading, setIsPayableLoading] = useState(false);
  const [appSearchTerm, setAppSearchTerm] = useState('');

  // Fetch assessment if appNo is in query string
  useEffect(() => {
    if (appNo) {
      const fetchAssessment = async () => {
        try {
          setIsAssessmentLoading(true);
          setOtcError(null);
          const res = await apiClient.get(`/api/treasury/assess/${appNo}`);
          if (res.success) setAssessment(res.data);
        } catch (err) {
          setOtcError(err.message || 'Assessment data unavailable.');
        } finally {
          setIsAssessmentLoading(false);
        }
      };
      fetchAssessment();
    }
  }, [appNo]);

  // Fetch payable applications for quick OTC selector when no appNo is supplied
  useEffect(() => {
    if (!appNo) {
      const fetchPayableApps = async () => {
        try {
          setIsPayableLoading(true);
          const res = await apiClient.get('/api/treasury/queue');
          if (res.success) {
            const payable = (res.data || []).filter(
              (a) => a.status === STATUSES.FOR_PAYMENT || a.status === STATUSES.ASSESSED
            );
            setPayableApps(payable);
          }
        } catch (err) {
          console.error('[CashierPOS] Failed to fetch queue:', err);
        } finally {
          setIsPayableLoading(false);
        }
      };
      fetchPayableApps();
    }
  }, [appNo]);

  const totalDue = Number(assessment?.total_amount || 0);
  const changeAmount = Math.max(0, parseFloat(tendered || 0) - totalDue);
  const isInsufficient = parseFloat(tendered || 0) < totalDue && tendered !== '';

  const handleConfirmOTC = async () => {
    try {
      setIsProcessingOTC(true);
      setOtcError(null);
      const res = await apiClient.post('/api/treasury/payments/otc', {
        application_no: appNo,
        amount_tendered: parseFloat(tendered),
        tendered_type: otcMethod,
        check_number: otcMethod === 'Manager Check' ? checkDetails.number : null,
        bank_name: otcMethod === 'Manager Check' ? checkDetails.bank : null
      });

      if (res.success) {
        setGeneratedOrNumber(res.data?.or_number || 'UNKNOWN');
        setIsOtcSuccess(true);
      }
    } catch (err) {
      setOtcError(err.message);
    } finally {
      setIsProcessingOTC(false);
    }
  };

  // Filter quick payable apps in Tab 1
  const filteredPayableApps = payableApps.filter((a) => {
    const term = appSearchTerm.toLowerCase();
    return (
      (a.application_no || '').toLowerCase().includes(term) ||
      (a.businesses?.business_name || '').toLowerCase().includes(term)
    );
  });

  if (searchParams.get('tab') === 'proofs') return <Navigate to={ROUTES.TREASURY_VERIFY_PAYMENTS} replace />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Over-the-counter payments</h1>
        <Link className="text-sm font-medium text-zinc-700 underline" to={ROUTES.TREASURY_VERIFY_PAYMENTS}>Payment Verification</Link>
      </header>
        <div className="animate-in fade-in">
          {isAssessmentLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              <p className="text-zinc-500 text-xs font-mono">LOADING TERMINAL DATA…</p>
            </div>
          ) : isOtcSuccess ? (
            <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm animate-in zoom-in fade-in duration-300">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Payment Recorded</h2>
              <div className="my-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Official Receipt Number</p>
                <p className="text-lg font-bold text-zinc-900 mt-1">{generatedOrNumber}</p>
              </div>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                The transaction has been posted. The digital E-Resibo and Business Permit are now unlocked for the applicant.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setIsOtcSuccess(false);
                    setTendered('');
                    navigate(appNo ? `/treasury/cashier` : '/treasury/queue');
                  }}
                >
                  Process Another Payment
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => navigate('/treasury/queue')}
                >
                  Return to Treasury Queue
                </Button>
              </div>
            </div>
          ) : !appNo ? (
            /* Quick Application Selector if no ?app= is supplied */
            <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  <Banknote size={24} />
                </div>
                <h2 className="text-lg font-bold text-zinc-900">Select Application for Over-the-Counter Payment</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Choose an application in <strong>For Payment</strong> status to record cash or manager check payment.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text"
                  placeholder="Search application number or business name..."
                  value={appSearchTerm}
                  onChange={(e) => setAppSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto rounded-lg border border-zinc-100">
                {isPayableLoading ? (
                  <div className="py-12 text-center text-xs text-zinc-400">Loading payable applications...</div>
                ) : filteredPayableApps.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400">No applications currently ready for OTC payment.</div>
                ) : (
                  filteredPayableApps.map((a) => (
                    <button
                      key={a.application_no}
                      type="button"
                      onClick={() => navigate(`/treasury/cashier?app=${a.application_no}&tab=otc`)}
                      className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 text-left transition-colors"
                    >
                      <div>
                        <span className="font-mono text-[10px] text-zinc-500 font-medium">{a.application_no}</span>
                        <p className="text-xs font-bold text-zinc-900">{a.businesses?.business_name || 'Business'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={a.status} />
                        <span className="rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white">
                          Select
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Cashier Terminal Register */
            <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/treasury/queue')}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">OTC Cashier POS</h2>
                    <p className="font-mono text-xs font-semibold text-zinc-500">REF: {appNo}</p>
                  </div>
                </div>
                <Badge status={assessment?.status || STATUSES.FOR_PAYMENT} />
              </div>

              {otcError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{otcError}</span>
                </div>
              )}

              {/* Total Due Display */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  Total Amount Due
                </p>
                <p className="font-mono text-4xl font-extrabold tracking-tight">
                  ₱{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'Cash', icon: <Banknote size={17} /> },
                    { id: 'Manager Check', icon: <CreditCard size={17} /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOtcMethod(m.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                        otcMethod === m.id
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {m.icon} {m.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Tendered */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Amount Tendered (PHP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    className={`w-full rounded-lg border py-3 pl-4 pr-4 text-right font-mono text-2xl font-bold outline-none transition-colors ${
                      isInsufficient
                        ? 'border-red-400 bg-red-50/50 text-red-900'
                        : 'border-zinc-300 text-zinc-900 focus:border-zinc-900'
                    }`}
                  />
                  {isInsufficient && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold uppercase tracking-wider text-red-600">
                      Insufficient Amount
                    </span>
                  )}
                </div>
              </div>

              {/* Change calculation */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                  Change to Return
                </span>
                <span
                  className={`font-mono text-2xl font-bold ${
                    isInsufficient ? 'text-zinc-300' : 'text-emerald-700'
                  }`}
                >
                  ₱{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Manager Check Fields */}
              {otcMethod === 'Manager Check' && (
                <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Check Number</label>
                    <input
                      type="text"
                      placeholder="CHK-000000"
                      value={checkDetails.number}
                      onChange={(e) => setCheckDetails({ ...checkDetails, number: e.target.value })}
                      className="w-full rounded-md border border-zinc-300 bg-white p-2 font-mono text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Issuing Bank</label>
                    <input
                      type="text"
                      placeholder="e.g. Land Bank, BDO, DBP"
                      value={checkDetails.bank}
                      onChange={(e) => setCheckDetails({ ...checkDetails, bank: e.target.value })}
                      className="w-full rounded-md border border-zinc-300 bg-white p-2 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Confirm OTC Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  disabled={
                    isInsufficient ||
                    !tendered ||
                    (otcMethod === 'Manager Check' && (!checkDetails.number || !checkDetails.bank))
                  }
                  isLoading={isProcessingOTC}
                  onClick={handleConfirmOTC}
                >
                  Confirm OTC Payment & Issue Receipt
                </Button>
                <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  Municipal Treasury of Liliw • Official Cashier POS
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default CashierPOS;
