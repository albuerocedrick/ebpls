import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit2, Save, X, Loader2, CheckCircle2, Trash2, Lock } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';

const TABLES = [
  { id: 'fee_types', name: 'Fee Types', columns: ['name', 'description', 'computation_basis', 'fixed_amount', 'percentage_value', 'percentage_of_id', 'is_active'] },
  { id: 'requirement_types', name: 'Requirement Types', columns: ['name', 'description', 'is_active'] },
  { id: 'clearance_types', name: 'Clearance Types', columns: ['name'] },
  { id: 'barangays', name: 'Barangays', columns: ['name', 'is_active'] },
  { id: 'business_activities', name: 'Business Activities', columns: ['name', 'description', 'is_active'] },
  { id: 'organization_types', name: 'Organization Types', columns: ['name'] },
  { id: 'system_settings', name: 'System Settings', columns: ['key', 'value', 'description'] }
];

const PROTECTED_NAMES = [
  'Business Clearance',
  'DTI / SEC / CDA Registration',
  'Fire Safety Inspection Certificate',
  'Sanitary Permit',
  'Zoning Clearance',
  'Lease Contract / TCT',
  'Barangay Business Clearance',
  'Community Tax Certificate',
  "Owner's Valid ID (Front)",
  "Owner's Valid ID (Back)",
  'Sketch of Location',
  "Mayor's Permit Fee",
  'Fire Safety Inspection Fee',
  'MAYOR_NAME',
  'BPLO_CHIEF_NAME',
  'TREASURER_NAME',
  'MUNICIPALITY_NAME',
  'PROVINCE_NAME',
  'CONTACT_EMAIL',
  'CONTACT_PHONE'
];

