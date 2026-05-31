import React, { useState } from 'react';
import { Server, Key, User, Lock, Globe, TestTube, AlertCircle, CheckCircle, Hash } from 'lucide-react';
import { HestiaConfig } from '../types';
import { StatusBadge } from './StatusBadge';
import { LoadingSpinner } from './LoadingSpinner';
import * as hestiaApi from '../services/hestiaApi';

interface Props {
  config: HestiaConfig;
  setConfig: (config: HestiaConfig) => void;
  connected: boolean;
  setConnected: (c: boolean) => void;
  setUsers: (users: string[]) => void;
  addLog: (action: string, details: string, status: 'success' | 'error' | 'info') => void;
}

export const HestiaConfigPanel: React.FC<Props> = ({
  config,
  setConfig,
  connected,
  setConnected,
  setUsers,
  addLog,
}) => {
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (field: keyof HestiaConfig, value: string) => {
    setConfig({ ...config, [field]: value });
    setError('');
    setSuccessMsg('');
  };

  const testConnection = async () => {
    setTesting(true);
    setError('');
    setSuccessMsg('');
    addLog('HestiaCP', 'Testing connection via backend proxy...', 'info');
    
    try {
      const result = await hestiaApi.testConnection(config);
      
      if (result.success) {
        setConnected(true);
        if (result.users) {
          setUsers(result.users);
        }
        const userCount = result.users?.length || 0;
        setSuccessMsg(`Connected! Found ${userCount} users: ${result.users?.join(', ') || 'none'}`);
        addLog('HestiaCP', `Connected to ${config.hostname}:${config.port}. Found ${userCount} users.`, 'success');
      } else {
        setConnected(false);
        setError(result.error || 'Connection failed');
        addLog('HestiaCP', `Connection failed: ${result.error}`, 'error');
      }
    } catch (e: any) {
      setConnected(false);
      setError(e.message);
      addLog('HestiaCP', `Connection error: ${e.message}`, 'error');
    }
    
    setTesting(false);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Server size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">HestiaCP Server</h3>
            <p className="text-[11px] text-gray-400">Control panel connection</p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="mb-3 p-2.5 bg-green-900/20 border border-green-700/30 rounded-lg flex items-start gap-2">
          <CheckCircle size={14} className="text-green-400 shrink-0 mt-0.5" />
          <p className="text-green-400 text-xs">{successMsg}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2.5 bg-red-900/20 border border-red-700/30 rounded-lg flex items-start gap-2">
          <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-medium">Connection Error</p>
            <p className="text-red-400/70 text-[11px] mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Hostname & Port */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              <Globe size={12} className="inline mr-1.5" />
              Hostname
            </label>
            <input
              type="text"
              value={config.hostname}
              onChange={e => handleChange('hostname', e.target.value)}
              placeholder="server.example.com"
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
            <p className="text-[11px] text-gray-500 mt-1">Without https:// or port</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Port</label>
            <input
              type="text"
              value={config.port}
              onChange={e => handleChange('port', e.target.value)}
              placeholder="8083"
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
          </div>
        </div>

        {/* Auth Method */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">Auth Method</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleChange('authType', 'hash')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium transition-all ${
                config.authType === 'hash'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Hash size={12} className="inline mr-1.5" />
              API Key
            </button>
            <button
              onClick={() => handleChange('authType', 'credentials')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium transition-all ${
                config.authType === 'credentials'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <User size={12} className="inline mr-1.5" />
              User/Pass
            </button>
            <button
              onClick={() => handleChange('authType', 'accesskey')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium transition-all ${
                config.authType === 'accesskey'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Key size={12} className="inline mr-1.5" />
              Key Pair
            </button>
          </div>
        </div>

        {/* API Key (Hash) Auth */}
        {config.authType === 'hash' && (
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              <Key size={12} className="inline mr-1.5" />
              API Key
            </label>
            <input disabled
              type="password"
              value={config.apiHash}
              onChange={e => handleChange('apiHash', e.target.value)}
              placeholder="Paste your API key from v-generate-api-key"
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
            <p className="text-[11px] text-gray-500 mt-1.5">
              Generated via SSH: <code className="text-purple-300 bg-gray-900 px-1 rounded">v-generate-api-key</code>
            </p>
            <div className="mt-2 p-2 bg-green-900/20 border border-green-700/30 rounded-lg">
              <p className="text-[11px] text-green-300">
                ✅ <strong>Recommended:</strong> Use the single API key generated by HestiaCP.
              </p>
            </div>
          </div>
        )}

        {/* Username/Password Auth */}
        {config.authType === 'credentials' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <User size={14} className="inline mr-1.5" />
                Username
              </label>
              <input
                type="text"
                value={config.username}
                onChange={e => handleChange('username', e.target.value)}
                placeholder="admin"
                className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <Lock size={14} className="inline mr-1.5" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.password}
                  onChange={e => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Access Key Pair Auth */}
        {config.authType === 'accesskey' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <Key size={14} className="inline mr-1.5" />
                Access Key
              </label>
              <input
                type="text"
                value={config.accessKey}
                onChange={e => handleChange('accessKey', e.target.value)}
                placeholder="ACCESS_KEY_ID"
                className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <Lock size={14} className="inline mr-1.5" />
                Secret Key
              </label>
              <input
                type="password"
                value={config.secretKey}
                onChange={e => handleChange('secretKey', e.target.value)}
                placeholder="SECRET_ACCESS_KEY"
                className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>
        )}

        {/* HestiaCP User */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <User size={14} className="inline mr-1.5" />
            HestiaCP User (to query mail domains)
          </label>
          <input 
            type="text"
            value={config.user}
            onChange={e => handleChange('user', e.target.value)}
            placeholder="admin"
            className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">The HestiaCP user whose mail domains you want to manage</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <Server size={14} className="inline mr-1.5" />
            Hestia Host IP
          </label>
          <input
            type="text"
            value={config.hostIp}
            onChange={e => handleChange('hostIp', e.target.value)}
            placeholder="123.45.67.89"
            className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">Used to auto-fill DNS updates for SSL installation and bulk IP tools</p>
        </div>

        {/* Test Button */}
        <button
          onClick={testConnection}
          disabled={testing || !config.hostname}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {testing ? (
            <LoadingSpinner size="sm" text="Testing..." />
          ) : (
            <>
              <TestTube size={16} />
              Test Connection
            </>
          )}
        </button>
      </div>
    </div>
  );
};
