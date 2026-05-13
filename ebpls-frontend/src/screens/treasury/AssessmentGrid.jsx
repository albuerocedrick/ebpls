/**
 * AssessmentGrid.jsx — Treasury Module
 * Spreadsheet-style fee assessment view with override fields.
 * Aligned with HIGH CONTRAST dark canvas style.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, Save, AlertCircle, Loader2, ArrowLeft, Printer, ArrowRight } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import Badge from '../../components/ui/Badge'; // Aligned with your UI kit
import Button from '../../components/ui/Button'; // Aligned with your UI kit
import { STATUSES, ERROR_CODES } from '../../utils/constants';

const AssessmentGrid = () => {
  const { appNo } = useParams();
  const navigate = useNavigate();

  // Logic State
  const [assessment, setAssessment] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [appNo]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/api/treasury/assess/${appNo}`);
      if (response.success && response.data) {
        setAssessment(response.data);
        setLineItems(response.data.assessment_line_items.map(item => ({
          ...item,
          tempAmount: item.amount,
          tempReason: item.override_reason || '',
          isModified: false
        })));
      } else {
        setAssessment(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsProcessing(true);
      await apiClient.post('/api/treasury/assess', { application_no: appNo });
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOverride = async (itemId) => {
    const item = lineItems.find(i => i.id === itemId);
    if (!item.tempReason.trim()) return alert("Reason required for override.");

    try {
      setIsProcessing(true);
      await apiClient.put(`/api/treasury/assess/${itemId}/override`, {
        new_amount: parseFloat(item.tempAmount),
        reason: item.tempReason
      });
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setIsProcessing(true);
      await apiClient.put(`/api/treasury/assess/${appNo}/finalize`);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      <p className="text-white/40 text-sm font-mono">LOADING LEDGER...</p>
    </div>
  );

  const isAssessed = (assessment?.status || assessment?.applications?.status) === STATUSES.ASSESSED;
  const isForPayment = (assessment?.status || assessment?.applications?.status) === STATUSES.FOR_PAYMENT;

  return (
    <div className="flex flex-col gap-6 treasury-canvas p-2">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Fee Assessment</h1>
            <p className="text-sm font-mono text-white/60 mt-1 uppercase tracking-widest">APP REF: {appNo}</p>
          </div>
        </div>
        {assessment && <Badge status={assessment.applications?.status || assessment.status} />}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded text-red-200 text-sm flex items-center gap-3">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {!assessment ? (
        <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-16 text-center">
          <Calculator size={48} className="text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Pending Initial Assessment</h3>
          <p className="text-white/60 mb-6 font-medium">This application has not yet been assessed for fees.</p>
          <Button 
            variant="primary" 
            onClick={handleGenerate} 
            loading={isProcessing}
            leftIcon={<Calculator size={18} />}
          >
            Run Assessment Engine
          </Button>
        </div>
      ) : (
        <>
          {/* Spreadsheet Grid */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="grid grid-cols-3 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/40" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <span>Fee Description</span>
              <span className="text-right">Computed Amount</span>
              <span className="text-right">Override / Adjust</span>
            </div>

            {lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-3 px-6 py-4 text-sm items-center transition-colors" style={{ borderTop: 'rgba(255,255,255,0.06) 1px solid' }}>
                <div className="flex flex-col gap-1">
                  <span className="text-white/90 font-medium">{item.fee_types?.name}</span>
                  {item.is_override && (
                    <span className="text-[10px] text-amber-500 font-mono uppercase tracking-tighter">
                      Reason: {item.override_reason}
                    </span>
                  )}
                </div>
                
                <span className="text-right font-mono text-lg text-white/70">
                  ₱{parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>

                <div className="flex justify-end items-center gap-2">
                  {item.fee_type_id !== 8 && !isForPayment ? (
                    <div className="flex flex-col items-end gap-2 group">
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-32 text-right px-3 py-1.5 rounded text-sm font-mono text-white
                                   bg-amber-500/10 border border-amber-500/30
                                   placeholder:text-white/20 outline-none
                                   focus:border-amber-500 transition-all"
                        value={lineItems.find(i => i.id === item.id).tempAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLineItems(prev => prev.map(i => i.id === item.id ? { ...i, tempAmount: val, isModified: true } : i));
                        }}
                      />
                      {lineItems.find(i => i.id === item.id).isModified && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                          <input 
                            placeholder="Reason..."
                            className="bg-white/5 border border-white/10 px-2 py-1 text-[10px] text-white rounded w-40 outline-none focus:border-white/30"
                            onChange={(e) => {
                              const val = e.target.value;
                              setLineItems(prev => prev.map(i => i.id === item.id ? { ...i, tempReason: val } : i));
                            }}
                          />
                          <button onClick={() => handleOverride(item.id)} className="bg-amber-600 hover:bg-amber-500 text-white p-1 rounded transition-colors">
                            <Save size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/20 font-mono italic">
                      {item.fee_type_id === 8 ? 'AUTO-COMPUTED' : 'FINALIZED'}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Grand Total Footer */}
            <div className="grid grid-cols-3 px-6 py-5 text-sm font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
              <span className="text-white text-lg self-center">GRAND TOTAL DUE</span>
              <div className="col-span-2 text-right flex flex-col">
                <span className="font-mono text-3xl text-blue-400">
                  ₱{parseFloat(assessment.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-white/30 font-mono uppercase mt-1 tracking-tighter">Philippine Pesos</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button
              variant="secondary"
              fullWidth
              className="!bg-white/5 !text-white !border-white/10 hover:!bg-white/10"
              leftIcon={<Printer size={18} />}
              onClick={() => window.open(`/api/documents/top/${appNo}`, '_blank')}
            >
              Print Tax Order of Payment
            </Button>

            {isAssessed && (
              <Button
                variant="primary"
                fullWidth
                loading={isProcessing}
                className="!bg-amber-600 hover:!bg-amber-500 shadow-lg shadow-amber-600/20"
                leftIcon={<Save size={18} />}
                onClick={handleFinalize}
              >
                Finalize & Post to Billing
              </Button>
            )}

            {isForPayment && (
              <Button
                variant="primary"
                fullWidth
                className="!bg-blue-600 hover:!bg-blue-500 shadow-lg shadow-blue-600/20"
                leftIcon={<ArrowRight size={18} />}
                onClick={() => navigate(`/treasury/cashier?app=${appNo}`)}
              >
                Proceed to Payment
              </Button>
            )}
          </div>
          
          {isAssessed && (
            <p className="text-center text-[10px] text-white/30 font-mono mt-2 uppercase tracking-widest">
              Note: Finalizing will notify the applicant and enable online payments.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default AssessmentGrid;