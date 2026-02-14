'use client';

import React, { useState, useEffect } from 'react';
import { StaffRank } from '../lib/staff-management';

interface StaffMember {
  id: string;
  username: string;
  email: string;
  staffRank: StaffRank;
  staffAddedAt: string;
  staffAddedBy: string;
  staffNotes: string;
  isActive: boolean;
  lastLogin?: string;
}

interface StaffStats {
  totalStaff: number;
  totalUsers: number;
  currentUser: {
    id: string;
    username: string;
    staffRank: StaffRank;
  };
}

interface StaffManagementProps {
  currentUserPermissions?: any;
  token1?: string;
  token2?: string;
  currentUser?: any;
  canEditStaff?: boolean;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ currentUserPermissions, token1, token2, currentUser: propCurrentUser, canEditStaff = false }) => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    username: '',
    rank: 'moderator' as StaffRank,
    notes: ''
  });

  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    username: '',
    newRank: '' as StaffRank | '',
    notes: ''
  });

  const [showRemoveForm, setShowRemoveForm] = useState(false);
  const [removeFormData, setRemoveFormData] = useState({
    username: ''
  });

  const [currentUser, setCurrentUser] = useState<{
    username: string;
    staffRank: StaffRank;
  } | null>(propCurrentUser || null);

const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/staff/list`, {
        headers: {
          "x-admin-token1": token1 || '',
          "x-admin-token2": token2 || ''
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch staff members');
      }

      const data = await response.json();
      setStaffMembers(data.staffMembers);
      setStats(data.stats);
      setCurrentUser(data.currentUser);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/staff/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token1': token1 || '',
          'x-admin-token2': token2 || ''
        },
        body: JSON.stringify(addFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add staff member');
      }

      const data = await response.json();
      alert(data.message);
      setShowAddForm(false);
      setAddFormData({ username: '', rank: 'moderator', notes: '' });
      fetchStaffMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add staff member');
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        username: updateFormData.username
      };

      if (updateFormData.newRank) payload.newRank = updateFormData.newRank;
      if (updateFormData.notes) payload.notes = updateFormData.notes;

      const response = await fetch('/api/admin/staff/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token1': token1 || '',
          'x-admin-token2': token2 || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update staff member');
      }

      const data = await response.json();
      alert(data.message);
      setShowUpdateForm(false);
      setUpdateFormData({ username: '', newRank: '', notes: '' });
      fetchStaffMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update staff member');
    }
  };

  const handleRemoveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Are you sure you want to remove ${removeFormData.username} from staff?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/staff/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token1': token1 || '',
          'x-admin-token2': token2 || ''
        },
        body: JSON.stringify(removeFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove staff member');
      }

      const data = await response.json();
      alert(data.message);
      setShowRemoveForm(false);
      setRemoveFormData({ username: '' });
      fetchStaffMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove staff member');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Unknown';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getRankColor = (rank: StaffRank) => {
    switch (rank) {
      case 'owner': return 'text-white font-bold';
      case 'senior_moderator': return 'text-white font-semibold';
      case 'moderator': return 'text-white font-medium';
      case 'junior_moderator': return 'text-white font-medium';
      default: return 'text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading staff members...</div>
        </div>
      </div>
    );
  }

  if (!currentUser && !propCurrentUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-xl text-red-400">No user data available</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Staff Management</h1>
              <p className="text-gray-400">Manage staff members, permissions, and ranks</p>
            </div>
            <button
              onClick={() => {
                fetchStaffMembers();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh Status
            </button>
          </div>

          {(currentUser || propCurrentUser) && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-gray-300 text-sm">
                Logged in as: <span className="text-gray-200 font-medium">{(currentUser || propCurrentUser)?.username}</span>
                <span className="text-gray-400"> ({(currentUser || propCurrentUser)?.staffRank})</span>
              </p>
            </div>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Total Staff</h3>
              <p className="text-2xl font-bold text-white">{stats.totalStaff}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Total Users</h3>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Current User</h3>
              <p className="text-2xl font-bold text-white">{(currentUser || propCurrentUser)?.username || 'Unknown'}</p>
            </div>
          </div>
        )}

        {canEditStaff && (
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add Staff Member
            </button>
            <button
              onClick={() => setShowUpdateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Update Staff Member
            </button>
            <button
              onClick={() => setShowRemoveForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Remove Staff Member
            </button>
          </div>
        )}

        {!canEditStaff && (
          <div className="mb-8 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <div className="text-blue-400 text-center">
              <strong>Staff Management:</strong> You can view staff members but only owners can add, update, or remove staff.
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Added By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Added Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Updated By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {staffMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-white">
                          {member.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${getRankColor(member.staffRank || 'none')}`}>
                        {member.staffRank ? member.staffRank.replace('_', ' ').toUpperCase() : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {member.staffAddedBy || 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {member.staffAddedAt ? formatDate(member.staffAddedAt) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {member.staffAddedBy || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-4">Add Staff Member</h2>
              <form onSubmit={handleAddStaff}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={addFormData.username}
                      onChange={(e) => setAddFormData({...addFormData, username: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rank
                    </label>
                    <select
                      value={addFormData.rank}
                      onChange={(e) => setAddFormData({...addFormData, rank: e.target.value as StaffRank})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="junior_moderator">Junior Moderator</option>
                      <option value="moderator">Moderator</option>
                      <option value="senior_moderator">Senior Moderator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={addFormData.notes}
                      onChange={(e) => setAddFormData({...addFormData, notes: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Staff Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showUpdateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-4">Update Staff Member</h2>
              <form onSubmit={handleUpdateStaff}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={updateFormData.username}
                      onChange={(e) => setUpdateFormData({...updateFormData, username: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Rank (Optional)
                    </label>
                    <select
                      value={updateFormData.newRank}
                      onChange={(e) => setUpdateFormData({...updateFormData, newRank: e.target.value as StaffRank | ''})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="">No change</option>
                      <option value="junior_moderator">Junior Moderator</option>
                      <option value="moderator">Moderator</option>
                      <option value="senior_moderator">Senior Moderator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={updateFormData.notes}
                      onChange={(e) => setUpdateFormData({...updateFormData, notes: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowUpdateForm(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Update Staff Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRemoveForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-4">Remove Staff Member</h2>
              <form onSubmit={handleRemoveStaff}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={removeFormData.username}
                      onChange={(e) => setRemoveFormData({...removeFormData, username: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowRemoveForm(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Remove Staff Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;
