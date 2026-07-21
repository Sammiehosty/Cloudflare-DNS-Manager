import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Search, CheckSquare, Square, Zap, AlertCircle, Server, X, Check } from 'lucide-react';
import { Client } from '../types';
import * as backendApi from '../services/backendApi';
import * as cfApi from '../services/cloudflareApi';
import type { ToastActions } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  clients: Client[];
  addLog: (action: string, details: string, status: 'success' | 'error' | 'info') => void;
  toast: ToastActions;
}

type Scope = 'mailwebmail' | 'root' | 'both';

export const BulkIpUpdate: React.FC<Props> = ({ clients, addLog, toast }) => {
  const [localClients, setLocalClients] = useState<Client[]>(clients);
  const [loadingClients, setLoadingClients] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [newIp, setNewIp] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showProxyConfirm, setShowProxyConfirm] = useState(false);
  const [scope, setScope] = useState<Scope>('mailwebmail');
  const [updating, setUpdating] = useState(false);
  const [proxying, setProxying] = useState(false);
  const [results, setResults] = useState<cfApi.BulkUpdateResult[]>([]);

  useEffect(() => {
    setLocalClients(clients);
  }, [clients]);

  useEffect(() => {
    if (clients.length === 0) {
      void fetchClients();
    }
  }, []);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const resp = await backendApi.getClients();
      if (resp.success && resp.data) {
        setLocalClients(resp.data);
      }
    } catch {
      // ignore
    }
    setLoadingClients(false);
  };

  const eligibleClients = useMemo(
    () => localClients.filter(c => c.cf_api_token && c.cf_zone_id && c.cf_zone_name),
    [localClients]
  );

  const filteredClients = useMemo(() => {
    if (!search.trim()) return eligibleClients;
    const q = search.toLowerCase();
    return eligibleClients.filter(c =>
      c.name.toLowerCase().includes(q) || (c.cf_zone_name || '').toLowerCase().includes(q)
    );
  }, [eligibleClients, search]);

  const toggleClient = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredClients.map(c => c.id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleIds.forEach(id => next.delete(id));
    } else {
      visibleIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const selectedClients = eligibleClients.filter(c => selectedIds.has(c.id));

  const recordNames = useMemo(() => {
    if (scope === 'root') return ['@'];
    if (scope === 'mailwebmail') return ['mail', 'webmail'];
    return ['@', 'mail', 'webmail'];
  }, [scope]);

  const handleOpenConfirm = () => {
    if (!newIp.trim()) {
      toast.error('IP Required', 'Enter the new server IP address first');
      return;
    }
    if (selectedClients.length === 0) {
      toast.error('No Users Selected', 'Select one or more users first');
      return;
    }
    setShowConfirm(true);
  };

  const handleOpenProxyConfirm = () => {
    if (selectedClients.length === 0) {
      toast.error('No Users Selected', 'Select one or more users first');
      return;
    }
    setShowProxyConfirm(true);
  };

  const handleBulkUpdate = async () => {
    setShowConfirm(false);
    setUpdating(true);
    setResults([]);

    try {
      const payloadClients: cfApi.BulkUpdateClient[] = selectedClients.map(c => ({
        api_token: c.cf_api_token,
        zone_id: c.cf_zone_id,
        zone_name: c.cf_zone_name || '',
      }));

      addLog('Bulk IP', `Updating ${scope} A records to ${newIp} for ${payloadClients.length} clients`, 'info');
      toast.info('Bulk Update Started', `Updating ${payloadClients.length} selected users...`);

      const result = await cfApi.bulkUpdateIp(newIp, recordNames, payloadClients);
      setResults(result.results);

      const successCount = result.results.filter(r => r.status === 'success').length;
      const partialCount = result.results.filter(r => r.status === 'partial').length;
      const errorCount = result.results.filter(r => r.status === 'error').length;

      if (errorCount === 0 && partialCount === 0) {
        toast.success('Bulk Update Complete', `${result.totalUpdated} record(s) updated across ${successCount} users`);
      } else {
        toast.warning('Bulk Update Finished', `${result.totalUpdated} updated, ${partialCount + errorCount} users had issues`);
      }

      addLog('Bulk IP', `Completed bulk update: ${result.totalUpdated} records changed`, 'success');
    } catch (e: any) {
      toast.error('Bulk Update Failed', e.message || 'Unknown error');
      addLog('Bulk IP', `Failed bulk update: ${e.message}`, 'error');
    }

    setUpdating(false);
  };

  const handleBulkProxyARecords = async () => {
    setShowProxyConfirm(false);
    setProxying(true);
    setResults([]);

    try {
      const payloadClients: cfApi.BulkUpdateClient[] = selectedClients.map(c => ({
        api_token: c.cf_api_token,
        zone_id: c.cf_zone_id,
        zone_name: c.cf_zone_name || '',
      }));

      addLog('Bulk Proxy', `Setting root A records to proxied for ${payloadClients.length} clients`, 'info');
      toast.info('Bulk Proxy Started', `Updating ${payloadClients.length} selected users...`);

      const result = await cfApi.bulkProxyARecords(payloadClients);
      setResults(result.results);

      const partialCount = result.results.filter(r => r.status === 'partial').length;
      const errorCount = result.results.filter(r => r.status === 'error').length;

      if (errorCount === 0 && partialCount === 0) {
        toast.success('Bulk Proxy Complete', `${result.totalUpdated} root A record(s) set to proxied`);
      } else {
        toast.warning('Bulk Proxy Finished', `${result.totalUpdated} proxied, ${partialCount + errorCount} users had issues`);
      }

      addLog('Bulk Proxy', `Completed bulk proxy update: ${result.totalUpdated} root A records changed`, 'success');
    } catch (e: any) {
      toast.error('Bulk Proxy Failed', e.message || 'Unknown error');
      addLog('Bulk Proxy', `Failed bulk proxy update: ${e.message}`, 'error');
    }

    setProxying(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-gray-700/30 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-2">
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Bulk IP Update</span>
        </h2>
        <p className="text-gray-400 text-sm max-w-3xl">
          Select one or more users, choose whether to update <strong>mail/webmail</strong> A records or the <strong>root</strong> A record,
          then update all selected users' Cloudflare DNS records to a new IP in one action.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.9fr_1fr] gap-6">
        {/* Users */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Globe size={18} className="text-cyan-400" />Users
              <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full">{selectedClients.length}/{eligibleClients.length}</span>
            </h3>
            <button
              onClick={toggleAllVisible}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {filteredClients.every(c => selectedIds.has(c.id)) && filteredClients.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
              {filteredClients.every(c => selectedIds.has(c.id)) && filteredClients.length > 0 ? 'Deselect Visible' : 'Select Visible'}
            </button>
          </div>

          <div className="p-4 border-b border-gray-700/30">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users or domains..."
                className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-8 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            {loadingClients ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="md" text="Loading users..." /></div>
            ) : filteredClients.length > 0 ? (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {filteredClients.map(client => (
                  <label
                    key={client.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedIds.has(client.id)
                        ? 'bg-cyan-600/15 border-cyan-500/30'
                        : 'bg-gray-900/40 border-gray-700/40 hover:border-cyan-500/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(client.id)}
                      onChange={() => toggleClient(client.id)}
                      className="rounded bg-gray-800 border-gray-600 text-cyan-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{client.name}</p>
                      <p className="text-gray-500 text-xs truncate">{client.cf_zone_name}</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No eligible users found</p>
            )}
          </div>
        </div>

        {/* Update Options */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700/50">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Server size={18} className="text-blue-400" />Update IP
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">New Server IP</label>
              <input
                type="text"
                value={newIp}
                onChange={e => setNewIp(e.target.value)}
                placeholder="123.45.67.89"
                className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">What do you want to update?</label>
              <div className="space-y-2">
                {[
                  { value: 'mailwebmail', label: 'Mail / Webmail records', desc: 'Update mail.domain.com and webmail.domain.com A records' },
                  { value: 'root', label: 'Root record', desc: 'Update and proxy the root A record (@ / domain.com)' },
                  { value: 'both', label: 'Both', desc: 'Update root + mail + webmail A records; root will be proxied' },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                      scope === option.value
                        ? 'bg-blue-600/15 border-blue-500/30'
                        : 'bg-gray-900/40 border-gray-700/40 hover:border-blue-500/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={option.value}
                      checked={scope === option.value}
                      onChange={() => setScope(option.value as Scope)}
                      className="sr-only"
                    />
                    <p className="text-white text-sm font-medium">{option.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{option.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleOpenConfirm}
              disabled={!newIp.trim() || selectedClients.length === 0 || updating || proxying}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              {updating ? (
                <LoadingSpinner size="sm" text="Updating..." />
              ) : (
                <>
                  <Zap size={18} />Update IP
                </>
              )}
            </button>

            <div className="border-t border-gray-700/50 pt-4">
              <p className="text-xs text-gray-400 mb-2">Cloudflare proxy</p>
              <p className="text-xs text-gray-500 mb-3">
                Set only the root A record in each selected user's zone to proxied without changing the IP address.
              </p>
              <button
                onClick={handleOpenProxyConfirm}
                disabled={selectedClients.length === 0 || updating || proxying}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                {proxying ? (
                  <LoadingSpinner size="sm" text="Proxying..." />
                ) : (
                  <>
                    <Zap size={18} />Proxy Root A Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700/50">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Check size={18} className="text-green-400" />Results
            </h3>
          </div>
          <div className="p-4">
            {updating || proxying ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="md" text={proxying ? "Proxying A records..." : "Updating records..."} /></div>
            ) : results.length > 0 ? (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={`${r.client}-${i}`}
                    className={`p-3 rounded-lg border ${
                      r.status === 'success'
                        ? 'bg-green-900/10 border-green-700/30'
                        : r.status === 'partial'
                          ? 'bg-amber-900/10 border-amber-700/30'
                          : r.status === 'no_match'
                            ? 'bg-gray-900/40 border-gray-700/40'
                            : 'bg-red-900/10 border-red-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.status === 'success' ? <Check size={14} className="text-green-400" /> : <AlertCircle size={14} className="text-amber-400" />}
                      <p className="text-white text-sm font-medium">{r.client}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{r.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">Bulk update results will appear here</p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Bulk IP Update</h3>
            <div className="space-y-3 mb-5 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">New IP</p>
                <p className="text-white font-mono">{newIp}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Update Scope</p>
                <p className="text-white">
                  {scope === 'mailwebmail' ? 'Mail / Webmail' : scope === 'root' ? 'Root (@)' : 'Root + Mail + Webmail'}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Selected Users</p>
                <p className="text-white">{selectedClients.length}</p>
              </div>
            </div>
            <p className="text-amber-400 text-xs mb-5">
              This will update matching Cloudflare A records for all selected users immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBulkUpdate}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all"
              >
                Yes, Update
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showProxyConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProxyConfirm(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Proxy Update</h3>
            <div className="space-y-3 mb-5 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Action</p>
                <p className="text-white">Set only the root Cloudflare A record to proxied</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Selected Users</p>
                <p className="text-white">{selectedClients.length}</p>
              </div>
            </div>
            <p className="text-amber-400 text-xs mb-5">
              This will orange-cloud only the root A record for each selected Cloudflare zone. Mail, webmail, and other subdomain A records will be skipped.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBulkProxyARecords}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all"
              >
                Yes, Proxy Root A Records
              </button>
              <button
                onClick={() => setShowProxyConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
