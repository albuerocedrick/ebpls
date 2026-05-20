/**
 * CashierPOS.jsx — Treasury Module
 * High-contrast OTC payment entry — Cash or Manager Check ONLY.
 * Aligned with Phase 0 template and wired to Phase 5A logic.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Banknote, CreditCard, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import apiClient from '../../utils/apiClient';
import { STATUSES, ERROR_CODES } from '../../utils/constants';

const CashierPOS = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appNo = searchParams.get('app');

  // Logic State
  const [assessment, setAssessment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [method, setMethod] = useState('Cash'); 
  const [tendered, setTendered] = useState('');
  const [orNumber, setOrNumber] = useState('');
  const [checkDetails, setCheckDetails] = useState({ number: '', bank: '' });

  useEffect(() => {
    if (appNo) fetchAssessment();
  }, [appNo]);

  const fetchAssessment = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/api/treasury/assess/${appNo}`);
      if (res.success) setAssessment(res.data);
    } catch (err) {
      setError(err.message || 'Assessment data unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculations
  const totalDue = assessment?.total_amount || 0;
  const changeAmount = Math.max(0, parseFloat(tendered || 0) - totalDue);
  const isInsufficient = parseFloat(tendered || 0) < totalDue && tendered !== '';

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      const res = await apiClient.post('/api/treasury/payments/otc', {
        application_no: appNo,
        or_number: orNumber,
        amount_tendered: parseFloat(tendered),
        tendered_type: method,
        check_number: method === 'Manager Check' ? checkDetails.number : null,
        bank_name: method === 'Manager Check' ? checkDetails.bank : null
      });

      if (res.success) setIsSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      <p className="text-gray-400 text-sm font-mono">LOADING TERMINAL...</p>
    </div>
  );

  if (isSuccess) return (
    <div className="flex flex-col items-center justify-center h-[500px] text-center animate-in zoom-in fade-in duration-300">
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 size={40} className="text-gray-900" />
      </div>
      <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">Payment Recorded</h1>
      <p className="text-gray-400 font-mono mb-8">OR NO: {orNumber}</p>
      <Button variant="primary" onClick={() => navigate('/treasury/queue')}>Return to Queue</Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto py-4">
      {/* Application info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded text-gray-400"><ArrowLeft size={18}/></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cashier POS</h1>
            <p className="text-sm font-mono text-gray-500 mt-1 uppercase tracking-tighter">REF: {appNo}</p>
          </div>
        </div>
        <Badge status={assessment?.status || STATUSES.FOR_PAYMENT} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded text-red-200 text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Amount due — large, high contrast */}
      <div
        className="rounded-xl p-6 text-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Total Amount Due</p>
        <p className="text-5xl font-bold text-gray-900 font-mono">
          ₱{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Payment mode selector */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment Mode</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'Cash', icon: <Banknote size={18} /> },
            { id: 'Manager Check', icon: <CreditCard size={18} /> },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={[
                'flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold',
                'border transition-all duration-200',
                method === m.id
                  ? 'bg-blue-600 text-gray-900 border-blue-400 shadow-lg shadow-blue-600/20'
                  : 'bg-transparent text-gray-500 border-gray-200 hover:border-white/40',
              ].join(' ')}
            >
              {m.icon} {m.id}
            </button>
          ))}
        </div>
      </div>

      {/* Amount tendered */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Amount Tendered
        </label>
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            className={`w-full px-4 py-3 rounded-lg text-2xl font-mono font-bold text-gray-900 text-right
                       bg-transparent border outline-none transition-all
                       ${isInsufficient ? 'border-red-500 bg-red-500/5' : 'border-gray-200 focus:border-blue-500'}`}
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
          />
          {isInsufficient && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500 uppercase tracking-tighter">
              Insufficient
            </span>
          )}
        </div>
      </div>

      {/* Change display */}
      <div
        className="rounded-lg px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        <span className="text-sm text-gray-500 font-medium uppercase tracking-widest text-[10px]">Change to return</span>
        <span className={`text-2xl font-mono font-bold ${isInsufficient ? 'text-gray-900/20' : 'text-emerald-400'}`}>
          ₱{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Manager Check Specific Fields */}
      {method === 'Manager Check' && (
        <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
           <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Check Number</label>
            <input 
              className="w-full px-4 py-2 rounded-lg text-sm font-mono text-gray-900 bg-transparent border border-gray-200 outline-none focus:border-blue-500"
              placeholder="CHK-000000"
              value={checkDetails.number}
              onChange={e => setCheckDetails({...checkDetails, number: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Issuing Bank</label>
            <input 
              className="w-full px-4 py-2 rounded-lg text-sm text-gray-900 bg-transparent border border-gray-200 outline-none focus:border-blue-500"
              placeholder="e.g. Landbank, BDO"
              value={checkDetails.bank}
              onChange={e => setCheckDetails({...checkDetails, bank: e.target.value})}
            />
          </div>
        </div>
      )}

      {/* Official Receipt Number */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Official Receipt No.
        </label>
        <input
          type="text"
          placeholder="OR-000000"
          className="w-full px-4 py-3 rounded-lg text-base font-mono text-gray-900
                     bg-transparent border border-gray-200
                     placeholder:text-gray-900/20 outline-none focus:border-blue-500"
          value={orNumber}
          onChange={(e) => setOrNumber(e.target.value)}
        />
      </div>

      {/* Confirm */}
      <Button 
        variant="primary" 
        fullWidth 
        size="lg" 
        disabled={isInsufficient || !orNumber || !tendered || (method === 'Manager Check' && (!checkDetails.number || !checkDetails.bank))}
        loading={isProcessing}
        onClick={handleConfirm}
      >
        Confirm OTC Payment
      </Button>

      <p className="text-[10px] text-gray-900/20 text-center uppercase tracking-widest">
        Authorized Cashier Terminal — Municipality of Liliw
      </p>
    </div>
  );
};

export default CashierPOS;
