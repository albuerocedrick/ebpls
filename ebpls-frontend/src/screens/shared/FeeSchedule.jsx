import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';

const FeeSchedule = () => {
  const [scheduleData, setScheduleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeeSchedule();
  }, []);

  const fetchFeeSchedule = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get(API_ENDPOINTS.TREASURY_FEE_SCHEDULE);
      if (res.success) {
        setScheduleData(res.data);
      } else {
        throw new Error('Failed to load fee schedule');
      }
    } catch (err) {
      console.error(err);
      setError('Could not load the fee schedule at this time. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
        <p className="text-gray-400 text-sm">Loading fee schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 mt-8">
        <AlertCircle className="text-red-500 w-8 h-8 flex-shrink-0" />
        <div>
          <h3 className="text-red-900 font-bold">Error</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!scheduleData || (!scheduleData.categories?.length && !scheduleData.rules?.length)) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center flex flex-col items-center gap-3">
        <FileText size={48} className="text-gray-200" />
        <h3 className="text-gray-900 font-bold text-lg">No Schedule Found</h3>
        <p className="text-sm text-gray-500">The revenue code fee schedule is currently empty.</p>
      </div>
    );
  }

  const { categories, rules } = scheduleData;

  const formatAmount = (amount, isExempt) => {
    if (isExempt) return <span className="text-green-600 font-bold">Exempt</span>;
    return `₱${parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Revenue Code Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">
          Official breakdown of fees, charges, and guidelines as per the municipal revenue code.
        </p>
      </div>

      {/* Rules Section */}
      {rules && rules.length > 0 && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6">
          <h3 className="text-blue-900 font-bold mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-blue-500" />
            General Rules & Provisions
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white rounded-2xl p-4 border border-blue-50 shadow-sm">
                <h4 className="font-semibold text-gray-900 text-sm">{rule.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-mono font-medium border border-gray-100">
                  Value: {rule.value < 1 ? `${(rule.value * 100).toFixed(0)}%` : `₱${parseFloat(rule.value).toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Municipal Fees Section */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
          <FileText size={18} className="text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Other Municipal Fees</h2>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Fee Type</th>
                <th className="px-6 py-4 font-bold">Computation Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Business Tax</td>
                <td className="px-6 py-4 text-sm text-gray-500">Calculated based on Gross Sales schedule</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Sanitary Inspection Fee</td>
                <td className="px-6 py-4 text-sm text-gray-500">Fixed municipal fee</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Zoning / Occupancy Fee</td>
                <td className="px-6 py-4 text-sm text-gray-500">Fixed municipal fee</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Garbage Collection Fee</td>
                <td className="px-6 py-4 text-sm text-gray-500">Fixed municipal fee</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Environmental Fee</td>
                <td className="px-6 py-4 text-sm text-gray-500">Fixed municipal fee</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Weight and Measures Fee</td>
                <td className="px-6 py-4 text-sm text-gray-500">Fixed municipal fee</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Fire Safety Inspection Fee</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-medium">10% of Mayor's Permit Fee</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            {/* Category Header */}
            <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{category.name}</h2>
              {category.description && (
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              )}
            </div>

            {/* Items Table */}
            {category.items && category.items.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4 font-bold">Line of Business</th>
                      <th className="px-6 py-4 font-bold">Tier / Range</th>
                      <th className="px-6 py-4 font-bold text-right">Amount (PHP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {category.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {item.business_type}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {item.tier_label ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100/50 text-gray-600 text-xs font-medium">
                              {item.tier_label}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium">
                          {formatAmount(item.amount, item.is_exempt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">
                No fee items found for this category.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeeSchedule;
