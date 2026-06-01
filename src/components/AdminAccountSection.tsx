import React, { useState } from 'react';
import { User, KeyRound, Save, Shield } from 'lucide-react';
import type { ToastActions } from './Toast';
import * as backendApi from '../services/backendApi';
import type { User as AdminUser } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  currentUser: AdminUser | null;
  onUserUpdated: (user: AdminUser) => void;
  toast: ToastActions;
  addLog: (action: string, details: string, status: 'success' | 'error' | 'info') => void;
}

export const AdminAccountSection: React.FC<Props> = ({ currentUser, onUserUpdated, toast, addLog }) => {
  const [username, setUsername] = useState(currentUser?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Current Password Required', 'Enter your current password to save changes');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Passwords Do Not Match', 'New password and confirmation must match');
      return;
    }

    setSaving(true);
    try {
      const response = await backendApi.updateAdminAccount({
        username: username.trim(),
        currentPassword,
        newPassword: newPassword.trim() || undefined,
      });

      if (response.success && response.data) {
        onUserUpdated(response.data);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.success('Account Updated', 'Admin username/password updated successfully');
        addLog('Admin Account', 'Updated admin credentials', 'success');
      } else {
        throw new Error(response.message || 'Failed to update account');
      }
    } catch (e: any) {
      toast.error('Update Failed', e.message || 'Could not update account');
      addLog('Admin Account', `Update failed: ${e.message}`, 'error');
    }
    setSaving(false);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-700/50">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Shield size={18} className="text-purple-400" />Admin Account
        </h3>
      </div>
      <form onSubmit={handleSave} className="p-4 space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Username</label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Current Password</label>
          <div className="relative">
            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Required to save changes"
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !username.trim() || !currentPassword}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          {saving ? <LoadingSpinner size="sm" /> : <Save size={14} />}Save Admin Account
        </button>
      </form>
    </div>
  );
};
