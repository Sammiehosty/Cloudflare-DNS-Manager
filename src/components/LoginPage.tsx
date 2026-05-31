import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, User, Lock, Server, AlertCircle, Eye, EyeOff, Settings, Database, CheckCircle, XCircle, RefreshCw, Plus } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import * as backendApi from '../services/backendApi';
import { User as UserType } from '../types';

interface Props {
  onLogin: (user: UserType) => void;
}

export const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [backendUrl, setBackendUrl] = useState(backendApi.getStoredBackendUrl());

  // Registration state
  const [regData, setRegData] = useState({ name: '', cf_api_token: '', cf_zone_id: '', cf_zone_name: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // Database status
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [dbDetails, setDbDetails] = useState('');
  const [dbChecking, setDbChecking] = useState(false);

  // Check database status on mount and when backend URL changes
  const checkDbStatus = async () => {
    setDbChecking(true);
    setDbStatus('checking');
    setDbDetails('');
    try {
      const url = `${backendApi.getStoredBackendUrl()}/health`;
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();

      if (data.success && data.database === 'connected') {
        setDbStatus('connected');
        setDbDetails(`PHP ${data.php_version || ''}${data.curl ? ' • cURL ' + data.curl : ''}`);
      } else {
        setDbStatus('failed');
        setDbDetails(data.message || 'Database not connected');
      }
    } catch (err: any) {
      setDbStatus('failed');
      setDbDetails('Cannot reach backend server');
    }
    setDbChecking(false);
  };

  useEffect(() => {
    checkDbStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await backendApi.login(username, password);
      
      if (response.success && response.user) {
        onLogin(response.user);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server');
    }

    setLoading(false);
  };

  const handleSaveBackendUrl = () => {
    backendApi.setBackendUrl(backendUrl);
    setShowSettings(false);
    checkDbStatus();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setError('');
    try {
      const resp = await backendApi.registerClient(regData);
      if (resp.success) {
        setRegSuccess(true);
        setRegData({ name: '', cf_api_token: '', cf_zone_id: '', cf_zone_name: '' });
      } else {
        setError(resp.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration error');
    }
    setRegLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950/40 via-gray-950 to-orange-950/30 pointer-events-none" />
      
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

        <div className="relative z-10 w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl shadow-purple-500/30 mx-auto mb-3">
              <ArrowLeftRight size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
              CloudHestia
            </h1>
            <p className="text-gray-500 text-xs mt-1">DNS Management Portal</p>
          </div>

        {/* Database Status Badge */}
        <div className="mb-3">
          <div
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              dbStatus === 'connected'
                ? 'bg-green-900/20 border-green-700/40'
                : dbStatus === 'failed'
                ? 'bg-red-900/20 border-red-700/40'
                : 'bg-gray-800/30 border-gray-700/40'
            }`}
          >
            {dbStatus === 'checking' || dbChecking ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="text-gray-400 text-sm">Checking database connection...</span>
              </>
            ) : dbStatus === 'connected' ? (
              <>
                <Database size={16} className="text-green-400" />
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-green-400 text-sm font-medium">Database Connected</span>
              </>
            ) : (
              <>
                <Database size={16} className="text-red-400" />
                <XCircle size={14} className="text-red-400" />
                <span className="text-red-400 text-sm font-medium">Database Failed</span>
              </>
            )}
            <button
              onClick={checkDbStatus}
              disabled={dbChecking}
              className="ml-auto text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 p-0.5"
              title="Refresh status"
            >
              <RefreshCw size={14} className={dbChecking ? 'animate-spin' : ''} />
            </button>
          </div>
          {dbStatus === 'failed' && dbDetails && (
            <p className="text-red-400/60 text-xs text-center mt-1.5">{dbDetails}</p>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Admin Login</h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1"
              title="Backend Settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Backend URL Settings */}
          {showSettings && (
            <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Server size={14} className="inline mr-1.5" />
                Backend URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backendUrl}
                  onChange={e => setBackendUrl(e.target.value)}
                  placeholder="https://smhcp.sammiehosty.com/api"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <button
                  onClick={handleSaveBackendUrl}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                URL of your PHP/MySQL backend server
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700/30 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Login Failed</p>
                <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                <User size={12} className="inline mr-1.5" />
                Username
              </label>
              <input disabled
                type="text"
                value="admin"
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoFocus
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                <Lock size={12} className="inline mr-1.5" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username || !password || dbStatus === 'failed'}
              className="w-full bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <LoadingSpinner size="sm" text="Signing in..." />
              ) : (
                <>
                  <Lock size={18} />
                  Sign In
                </>
              )}
            </button>

            {dbStatus === 'failed' && (
              <p className="text-red-400/70 text-xs text-center">
                Login disabled — database is not connected. Check backend settings.
              </p>
            )}
          </form>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-800/50 text-center">
            <button 
              onClick={() => { setShowRegister(!showRegister); setRegSuccess(false); }}
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              {showRegister ? 'Back to Admin Login' : 'Client? Add your details'}
            </button>
<br />
             <p className="text-xs text-gray-600">
              Secure access to HestiaCP + Cloudflare DNS Management
            </p>
          </div>
        </div>

        {/* Registration Form */}
        {showRegister && (
          <div className="mt-4 bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-4">Register Cloudflare Details</h2>
            {regSuccess ? (
              <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4 text-center">
                <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-green-400 text-sm font-medium">Submitted Successfully!</p>
                <p className="text-green-400/70 text-xs mt-1">Your details have been saved for the admin.</p>
                <button 
                  onClick={() => { setShowRegister(false); setRegSuccess(false); }}
                  className="mt-4 text-xs text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Your Name / Company</label>
                  <input type="text" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Domain (Zone Name)</label>
                  <input type="text" value={regData.cf_zone_name} onChange={e => setRegData({...regData, cf_zone_name: e.target.value})} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="example.com" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Cloudflare API Token</label>
                  <input type="password" value={regData.cf_api_token} onChange={e => setRegData({...regData, cf_api_token: e.target.value})} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="API Token" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Cloudflare Zone ID</label>
                  <input type="text" value={regData.cf_zone_id} onChange={e => setRegData({...regData, cf_zone_id: e.target.value})} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="Zone ID" />
                </div>
                <button type="submit" disabled={regLoading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
                  {regLoading ? <LoadingSpinner size="sm" /> : <Plus size={16} />} Submit Details
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer Text */}
        <p className="text-center text-[11px] text-gray-600 mt-4">
          Powered by <span className="text-gray-400">Sammie Hosty</span>
        </p>
      </div>
    </div>
  );
};
