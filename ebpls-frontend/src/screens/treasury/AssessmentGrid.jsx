/**
 * AssessmentGrid.jsx — Treasury Module
 * Spreadsheet-style fee assessment view with override fields.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, Save, AlertCircle, Loader2, ArrowLeft, Printer, ArrowRight } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { API_BASE_URL } from '../../utils/constants';
import useAuthStore from '../../store/authStore';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { STATUSES } from '../../utils/constants';

const AssessmentGrid = () => {
  const { appNo } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetchData(); }, [appNo]);

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
    } catch (err) { setError(err.message); }
    finally { setIsProcessing(false); }
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
    } catch (err) { alert(err.message); }
    finally { setIsProcessing(false); }
  };

  const handleFinalize = async () => {
    try {
      setIsProcessing(true);
      await apiClient.put(`/api/treasury/assess/${appNo}/finalize`);
      await fetchData();
    } catch (err) { alert(err.message); }
    finally { setIsProcessing(false); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
      <p className="text-gray-400 text-sm">Loading assessment...</p>
    </div>
  );

  const appStatus = assessment?.applications?.status || assessment?.status;
  const isAssessed = appStatus === STATUSES.ASSESSED;
  const isForPayment = appStatus === STATUSES.FOR_PAYMENT;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fee Assessment</h1>
            <p className="text-xs font-mono text-gray-400 mt-1">APP REF: {appNo}</p>
          </div>
        </div>
        {assessment && <Badge status={appStatus} />}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-700 text-sm flex items-center gap-3">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {!assessment ? (
        /* No assessment yet — show generate button */
        <div className="bg-white border border-gray-100 rounded-3xl p-12 sm:p-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
            <Calculator size={28} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Pending Initial Assessment</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-sm">This application has not yet been assessed for fees. Run the assessment engine to calculate applicable charges.</p>
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerate}
            isLoading={isProcessing}
            leftIcon={<Calculator size={18} />}
          >
            Run Assessment Engine
          </Button>
        </div>
      ) : (
        <>
          {/* Summary Header Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Amount Due</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">
                ₱{parseFloat(assessment.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Printer size={15} />}
                onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/top/${appNo}?token=${token}`, '_blank'); }}
              >
                Print TOP
              </Button>
              {isAssessed && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isProcessing}
                  leftIcon={<Save size={15} />}
                  onClick={handleFinalize}
                >
                  Finalize
                </Button>
              )}
              {isForPayment && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ArrowRight size={15} />}
                  onClick={() => navigate(`/treasury/cashier?app=${appNo}`)}
                >
                  Record Payment
                </Button>
              )}
            </div>
          </div>

          {/* Fee Table */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50/50">
              <span>Fee Description</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Override</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-50">
              {lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-3 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-gray-900">{item.fee_types?.name}</span>
                    {item.is_override && (
                      <span className="text-[10px] text-amber-600 font-medium">
                        Overridden: {item.override_reason}
                      </span>
                    )}
                  </div>

                  <span className="text-right font-mono text-sm font-semibold text-gray-900">
                    ₱{parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>

                  <div className="flex justify-end items-center gap-2">
                    {item.fee_type_id !== 8 && !isForPayment ? (
                      <div className="flex flex-col items-end gap-2">
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-28 text-right px-3 py-1.5 rounded-xl text-xs font-mono text-gray-900 bg-gray-50 border border-gray-200 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-400 transition-all"
                          value={lineItems.find(i => i.id === item.id).tempAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineItems(prev => prev.map(i => i.id === item.id ? { ...i, tempAmount: val, isModified: true } : i));
                          }}
                        />
                        {lineItems.find(i => i.id === item.id).isModified && (
                          <div className="flex items-center gap-2">
                            <input
                              placeholder="Reason..."
                              className="bg-gray-50 border border-gray-200 px-2.5 py-1 text-[11px] text-gray-900 rounded-lg w-36 outline-none focus:border-gray-400"
                              onChange={(e) => {
                                const val = e.target.value;
                                setLineItems(prev => prev.map(i => i.id === item.id ? { ...i, tempReason: val } : i));
                              }}
                            />
                            <button onClick={() => handleOverride(item.id)} className="bg-gray-900 hover:bg-gray-800 text-white p-1.5 rounded-lg transition-colors">
                              <Save size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300 font-medium">
                        {item.fee_type_id === 8 ? 'Auto' : '—'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isAssessed && (
            <p className="text-center text-xs text-gray-400">
              Finalizing will notify the applicant and enable online payments.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default AssessmentGrid;
