import React, { useState, useEffect } from 'react';
import { Search, Loader2, RefreshCw, Shield, User, Power, FileText, Filter } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const ROLE_OPTIONS = [
  { id: 1, name: 'Applicant' },
  { id: 2, name: 'BPLO_Officer' },
  { id: 3, name: 'Treasury_Officer' },
  { id: 4, name: 'Barangay_Officer' },
  { id: 5, name: 'Admin' }
];

const UsersManagement = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page, limit: 50 });
      if (searchTerm) query.append('search', searchTerm);
      if (roleFilter) query.append('role', roleFilter);

      const res = await apiClient.get(`/api/admin/users?${query.toString()}`);
      if (res?.success) {
        // Pin currently logged-in admin to the very top
        const sorted = [...res.data].sort((a, b) => {
          const aIsMe = a.user_id === currentUser?.userId;
          const bIsMe = b.user_id === currentUser?.userId;
          if (aIsMe && !bIsMe) return -1;
          if (!aIsMe && bIsMe) return 1;
          return 0;
        });
        setUsers(sorted);
        setTotal(res.meta?.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    setUpdatingId(userId);
    const newStatus = !currentStatus;
    try {
      const res = await apiClient.patch(`/api/admin/users/${userId}/status`, { isActive: newStatus });
      if (res.success) {
        toast.success(res.message);
        setUsers(users.map(u => u.user_id === userId ? { ...u, is_active: newStatus } : u));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update user status');
    } finally {
      setUpdatingId(null);
    }
  };

  const changeUserRole = async (userId, newRoleId) => {
    setUpdatingId(userId);
    try {
      const res = await apiClient.patch(`/api/admin/users/${userId}/role`, { roleId: parseInt(newRoleId, 10) });
      if (res.success) {
        toast.success(res.message);
        setUsers(users.map(u => u.user_id === userId ? { ...u, role_id: parseInt(newRoleId, 10), role_name: res.data.role_name } : u));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update user role');
      // Re-fetch to reset the select input if failed
      fetchUsers();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system access, promote staff roles, and deactivate accounts.
          </p>
        </div>
        <button
          onClick={() => fetchUsers()}
          disabled={loading}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-md shadow-sm border text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={18} className="text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 w-full md:w-auto bg-white"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">User Details</th>
                <th className="px-6 py-4 font-semibold">Account Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-4" size={24} />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <User className="mx-auto mb-4 text-gray-400" size={32} />
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isProcessing = updatingId === user.user_id;
                  const isAdmin = user.role_id === 5;
                  const isMe = user.user_id === currentUser?.userId;
                  
                  return (
                    <tr 
                      key={user.user_id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        isMe 
                          ? 'bg-blue-50/50 border-l-4 border-blue-500' 
                          : !user.is_active 
                            ? 'opacity-70 bg-gray-50/50' 
                            : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isAdmin ? <Shield size={18} /> : <User size={18} />}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-1.5">
                              {user.name}
                              {isMe && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          disabled={isProcessing || isMe}
                          value={user.role_id}
                          onChange={(e) => changeUserRole(user.user_id, e.target.value)}
                          className={`border rounded px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 ${isProcessing || isMe ? 'opacity-50 cursor-not-allowed' : ''} ${isAdmin ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-gray-50 text-gray-800 border-gray-200'}`}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.name.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${user.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                          disabled={isProcessing || isMe}
                          className={`flex items-center gap-1.5 justify-center ml-auto px-3 py-1.5 rounded text-xs font-medium transition-colors border ${isProcessing || isMe ? 'opacity-50 cursor-not-allowed' : ''} ${user.is_active ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-green-200 text-green-600 hover:bg-green-50'}`}
                        >
                          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-sm text-gray-600">
            <div>
              Showing <span className="font-medium">{users.length}</span> of <span className="font-medium">{total}</span> users
            </div>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={users.length < 50}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;