const MasterData = () => {
  const [activeTable, setActiveTable] = useState(TABLES[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Create State
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({});

  useEffect(() => {
    fetchData();
  }, [activeTable]);

  const fetchData = async () => {
    setLoading(true);
    setEditingId(null);
    setIsCreating(false);
    try {
      const res = await apiClient.get(`/api/admin/master-data/${activeTable.id}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error(`Failed to load ${activeTable.name}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const handleSave = async (id) => {
    setIsSaving(true);
    try {
      const payload = { ...editForm };
      delete payload.id; // Remove ID from payload
      
      const res = await apiClient.put(`/api/admin/master-data/${activeTable.id}/${id}`, payload);
      if (res.success) {
        toast.success('Record updated successfully');
        setEditingId(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      // Provide defaults for specific columns
      const payload = { ...createForm };
      if (activeTable.columns.includes('is_active') && payload.is_active === undefined) payload.is_active = true;
      if (activeTable.columns.includes('computation_basis') && payload.computation_basis === undefined) payload.computation_basis = 'Fixed';

      const res = await apiClient.post(`/api/admin/master-data/${activeTable.id}`, payload);
      if (res.success) {
        toast.success('Record created successfully');
        setIsCreating(false);
        setCreateForm({});
        fetchData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    setIsSaving(true);
    try {
      const res = await apiClient.delete(`/api/admin/master-data/${activeTable.id}/${id}`);
      if (res.success) {
        toast.success(res.message || 'Record deleted successfully');
        fetchData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete record. Try deactivating it instead.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = (col, value, onChange, isProtected = false, currentForm = {}) => {
    let disabled = isProtected && (col === 'name' || col === 'key');

    // Conditional disabling for Fee Types based on computation basis
    if (activeTable.id === 'fee_types') {
      const basis = currentForm.computation_basis || 'Fixed';
      if (col === 'fixed_amount' && basis !== 'Fixed') {
        disabled = true;
      }
      if (col === 'percentage_value' && basis === 'Fixed') {
        disabled = true;
      }
      if (col === 'percentage_of_id' && basis !== 'Percentage') {
        disabled = true;
      }
    }
    if (col === 'is_active') {
      const boolVal = value === undefined ? true : value; // default true
      return (
        <select 
          value={boolVal ? 'true' : 'false'} 
          onChange={(e) => onChange(col, e.target.value === 'true')}
          disabled={disabled}
          className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    if (col === 'computation_basis') {
      return (
        <select 
          value={value || 'Fixed'} 
          onChange={(e) => onChange(col, e.target.value)}
          disabled={disabled}
          className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="Fixed">Fixed</option>
          <option value="Gross_Sales">Gross_Sales</option>
          <option value="Percentage">Percentage</option>
        </select>
      );
    }
    if (col === 'percentage_of_id') {
      // Exclude the current editing item to prevent self-dependence loops
      const otherFees = data.filter(item => item.id !== editingId);
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(col, e.target.value === '' ? null : Number(e.target.value))}
          disabled={disabled}
          className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">None (Select dependency)</option>
          {otherFees.map(fee => (
            <option key={fee.id} value={fee.id}>{fee.name}</option>
          ))}
        </select>
      );
    }
    if (col === 'fixed_amount' || col === 'percentage_value') {
      return (
        <input
          type="number"
          step="0.01"
          placeholder={`Enter ${col.replace('_', ' ')}`}
          value={value === undefined || value === null ? '' : value}
          onChange={(e) => onChange(col, e.target.value === '' ? null : Number(e.target.value))}
          disabled={disabled}
          className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
        />
      );
    }
    return (
      <input
        type="text"
        placeholder={`Enter ${col.replace('_', ' ')}`}
        value={value || ''}
        onChange={(e) => onChange(col, e.target.value)}
        disabled={disabled}
        className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
      />
    );
  };

  const displayValue = (col, value) => {
    if (col === 'is_active') {
      return value ? (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-700">Active</span>
      ) : (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600">Inactive</span>
      );
    }
    if (col === 'computation_basis') {
      return <span className="text-xs font-medium font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{value}</span>;
    }
    if (col === 'percentage_of_id') {
      const referencedFee = data.find(item => item.id === value);
      return <span className="text-sm font-medium text-gray-700">{referencedFee ? referencedFee.name : '—'}</span>;
    }
    return <span className="text-sm text-gray-800">{value || '—'}</span>;
  };

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Master Data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage system lookup tables, fee definitions, and configuration values.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Table Selection */}
        <div className="w-full lg:w-56 shrink-0 space-y-1.5">
          {TABLES.map((table) => (
            <button
              key={table.id}
              onClick={() => setActiveTable(table)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left ${
                activeTable.id === table.id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <Database size={15} className={activeTable.id === table.id ? 'text-white/70' : 'text-gray-400'} />
              {table.name}
            </button>
          ))}
        </div>

        {/* Main Content: Data Grid */}
        <div className="flex-1 min-w-0">
          <Card padding="none" className="overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                {activeTable.name}
                <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{data.length}</span>
              </h2>
              <button
                onClick={() => setIsCreating(true)}
                disabled={isCreating || isSaving || editingId !== null}
                className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-2xl text-xs font-medium transition-all disabled:opacity-50"
              >
                <Plus size={14} /> Add New
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  <tr>
                    <th className="px-5 py-3.5 w-14">ID</th>
                    {activeTable.columns.map(col => (
                      <th key={col} className="px-5 py-3.5 whitespace-nowrap">{col.replace(/_/g, ' ')}</th>
                    ))}
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {/* Create Row */}
                  {isCreating && (
                    <tr className="bg-gray-50">
                      <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">NEW</td>
                      {activeTable.columns.map(col => (
                        <td key={col} className="px-5 py-3.5">
                          {renderInput(col, createForm[col], (k, v) => setCreateForm(prev => ({ ...prev, [k]: v })), false, createForm)}
                        </td>
                      ))}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={handleCreate} 
                            disabled={isSaving}
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                            title="Save"
                          >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          </button>
                          <button 
                            onClick={() => { setIsCreating(false); setCreateForm({}); }}
                            disabled={isSaving}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Data Rows */}
                  {loading ? (
                    <tr>
                      <td colSpan={activeTable.columns.length + 2} className="px-4 py-12 text-center text-gray-400">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                        Loading {activeTable.name}...
                      </td>
                    </tr>
                  ) : data.length === 0 && !isCreating ? (
                    <tr>
                      <td colSpan={activeTable.columns.length + 2} className="px-4 py-12 text-center text-gray-400">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    data.map((row) => {
                      const isEditing = editingId === row.id;
                      const isProtected = PROTECTED_NAMES.includes(row.name || row.key);
                      
                      return (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{row.id}</td>
                          
                          {activeTable.columns.map(col => (
                            <td key={col} className="px-5 py-3.5">
                              {isEditing 
                                ? renderInput(col, editForm[col], (k, v) => setEditForm(prev => ({ ...prev, [k]: v })), isProtected, editForm)
                                : displayValue(col, row[col])
                              }
                            </td>
                          ))}
                          
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button 
                                    onClick={() => handleSave(row.id)} 
                                    disabled={isSaving}
                                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                                    title="Save changes"
                                  >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                  </button>
                                  <button 
                                    onClick={() => { setEditingId(null); setEditForm({}); }}
                                    disabled={isSaving}
                                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                                    title="Cancel editing"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleEdit(row)} 
                                    disabled={isCreating || editingId !== null}
                                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                                    title="Edit row"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  {isProtected ? (
                                    <span 
                                      className="p-2 text-gray-300 cursor-not-allowed flex items-center justify-center" 
                                      title="Core dependency: cannot be deleted."
                                    >
                                      <Lock size={16} />
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={() => handleDelete(row.id)} 
                                      disabled={isCreating || editingId !== null || isSaving}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                      title="Delete row"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MasterData;
