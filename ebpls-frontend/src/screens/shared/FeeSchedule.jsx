import { useState, useEffect } from 'react';
import { ChevronDown, Loader2, AlertCircle, FileText } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';

const FeeSchedule = () => {
  const [scheduleData, setScheduleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCategories, setOpenCategories] = useState(new Set());

  const toggleCategory = (id) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Loads once on mount. `isLoading` already starts as true and `error` as
  // null, so no synchronous state update is needed before the request — that
  // keeps the effect free of cascading renders.
  useEffect(() => {
    const fetchFeeSchedule = async () => {
      try {
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
    fetchFeeSchedule();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
        <p className="text-sm text-zinc-500">Loading fee schedule…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-8 flex max-w-4xl items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <AlertCircle className="h-6 w-6 flex-shrink-0 text-zinc-500" />
        <div>
          <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Unavailable
          </h3>
          <p className="mt-1.5 text-sm text-zinc-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!scheduleData || (!scheduleData.categories?.length && !scheduleData.rules?.length)) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
          <FileText size={20} className="text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold tracking-tight text-zinc-900">No schedule found</h3>
        <p className="text-sm text-zinc-500">The revenue code fee schedule is currently empty.</p>
      </div>
    );
  }

  const { categories, rules } = scheduleData;

  const formatAmount = (amount, isExempt) => {
    if (isExempt) {
      return (
        <span className="font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
          Exempt
        </span>
      );
    }
    return `₱${parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Revenue code
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Schedule of fees
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Official breakdown of fees, charges, and guidelines as per the municipal revenue code.
        </p>
      </div>

      {/* Rules Section */}
      {rules && rules.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
            <AlertCircle size={14} className="text-zinc-500" />
            General rules &amp; provisions
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-zinc-200 bg-white p-4">
                <h4 className="text-sm font-medium text-zinc-900">{rule.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{rule.description}</p>
                <div className="mt-3 inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] text-zinc-700 tabular-nums">
                  {rule.value < 1 ? `${(rule.value * 100).toFixed(0)}%` : `₱${parseFloat(rule.value).toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Municipal Fees Section */}
      <div className="mb-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div
          className="flex cursor-pointer items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4 transition-colors duration-200 hover:bg-zinc-100 motion-reduce:transition-none"
          onClick={() => toggleCategory('other-municipal-fees')}
        >
          <div className="flex items-center gap-2.5">
            <FileText size={16} className="text-zinc-500" />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">Other municipal fees</h2>
          </div>
          <ChevronDown
            size={18}
            className={`text-zinc-400 transition-transform duration-300 ease-out motion-reduce:transition-none ${openCategories.has('other-municipal-fees') ? 'rotate-180' : ''}`}
          />
        </div>
        <div className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${openCategories.has('other-municipal-fees') ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-white font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
                <th className="px-5 py-3.5 font-normal">Fee type</th>
                <th className="px-5 py-3.5 font-normal">Computation basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">Business Tax</td>
                <td className="px-5 py-3.5 text-sm text-zinc-600">Calculated based on Gross Sales schedule</td>
              </tr>
              <tr className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">Sanitary Inspection Fee</td>
                <td className="px-5 py-3.5 text-sm text-zinc-600">Fixed municipal fee</td>
              </tr>
              <tr className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">Zoning / Occupancy Fee</td>
                <td className="px-5 py-3.5 text-sm text-zinc-600">Fixed municipal fee</td>
              </tr>
              <tr className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">Garbage Collection Fee</td>
                <td className="px-5 py-3.5 text-sm text-zinc-600">Fixed municipal fee</td>
              </tr>
              <tr className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">Environmental Fee</td>
                <td className="px-5 py-3.5 text-sm text-zinc-600">Fixed municipal fee</td>
              </tr>
              <tr className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">Weight and Measures Fee</td>
                <td className="px-5 py-3.5 text-sm text-zinc-600">Fixed municipal fee</td>
              </tr>
              <tr className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">Fire Safety Inspection Fee</td>
                <td className="px-5 py-3.5 text-sm text-zinc-600">10% of Mayor&apos;s Permit Fee</td>
              </tr>
            </tbody>
          </table>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {categories.map((category) => {
          const isOpen = openCategories.has(category.id);
          return (
          <div key={category.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {/* Category Header */}
            <div
              className="flex cursor-pointer items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4 transition-colors duration-200 hover:bg-zinc-100 motion-reduce:transition-none"
              onClick={() => toggleCategory(category.id)}
            >
              <div>
                <h2 className="text-base font-semibold tracking-tight text-zinc-900">{category.name}</h2>
                {category.description && (
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{category.description}</p>
                )}
              </div>
              <ChevronDown
                size={18}
                className={`text-zinc-400 transition-transform duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>

            {/* Items Table */}
            <div className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                {category.items && category.items.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-white font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
                          <th className="px-5 py-3.5 font-normal">Line of business</th>
                          <th className="px-5 py-3.5 font-normal">Tier / range</th>
                          <th className="px-5 py-3.5 text-right font-normal">Amount (PHP)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {category.items.map((item) => (
                          <tr key={item.id} className="transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none">
                            <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">
                              {item.business_type}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-zinc-600">
                              {item.tier_label ? (
                                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] text-zinc-600 tabular-nums">
                                  {item.tier_label}
                                </span>
                              ) : (
                                <span className="text-zinc-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono text-sm text-zinc-900 tabular-nums">
                              {formatAmount(item.amount, item.is_exempt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-zinc-500">
                    No fee items found for this category.
                  </div>
                )}
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};

export default FeeSchedule;
