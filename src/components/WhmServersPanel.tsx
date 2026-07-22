import React, { useEffect, useMemo, useState } from 'react';
import { Check, Play, Plus, RefreshCw, Save, Server, Trash2, X, AlertCircle, CheckSquare, Square, ShieldCheck } from 'lucide-react';
import type { WhmAccount, WhmServer, WhmSyncJob, WhmSyncResult } from '../types';
import type { ConfirmFn } from './ConfirmDialog';
import type { ToastActions } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';
import * as backendApi from '../services/backendApi';

interface Props {
  addLog: (action: string, details: string, status: 'success' | 'error' | 'info') => void;
  toast: ToastActions;
  confirm: ConfirmFn;
}

const EMPTY_FORM = {
  name: '',
  hostname: '',
  port: '2087',
  username: '',
  password: '',
  use_ssl: true,
  enabled: true,
};

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const WhmServersPanel: React.FC<Props> = ({ addLog, toast, confirm }) => {
  const [servers, setServers] = useState<WhmServer[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('whm_auto_sync') !== 'false');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncResults, setSyncResults] = useState<WhmSyncResult[]>([]);
  const [currentJob, setCurrentJob] = useState<WhmSyncJob | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [liveMessages, setLiveMessages] = useState<string[]>([]);
  const [syncStartedAt, setSyncStartedAt] = useState<Date | null>(null);
  const [accounts, setAccounts] = useState<WhmAccount[]>([]);
  const [accountErrors, setAccountErrors] = useState<Array<{ server_id: number; server_name: string; message: string }>>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [accountSearch, setAccountSearch] = useState('');

  const enabledServers = useMemo(() => servers.filter(s => s.enabled), [servers]);
  const filteredAccounts = useMemo(() => {
    if (!accountSearch.trim()) return accounts;
    const q = accountSearch.toLowerCase();
    return accounts.filter(account =>
      account.domain.toLowerCase().includes(q) ||
      account.user.toLowerCase().includes(q) ||
      account.server_name.toLowerCase().includes(q)
    );
  }, [accounts, accountSearch]);

  const accountKey = (account: Pick<WhmAccount, 'server_id' | 'domain' | 'user'>) =>
    `${account.server_id}:${account.domain || ''}:${account.user || ''}`;

  const selectedAccountPayload = useMemo(
    () => accounts
      .filter(account => selectedAccounts.has(accountKey(account)))
      .map(account => ({ server_id: account.server_id, domain: account.domain, user: account.user })),
    [accounts, selectedAccounts]
  );

  useEffect(() => {
    void loadServers();
    void loadAccounts();
  }, []);

  useEffect(() => {
    localStorage.setItem('whm_auto_sync', autoSync ? 'true' : 'false');
    if (!autoSync) return;

    const id = window.setInterval(() => {
      if (enabledServers.length > 0) {
        void runSync(true);
      }
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [autoSync, enabledServers.length]);

  const loadServers = async () => {
    setLoading(true);
    try {
      const resp = await backendApi.getWhmServers();
      if (resp.success && resp.data) setServers(resp.data);
    } catch (e: any) {
      toast.error('WHM Servers', e.message || 'Failed to load WHM servers');
    }
    setLoading(false);
  };

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const resp = await backendApi.getWhmAccounts();
      if (resp.success && resp.data) {
        setAccounts(resp.data.accounts || []);
        setAccountErrors(resp.data.errors || []);
        setSelectedAccounts(prev => {
          const valid = new Set((resp.data?.accounts || []).map(accountKey));
          return new Set([...prev].filter(key => valid.has(key)));
        });
      }
    } catch (e: any) {
      toast.error('cPanel Accounts', e.message || 'Failed to load cPanel accounts');
    }
    setLoadingAccounts(false);
  };

  const toggleAccount = (account: WhmAccount) => {
    const key = accountKey(account);
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleVisibleAccounts = () => {
    const visibleKeys = filteredAccounts.map(accountKey);
    const allSelected = visibleKeys.length > 0 && visibleKeys.every(key => selectedAccounts.has(key));
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleKeys.forEach(key => next.delete(key));
      } else {
        visibleKeys.forEach(key => next.add(key));
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const editServer = (server: WhmServer) => {
    setEditingId(server.id);
    setForm({
      name: server.name,
      hostname: server.hostname,
      port: server.port || '2087',
      username: server.username,
      password: '',
      use_ssl: server.use_ssl,
      enabled: server.enabled,
    });
  };

  const saveServer = async () => {
    if (!form.name.trim() || !form.hostname.trim() || !form.username.trim() || (!editingId && !form.password)) {
      toast.error('Missing Details', 'Name, hostname, username and password are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        hostname: form.hostname.trim(),
        port: form.port.trim() || '2087',
        username: form.username.trim(),
      };
      if (editingId) {
        await backendApi.updateWhmServer(editingId, payload);
        addLog('WHM', `Updated WHM server: ${payload.name}`, 'success');
        toast.success('WHM Server Updated', payload.name);
      } else {
        await backendApi.createWhmServer(payload);
        addLog('WHM', `Added WHM server: ${payload.name}`, 'success');
        toast.success('WHM Server Added', payload.name);
      }
      resetForm();
      await loadServers();
      await loadAccounts();
    } catch (e: any) {
      toast.error('Save Failed', e.message || 'Could not save WHM server');
      addLog('WHM', `Save failed: ${e.message}`, 'error');
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const payload = editingId ? { server_id: editingId } : form;
      const resp = await backendApi.testWhmServer(payload);
      toast.success('WHM Connected', resp.message || 'Connection successful');
      addLog('WHM', `Connection test successful${editingId ? ` for server #${editingId}` : ''}`, 'success');
    } catch (e: any) {
      toast.error('WHM Test Failed', e.message || 'Connection failed');
      addLog('WHM', `Connection test failed: ${e.message}`, 'error');
    }
    setTesting(false);
  };

  const deleteServer = async (server: WhmServer) => {
    const ok = await confirm({
      title: 'Delete WHM Server',
      message: `Delete ${server.name}? This removes the saved WHM connection from this app.`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await backendApi.deleteWhmServer(server.id);
      toast.success('WHM Server Deleted', server.name);
      addLog('WHM', `Deleted WHM server: ${server.name}`, 'success');
      await loadServers();
      await loadAccounts();
    } catch (e: any) {
      toast.error('Delete Failed', e.message || 'Could not delete WHM server');
    }
  };

  const sleep = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

  const normalizeResults = (job: WhmSyncJob) =>
    (job.results || []).map(result => ({
      ...result,
      server: result.server || result.server_name || 'WHM Server',
    }));

  const appendJobMessages = (job: WhmSyncJob, previousResultCount: number) => {
    const newResults = normalizeResults(job).slice(previousResultCount);
    setLiveMessages(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()} - Job #${job.id}: ${job.message || job.status} (${job.processed_accounts}/${job.total_accounts || '?'} account(s))`,
      ...newResults.map(result => {
        const domain = result.domain || 'server-level check';
        const action = result.hestia_action && result.hestia_action !== 'none' ? `, Hestia ${result.hestia_action}` : '';
        const status = result.whm_status ? `WHM ${result.whm_status}` : result.status;
        const hestia = result.hestia_status ? `, Hestia status: ${result.hestia_status}` : '';
        const suffix = result.message ? ` - ${result.message}` : '';
        return `${new Date().toLocaleTimeString()} - ${result.server}: ${domain} - ${status}${hestia}${action}${suffix}`;
      }),
    ].slice(-140));
  };

  const runSync = async (silent = false) => {
    if (syncing) return;
    const selectedForThisRun = silent ? [] : selectedAccountPayload;
    const runIsDry = silent ? false : dryRun;
    setSyncing(true);
    setSyncStartedAt(new Date());
    setCurrentJob(null);
    setSyncResults([]);
    setLiveMessages([
      `${new Date().toLocaleTimeString()} - Starting ${runIsDry ? 'dry-run ' : ''}WHM sync`,
      `${new Date().toLocaleTimeString()} - Checking ${enabledServers.length} enabled WHM server(s)`,
      selectedForThisRun.length > 0
        ? `${new Date().toLocaleTimeString()} - Sync scope: ${selectedForThisRun.length} selected cPanel account(s)`
        : `${new Date().toLocaleTimeString()} - Sync scope: all cPanel accounts`,
      `${new Date().toLocaleTimeString()} - Queuing backend sync job`,
    ]);

    try {
      if (!silent) toast.info(runIsDry ? 'Dry Run Started' : 'WHM Sync Started', 'The backend queue is processing accounts in batches...');
      const resp = await backendApi.syncWhmServers(undefined, selectedForThisRun, runIsDry);
      if (!resp.data) throw new Error('Sync job was not created');

      let job = resp.data;
      let previousResultCount = 0;
      setCurrentJob(job);
      appendJobMessages(job, previousResultCount);

      while (job.status === 'queued' || job.status === 'running') {
        previousResultCount = (job.results || []).length;
        await sleep(600);
        const tick = await backendApi.runWhmSyncJob(job.id);
        if (!tick.data) throw new Error('Sync job update was empty');
        job = tick.data;
        setCurrentJob(job);
        setSyncResults(normalizeResults(job));
        appendJobMessages(job, previousResultCount);
      }

      const results = normalizeResults(job);
      setSyncResults(results);
      setLastSync(new Date());
      setLiveMessages(prev => [
        ...prev,
        `${new Date().toLocaleTimeString()} - Backend job finished with status: ${job.status}`,
      ].slice(-140));
      await loadServers();

      const changed = job.changed_count || 0;
      const errors = job.error_count || 0;
      await loadAccounts();
      setLiveMessages(prev => [
        ...prev,
        `${new Date().toLocaleTimeString()} - ${runIsDry ? 'Dry run' : 'Sync'} complete: ${changed} action(s), ${errors} error(s)`,
      ].slice(-140));
      if (errors > 0) {
        toast.warning(runIsDry ? 'Dry Run Finished' : 'WHM Sync Finished', `${changed} action(s), ${errors} error(s)`);
      } else if (!silent) {
        toast.success(runIsDry ? 'Dry Run Complete' : 'WHM Sync Complete', `${changed} Hestia mail action(s) ${runIsDry ? 'planned' : 'completed'}`);
      }
      addLog('WHM Sync', `Completed ${runIsDry ? 'dry-run ' : ''}WHM sync job #${job.id}: ${changed} action(s), ${errors} error(s)`, errors ? 'error' : 'success');
    } catch (e: any) {
      setLiveMessages(prev => [
        ...prev,
        `${new Date().toLocaleTimeString()} - Sync failed: ${e.message || 'Unknown error'}`,
      ].slice(-140));
      if (!silent) toast.error('WHM Sync Failed', e.message || 'Sync failed');
      addLog('WHM Sync', `Sync failed: ${e.message}`, 'error');
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Server size={18} className="text-orange-400" />
              {editingId ? 'Edit WHM Server' : 'Add WHM Server'}
            </h3>
            {editingId && (
              <button onClick={resetForm} className="text-gray-400 hover:text-white p-1">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Server name" className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm" />
            <input value={form.hostname} onChange={e => setForm({ ...form, hostname: e.target.value })} placeholder="Hostname or IP address" className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} placeholder="2087" className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm" />
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="WHM username" className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editingId ? 'Leave blank to keep current password' : 'WHM password'} className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm" />

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 bg-gray-900/40 border border-gray-700/40 rounded-lg px-3 py-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.use_ssl} onChange={e => setForm({ ...form, use_ssl: e.target.checked, port: e.target.checked ? '2087' : '2086' })} />
                Use SSL
              </label>
              <label className="flex items-center gap-2 bg-gray-900/40 border border-gray-700/40 rounded-lg px-3 py-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
                Enabled
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={saveServer} disabled={saving || testing} className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                {saving ? <LoadingSpinner size="sm" text="Saving..." /> : <><Save size={16} />Save</>}
              </button>
              <button onClick={testConnection} disabled={saving || testing} className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                {testing ? <LoadingSpinner size="sm" text="Testing..." /> : <><Play size={16} />Test</>}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Server size={18} className="text-orange-400" />WHM Servers
              <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full">{enabledServers.length}/{servers.length} enabled</span>
            </h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} />
                Browser 5 min sync
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} disabled={syncing} />
                Dry run
              </label>
              <button onClick={() => void runSync(false)} disabled={syncing || enabledServers.length === 0} className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
                {syncing ? <LoadingSpinner size="sm" text="Syncing..." /> : <><RefreshCw size={14} />{dryRun ? 'Dry Run' : selectedAccounts.size > 0 ? `Sync Selected (${selectedAccounts.size})` : 'Sync All'}</>}
              </button>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="md" text="Loading WHM servers..." /></div>
            ) : servers.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {servers.map(server => (
                  <div key={server.id} className="bg-gray-900/40 border border-gray-700/40 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">{server.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${server.enabled ? 'bg-green-900/30 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                            {server.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{server.hostname}:{server.port} · {server.username}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {server.last_sync_at ? `Last sync: ${new Date(server.last_sync_at).toLocaleString()}` : 'Not synced yet'}
                          {server.last_sync_message ? ` · ${server.last_sync_message}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => editServer(server)} className="p-2 text-gray-400 hover:text-white"><Plus size={15} /></button>
                        <button onClick={() => void deleteServer(server)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No WHM servers added yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Server size={18} className="text-blue-400" />Connected cPanel Accounts
              <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full">{selectedAccounts.size}/{accounts.length} selected</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Select one or more accounts, then click Sync Now to sync only those accounts. Leave none selected to sync all.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={toggleVisibleAccounts} disabled={filteredAccounts.length === 0} className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
              {filteredAccounts.length > 0 && filteredAccounts.every(account => selectedAccounts.has(accountKey(account))) ? <CheckSquare size={14} /> : <Square size={14} />}
              {filteredAccounts.length > 0 && filteredAccounts.every(account => selectedAccounts.has(accountKey(account))) ? 'Deselect Visible' : 'Select Visible'}
            </button>
            <button onClick={() => void loadAccounts()} disabled={loadingAccounts} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
              {loadingAccounts ? <LoadingSpinner size="sm" text="Loading..." /> : <><RefreshCw size={14} />Refresh Accounts</>}
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-700/30">
          <input
            value={accountSearch}
            onChange={e => setAccountSearch(e.target.value)}
            placeholder="Search cPanel accounts, domains, users, or WHM servers..."
            className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
          />
        </div>

        <div className="p-4">
          {loadingAccounts ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" text="Loading cPanel accounts..." /></div>
          ) : filteredAccounts.length > 0 ? (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {filteredAccounts.map(account => {
                const key = accountKey(account);
                const selected = selectedAccounts.has(key);
                return (
                  <label key={key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selected ? 'bg-blue-600/15 border-blue-500/30' : 'bg-gray-900/40 border-gray-700/40 hover:border-blue-500/20'}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleAccount(account)} className="rounded bg-gray-800 border-gray-600 text-blue-500" />
                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr_0.7fr_0.8fr_auto] gap-2 md:items-center">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{account.domain}</p>
                        <p className="text-gray-500 text-xs truncate">{account.user}</p>
                      </div>
                      <p className="text-gray-400 text-xs truncate">{account.server_name}</p>
                      <p className="text-gray-500 text-xs truncate">{account.owner ? `Owner: ${account.owner}` : 'Owner unavailable'}</p>
                      <span className={`text-[10px] px-2 py-1 rounded-full text-center ${account.suspended ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
                        {account.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">
              {accounts.length === 0 ? 'No cPanel accounts loaded. Add an enabled WHM server, then refresh accounts.' : 'No matching cPanel accounts'}
            </p>
          )}

          {accountErrors.length > 0 && (
            <div className="mt-4 space-y-2">
              {accountErrors.map(error => (
                <div key={`${error.server_id}-${error.message}`} className="bg-red-900/10 border border-red-700/30 rounded-lg p-3">
                  <p className="text-red-300 text-xs font-medium">{error.server_name}</p>
                  <p className="text-gray-400 text-xs mt-1">{error.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Check size={18} className="text-green-400" />Sync Results
          </h3>
          <p className="text-xs text-gray-500">{lastSync ? `Last run: ${lastSync.toLocaleTimeString()}` : 'No sync run yet'}</p>
        </div>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gray-900/40 border border-gray-700/40 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <ShieldCheck size={13} className="text-emerald-400" />
              Credential Security
            </p>
            <p className="text-xs text-gray-500 mt-1">
              WHM passwords are encrypted in the backend database. Change APP_ENCRYPTION_KEY in config.php before production use.
            </p>
          </div>
          <div className="bg-gray-900/40 border border-gray-700/40 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-300">cron-job.org 5-minute URL</p>
            <p className="text-xs text-gray-500 mt-1 font-mono break-all">
              https://your-domain.com/api/whm/cron?secret=your-cron-secret
            </p>
          </div>
        </div>
        <div className="mb-4 bg-gray-950/60 border border-gray-700/40 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700/40 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <RefreshCw size={13} className={syncing ? 'animate-spin text-orange-400' : 'text-gray-500'} />
              Live Sync Activity
            </p>
            <p className="text-[11px] text-gray-500">
              {currentJob
                ? `Job #${currentJob.id}: ${currentJob.status} (${currentJob.processed_accounts}/${currentJob.total_accounts || '?'})`
                : syncing && syncStartedAt ? `Running since ${syncStartedAt.toLocaleTimeString()}` : 'Idle'}
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
            {liveMessages.length > 0 ? (
              liveMessages.map((message, index) => (
                <p key={`${message}-${index}`} className="text-gray-400 whitespace-pre-wrap">{message}</p>
              ))
            ) : (
              <p className="text-gray-600">Start a sync to see live activity here.</p>
            )}
          </div>
        </div>
        {syncResults.length > 0 ? (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {syncResults.slice(0, 100).map((result, index) => (
              <div key={`${result.server}-${result.domain}-${index}`} className={`p-3 rounded-lg border ${
                result.status === 'success'
                  ? 'bg-green-900/10 border-green-700/30'
                  : result.status === 'skipped' || result.status === 'planned'
                    ? 'bg-amber-900/10 border-amber-700/30'
                    : 'bg-red-900/10 border-red-700/30'
              }`}>
                <div className="flex items-center gap-2">
                  {result.status === 'success' ? <Check size={14} className="text-green-400" /> : <AlertCircle size={14} className={result.status === 'skipped' || result.status === 'planned' ? 'text-amber-400' : 'text-red-400'} />}
                  <p className="text-sm text-white">{result.domain || result.server}</p>
                  {result.status === 'planned' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300">Dry run</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {result.server}
                  {result.whm_status ? ` · WHM: ${result.whm_status}` : ''}
                  {result.hestia_status ? ` · Hestia status: ${result.hestia_status}` : ''}
                  {result.hestia_action ? ` · Hestia: ${result.hestia_action}` : ''}
                  {result.message ? ` · ${result.message}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">WHM sync results will appear here</p>
        )}
      </div>
    </div>
  );
};
