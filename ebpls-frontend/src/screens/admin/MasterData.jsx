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
          className={`w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          className={`w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          className={`w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          className={`w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
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
        className={`w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
      />
    );
  };

  const displayValue = (col, value) => {
    if (col === 'is_active') {
      return value ? (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Active</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Inactive</span>
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Master Data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage system lookup tables, fee definitions, and configuration values.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Table Selection */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          {TABLES.map((table) => (
            <button
              key={table.id}
              onClick={() => setActiveTable(table)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                activeTable.id === table.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Database size={16} className={activeTable.id === table.id ? 'text-white' : 'text-gray-400'} />
              {table.name}
            </button>
          ))}
        </div>

        {/* Main Content: Data Grid */}
        <div className="flex-1 min-w-0">
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                {activeTable.name} <span className="text-xs font-normal bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{data.length} records</span>
              </h2>
              <button
                onClick={() => setIsCreating(true)}
                disabled={isCreating || isSaving || editingId !== null}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Plus size={14} /> Add New
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-16">ID</th>
                    {activeTable.columns.map(col => (
                      <th key={col} className="px-4 py-3">{col.replace('_', ' ')}</th>
                    ))}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {/* Create Row */}
                  {isCreating && (
                    <tr className="bg-blue-50/50">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">NEW</td>
                      {activeTable.columns.map(col => (
                        <td key={col} className="px-4 py-3">
                          {renderInput(col, createForm[col], (k, v) => setCreateForm(prev => ({ ...prev, [k]: v })), false, createForm)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={handleCreate} 
                            disabled={isSaving}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          </button>
                          <button 
                            onClick={() => { setIsCreating(false); setCreateForm({}); }}
                            disabled={isSaving}
                            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
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
                          <td className="px-4 py-3 text-xs font-mono text-gray-500">{row.id}</td>
                          
                          {activeTable.columns.map(col => (
                            <td key={col} className="px-4 py-3">
                              {isEditing 
                                ? renderInput(col, editForm[col], (k, v) => setEditForm(prev => ({ ...prev, [k]: v })), isProtected, editForm)
                                : displayValue(col, row[col])
                              }
                            </td>
                          ))}
                          
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button 
                                    onClick={() => handleSave(row.id)} 
                                    disabled={isSaving}
                                    className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                                    title="Save changes"
                                  >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                  </button>
                                  <button 
                                    onClick={() => { setEditingId(null); setEditForm({}); }}
                                    disabled={isSaving}
                                    className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
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
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                                    title="Edit row"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  {isProtected ? (
                                    <span 
                                      className="p-1.5 text-gray-400 cursor-not-allowed flex items-center justify-center" 
                                      title="Core dependency: cannot be deleted."
                                    >
                                      <Lock size={16} />
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={() => handleDelete(row.id)} 
                                      disabled={isCreating || editingId !== null || isSaving}
                                      className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
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
