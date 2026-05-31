import React, { useState, useEffect, useMemo } from 'react';
import { Cloud, RefreshCw, Zap, Check, X, Shield, Globe, Trash2, AlertCircle, Search, Plus, Edit2, Save, Server, CheckSquare } from 'lucide-react';
import { Client, HestiaConfig, HestiaDnsRecord, CloudflareDnsRecord, CloudflareConfig } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import type { ToastActions } from './Toast';
import type { ConfirmFn } from './ConfirmDialog';
import * as hestiaApi from '../services/hestiaApi';
import * as cfApi from '../services/cloudflareApi';

interface Props {
  client: Client;
  hestiaConfig: HestiaConfig;
  hestiaConnected: boolean;
  addLog: (action: string, details: string, status: 'success' | 'error' | 'info') => void;
  toast: ToastActions;
  confirm: ConfirmFn;
}

interface PushResult {
  record: string;
  type: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
}

export const ClientDnsPanel: React.FC<Props> = ({
  client, hestiaConfig, hestiaConnected, addLog, toast, confirm,
}) => {
  // The domain to use for HestiaCP lookup — from client's Cloudflare zone name
  const clientDomain = client.cf_zone_name || '';

  // Cloudflare state
  const [cfRecords, setCfRecords] = useState<CloudflareDnsRecord[]>([]);
  const [loadingCf, setLoadingCf] = useState(false);
  const [cfConnected, setCfConnected] = useState(false);
  const [cfError, setCfError] = useState('');
  const [cfSearch, setCfSearch] = useState('');

  // CF Bulk Selection
  const [selectedCfIds, setSelectedCfIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);

  // CF Add/Edit form
  const [showCfForm, setShowCfForm] = useState(false);
  const [editingCfRecord, setEditingCfRecord] = useState<CloudflareDnsRecord | null>(null);
  const [cfForm, setCfForm] = useState({ type: 'A', name: '', content: '', ttl: '1', proxied: false, priority: '10' });
  const [cfFormSaving, setCfFormSaving] = useState(false);
  const [cfFormError, setCfFormError] = useState('');

  // HestiaCP DNS records for the client's domain
  const [hestiaDnsRecords, setHestiaDnsRecords] = useState<HestiaDnsRecord[]>([]);
  const [loadingHestia, setLoadingHestia] = useState(false);
  const [hestiaError, setHestiaError] = useState('');
  const [dnsDebug, setDnsDebug] = useState<string[]>([]);
  const [hestiaSearch, setHestiaSearch] = useState('');

  // Push state
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState<PushResult[]>([]);
  const [deletingRecord, setDeletingRecord] = useState<string | null>(null);

  const clientCfConfig: CloudflareConfig = { apiToken: client.cf_api_token || '', zoneId: client.cf_zone_id || '' };

  // Filtered HestiaCP records
  const filteredHestiaRecords = useMemo(() => {
    if (!hestiaSearch.trim()) return hestiaDnsRecords;
    const q = hestiaSearch.toLowerCase();
    return hestiaDnsRecords.filter(r =>
      r.record.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)
    );
  }, [hestiaDnsRecords, hestiaSearch]);

  // Filtered CF records
  const filteredCfRecords = useMemo(() => {
    if (!cfSearch.trim()) return cfRecords;
    const q = cfSearch.toLowerCase();
    return cfRecords.filter(r =>
      r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
    );
  }, [cfRecords, cfSearch]);

  // =====================
  // AUTO-FETCH ON MOUNT
  // =====================
  useEffect(() => {
    // Auto-fetch Cloudflare records
    if (client.cf_api_token && client.cf_zone_id) {
      fetchCfRecords();
    }
    // Auto-fetch HestiaCP DNS records using client's domain
    if (hestiaConnected && clientDomain) {
      fetchHestiaDns();
    }
  }, [client.id, hestiaConnected]);

  // Fetch Cloudflare records
  const fetchCfRecords = async () => {
    if (!client.cf_api_token || !client.cf_zone_id) { setCfError('Client has no Cloudflare credentials'); return; }
    setLoadingCf(true); setCfError('');
    try {
      const records = await cfApi.getAllDnsRecords(clientCfConfig);
      setCfRecords(records); setCfConnected(true);
      addLog('Cloudflare', `Loaded ${records.length} records for ${client.name}`, 'success');
      toast.success('Cloudflare Connected', `Loaded ${records.length} DNS records`);
    } catch (err: any) { setCfError(err.message); setCfConnected(false); addLog('Cloudflare', `Error: ${err.message}`, 'error'); toast.error('Cloudflare Error', err.message); }
    setLoadingCf(false);
  };

  // Fetch ALL DNS records from HestiaCP for the client's domain
  const fetchHestiaDns = async () => {
    if (!hestiaConnected) { setHestiaError('HestiaCP not connected. Go to Settings.'); return; }
    if (!clientDomain) { setHestiaError('Client has no domain (zone name) set. Edit the client to add it.'); return; }
    setLoadingHestia(true); setHestiaError(''); setHestiaDnsRecords([]); setSelectedRecords(new Set()); setPushResults([]); setDnsDebug([]);
    try {
      const result = await hestiaApi.listAllMailDnsRecords(hestiaConfig, hestiaConfig.user, clientDomain);

      const hostTarget = (hestiaConfig.hostIp || hestiaConfig.hostname || '').trim();
      const records = [...result.records];
      const debug = [...(result.debug || [])];

      if (hostTarget) {
        const hasMailA = records.some(r => r.type === 'A' && r.record === 'mail' && String(r.value).trim() === hostTarget);
        const hasWebmailA = records.some(r => r.type === 'A' && r.record === 'webmail' && String(r.value).trim() === hostTarget);

        if (!hasMailA) {
          records.push({
            id: `synthetic-mail-a-${clientDomain}`,
            record: 'mail',
            type: 'A',
            priority: '',
            value: hostTarget,
            ttl: '14400',
            suspended: 'no',
            time: '',
            date: '',
          });
          debug.push(`Synthetic A added: mail → ${hostTarget}`);
        }

        if (!hasWebmailA) {
          records.push({
            id: `synthetic-webmail-a-${clientDomain}`,
            record: 'webmail',
            type: 'A',
            priority: '',
            value: hostTarget,
            ttl: '14400',
            suspended: 'no',
            time: '',
            date: '',
          });
          debug.push(`Synthetic A added: webmail → ${hostTarget}`);
        }
      }

      setHestiaDnsRecords(records);
      setDnsDebug(debug);
      addLog('HestiaCP', `Found ${records.length} DNS records for ${clientDomain}`, 'success');
    } catch (err: any) {
      setHestiaError(err.message);
      addLog('HestiaCP', `Error loading DNS for ${clientDomain}: ${err.message}`, 'error');
    }
    setLoadingHestia(false);
  };

  // Push selected records to Cloudflare
  const pushToCloudflare = async () => {
    const recordsToPush = hestiaDnsRecords.filter(r => selectedRecords.has(r.id));
    if (recordsToPush.length === 0) return;
    setPushing(true); setPushResults([]);
    addLog('Push', `Pushing ${recordsToPush.length} records to ${client.name}'s Cloudflare`, 'info');
    const results: PushResult[] = [];
    const updatedCfRecords = [...cfRecords];
    for (const record of recordsToPush) {
      let fullName = record.record;
      if (record.record === '@' || record.record === '') fullName = clientDomain;
      else if (!record.record.endsWith(clientDomain)) fullName = `${record.record}.${clientDomain}`;
      try {
        const existing = cfRecords.find(cf => cf.name === fullName && cf.type === record.type);
        if (existing) {
          const updated = await cfApi.updateDnsRecord(clientCfConfig, existing.id, {
            type: record.type, name: fullName, content: record.value, ttl: parseInt(record.ttl) || 1, proxied: false,
            priority: record.type === 'MX' ? parseInt(record.priority) || 10 : undefined,
          });
          const idx = updatedCfRecords.findIndex(r => r.id === existing.id);
          if (idx !== -1) updatedCfRecords[idx] = updated;
          results.push({ record: fullName, type: record.type, status: 'success', message: 'Updated' });
        } else {
          const newRecord = await cfApi.createDnsRecord(clientCfConfig, {
            type: record.type, name: fullName, content: record.value, ttl: parseInt(record.ttl) || 1, proxied: false,
            priority: record.type === 'MX' ? parseInt(record.priority) || 10 : undefined,
          });
          updatedCfRecords.push(newRecord);
          results.push({ record: fullName, type: record.type, status: 'success', message: 'Created' });
        }
      } catch (err: any) { results.push({ record: fullName, type: record.type, status: 'error', message: err.message }); }
    }
    setCfRecords(updatedCfRecords); setPushResults(results); setPushing(false);
    const ok = results.filter(r => r.status === 'success').length;
    const fail = results.filter(r => r.status === 'error').length;
    if (fail === 0) toast.success('Push Complete', `${ok} records pushed successfully`);
    else toast.warning('Push Partial', `${ok} succeeded, ${fail} failed`);
  };

  // Delete CF record
  const deleteCfRecord = async (recordId: string, name: string, type: string) => {
    const approved = await confirm({
      title: `Delete ${type} record \"${name}\"?`,
      message: 'This DNS record will be removed from Cloudflare immediately.',
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!approved) return;
    setDeletingRecord(recordId);
    try {
      await cfApi.deleteDnsRecord(clientCfConfig, recordId);
      setCfRecords(prev => prev.filter(r => r.id !== recordId));
      setSelectedCfIds(prev => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
      addLog('Cloudflare', `Deleted ${type}: ${name}`, 'success');
      toast.success('Record Deleted', `${type} record ${name} removed`);
    } catch (err: any) { addLog('Cloudflare', `Delete error: ${err.message}`, 'error'); toast.error('Delete Failed', err.message); }
    setDeletingRecord(null);
  };

  const handleBulkDeleteCf = async () => {
    if (selectedCfIds.size === 0) return;
    const approved = await confirm({
      title: `Delete ${selectedCfIds.size} records?`,
      message: 'All selected DNS records will be permanently removed from Cloudflare.',
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!approved) return;

    setDeletingBulk(true);
    let ok = 0;
    let fail = 0;
    for (const id of Array.from(selectedCfIds)) {
      try {
        await cfApi.deleteDnsRecord(clientCfConfig, id);
        ok++;
      } catch {
        fail++;
      }
    }
    setDeletingBulk(false);
    setSelectedCfIds(new Set());
    await fetchCfRecords();

    if (fail === 0) toast.success('Bulk Delete Complete', `Deleted ${ok} records`);
    else toast.warning('Bulk Delete Partial', `Deleted ${ok}, ${fail} failed`);
  };

  const toggleCfId = (id: string) => {
    const next = new Set(selectedCfIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedCfIds(next);
  };

  const toggleAllCf = () => {
    if (selectedCfIds.size === filteredCfRecords.length) setSelectedCfIds(new Set());
    else setSelectedCfIds(new Set(filteredCfRecords.map(r => r.id)));
  };

  // CF Add/Edit
  const openAddCfForm = () => { setCfForm({ type: 'A', name: '', content: '', ttl: '1', proxied: false, priority: '10' }); setEditingCfRecord(null); setCfFormError(''); setShowCfForm(true); };
  const openEditCfForm = (record: CloudflareDnsRecord) => {
    setCfForm({ type: record.type, name: record.name, content: record.content, ttl: String(record.ttl), proxied: record.proxied, priority: String(record.priority || 10) });
    setEditingCfRecord(record); setCfFormError(''); setShowCfForm(true);
  };
  const closeCfForm = () => { setShowCfForm(false); setEditingCfRecord(null); setCfFormError(''); };
  const handleCfFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfForm.name || !cfForm.content) return;
    setCfFormSaving(true); setCfFormError('');
    try {
      const recordData = { type: cfForm.type, name: cfForm.name, content: cfForm.content, ttl: parseInt(cfForm.ttl) || 1, proxied: cfForm.proxied, priority: cfForm.type === 'MX' ? parseInt(cfForm.priority) || 10 : undefined };
      if (editingCfRecord) {
        const updated = await cfApi.updateDnsRecord(clientCfConfig, editingCfRecord.id, recordData);
        setCfRecords(prev => prev.map(r => r.id === editingCfRecord.id ? updated : r));
        addLog('Cloudflare', `Updated ${cfForm.type}: ${cfForm.name}`, 'success');
        toast.success('Record Updated', `${cfForm.type} record for ${cfForm.name}`);
      } else {
        const created = await cfApi.createDnsRecord(clientCfConfig, recordData);
        setCfRecords(prev => [...prev, created]);
        addLog('Cloudflare', `Created ${cfForm.type}: ${cfForm.name}`, 'success');
        toast.success('Record Created', `${cfForm.type} record for ${cfForm.name}`);
      }
      closeCfForm();
    } catch (err: any) { setCfFormError(err.message); addLog('Cloudflare', `Save error: ${err.message}`, 'error'); toast.error('Save Failed', err.message); }
    setCfFormSaving(false);
  };

  // Toggle record selection
  const toggleRecord = (id: string) => { const s = new Set(selectedRecords); if (s.has(id)) s.delete(id); else s.add(id); setSelectedRecords(s); };
  const toggleAllRecords = () => {
    if (selectedRecords.size === hestiaDnsRecords.length) setSelectedRecords(new Set());
    else setSelectedRecords(new Set(hestiaDnsRecords.map(r => r.id)));
  };

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-gray-700/30 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{client.name}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1 flex-wrap">
              {clientDomain && (
                <span className="flex items-center gap-1 text-orange-400 font-medium">
                  <Globe size={14} />{clientDomain}
                </span>
              )}
              {cfConnected && <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">CF Connected</span>}
              {hestiaConnected && <span className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full">HestiaCP Ready</span>}
            </div>
            {!clientDomain && (
              <p className="text-amber-400 text-xs mt-2">⚠️ No domain set — edit this client and add a Zone Name (domain)</p>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===================== LEFT: HestiaCP DNS for client domain ===================== */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Server size={18} className="text-purple-400" />
                HestiaCP DNS
                {clientDomain && <span className="text-purple-300 font-mono text-sm">({clientDomain})</span>}
                {loadingHestia && <LoadingSpinner size="sm" />}
              </h3>
              <button onClick={fetchHestiaDns} disabled={!hestiaConnected || !clientDomain || loadingHestia}
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                <RefreshCw size={14} /> Reload
              </button>
            </div>
          </div>

          {/* Search */}
          {hestiaDnsRecords.length > 0 && (
            <div className="px-4 pt-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={hestiaSearch} onChange={e => setHestiaSearch(e.target.value)}
                  placeholder="Filter records..."
                  className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-8 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                {hestiaSearch && <button onClick={() => setHestiaSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
              </div>
            </div>
          )}

          {/* Select All / count */}
          {hestiaDnsRecords.length > 0 && (
            <div className="px-4 pt-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">{hestiaSearch ? `${filteredHestiaRecords.length} of ` : ''}{hestiaDnsRecords.length} records</p>
              <button onClick={toggleAllRecords} className="text-xs text-purple-400 hover:text-purple-300">
                {selectedRecords.size === hestiaDnsRecords.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}

          <div className="p-4 pt-2">
            {/* Debug info */}
            {dnsDebug.length > 0 && !loadingHestia && (
              <div className="mb-3 p-2 bg-gray-900/50 border border-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Fetch Log:</p>
                {dnsDebug.map((d, i) => <p key={i} className="text-xs text-gray-400 font-mono">• {d}</p>)}
              </div>
            )}

            {hestiaError && (
              <div className="mb-3 p-2 bg-red-900/20 border border-red-700/30 rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400" /><p className="text-red-400 text-xs">{hestiaError}</p>
              </div>
            )}

            {!hestiaConnected ? (
              <p className="text-gray-500 text-sm text-center py-6">Connect HestiaCP in Settings first</p>
            ) : !clientDomain ? (
              <p className="text-amber-400 text-sm text-center py-6">Edit this client and add a Zone Name (domain) to load DNS records</p>
            ) : loadingHestia ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="md" text={`Loading DNS for ${clientDomain}...`} /></div>
            ) : filteredHestiaRecords.length > 0 ? (
              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {filteredHestiaRecords.map((record, i) => {
                  const result = pushResults.find(r => r.record.includes(record.record) && r.type === record.type);
                  return (
                    <label key={record.id || i}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedRecords.has(record.id) ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-gray-900/40 border border-gray-700/40 hover:border-purple-500/20'
                      } ${result?.status === 'success' ? 'border-green-500/30' : ''} ${result?.status === 'error' ? 'border-red-500/30' : ''}`}>
                      <input type="checkbox" checked={selectedRecords.has(record.id)} onChange={() => toggleRecord(record.id)}
                        className="mt-1 rounded bg-gray-800 border-gray-600 text-purple-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${getTypeColor(record.type)}`}>{record.type}</span>
                          <span className="text-white text-sm font-mono">{record.record || '@'}</span>
                          {record.priority && <span className="text-xs text-gray-500">pri:{record.priority}</span>}
                          {result && (
                            <span className={`text-xs flex items-center gap-1 ${result.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                              {result.status === 'success' ? <Check size={12} /> : <X size={12} />}{result.message}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs font-mono mt-1 break-all">{record.value}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : hestiaDnsRecords.length > 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No records match "{hestiaSearch}"</p>
            ) : (
              <p className="text-gray-500 text-sm text-center py-6">No DNS records found for {clientDomain} on HestiaCP</p>
            )}

            {/* Push Button */}
            {hestiaDnsRecords.length > 0 && (
              <button onClick={pushToCloudflare} disabled={pushing || selectedRecords.size === 0 || !cfConnected}
                className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 text-black font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                {pushing ? <LoadingSpinner size="sm" text="Pushing..." /> : <><Zap size={18} />Push {selectedRecords.size} Records to Cloudflare</>}
              </button>
            )}
            {!cfConnected && hestiaDnsRecords.length > 0 && (
              <p className="text-amber-400 text-xs mt-2 text-center">⚠️ Cloudflare not connected for this client</p>
            )}
          </div>
        </div>

        {/* ===================== RIGHT: Cloudflare ===================== */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Cloud size={18} className="text-orange-400" />Cloudflare DNS
                {cfConnected && clientDomain && <span className="text-orange-300 font-mono text-sm">({clientDomain})</span>}
                {loadingCf && <LoadingSpinner size="sm" />}
              </h3>
              <div className="flex gap-2">
                <button onClick={openAddCfForm} disabled={!cfConnected}
                  className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                  <Plus size={14} />Add
                </button>
                <button onClick={fetchCfRecords} disabled={loadingCf || !client.cf_api_token}
                  className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                  <RefreshCw size={14} />Reload
                </button>
              </div>
            </div>
          </div>

          {/* CF Add/Edit Form */}
          {showCfForm && (
            <form onSubmit={handleCfFormSubmit} className="p-4 border-b border-gray-700/50 bg-gray-900/30">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                {editingCfRecord ? <><Edit2 size={14} className="text-blue-400" />Edit Record</> : <><Plus size={14} className="text-green-400" />Add Record</>}
              </h4>
              {cfFormError && (
                <div className="mb-3 p-2 bg-red-900/20 border border-red-700/30 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400" /><p className="text-red-400 text-xs">{cfFormError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select value={cfForm.type} onChange={e => setCfForm({ ...cfForm, type: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                    {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input type="text" value={cfForm.name} onChange={e => setCfForm({ ...cfForm, name: e.target.value })}
                    placeholder="@ or subdomain" required
                    className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Content / Value</label>
                <input type="text" value={cfForm.content} onChange={e => setCfForm({ ...cfForm, content: e.target.value })}
                  placeholder="IP address or value" required
                  className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">TTL</label>
                  <select value={cfForm.ttl} onChange={e => setCfForm({ ...cfForm, ttl: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                    <option value="1">Auto</option><option value="60">1m</option><option value="300">5m</option>
                    <option value="3600">1h</option><option value="14400">4h</option><option value="86400">1d</option>
                  </select>
                </div>
                {cfForm.type === 'MX' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Priority</label>
                    <input type="number" value={cfForm.priority} onChange={e => setCfForm({ ...cfForm, priority: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                  </div>
                )}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={cfForm.proxied} onChange={e => setCfForm({ ...cfForm, proxied: e.target.checked })}
                      className="rounded bg-gray-800 border-gray-600 text-orange-500" />Proxied
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={cfFormSaving || !cfForm.name || !cfForm.content}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  {cfFormSaving ? <LoadingSpinner size="sm" /> : <Save size={14} />}{editingCfRecord ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={closeCfForm} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          )}

          {/* CF Search */}
          {cfRecords.length > 0 && (
            <div className="px-4 pt-3 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={cfSearch} onChange={e => setCfSearch(e.target.value)}
                  placeholder="Search records..."
                  className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-8 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                {cfSearch && <button onClick={() => setCfSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
              </div>
              <div className="flex items-center justify-between">
                <button 
                  onClick={toggleAllCf}
                  className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  <CheckSquare size={12} />
                  {selectedCfIds.size === filteredCfRecords.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedCfIds.size > 0 && (
                  <button 
                    onClick={handleBulkDeleteCf}
                    disabled={deletingBulk}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    {deletingBulk ? <LoadingSpinner size="sm" /> : <Trash2 size={12} />}
                    Delete Selected ({selectedCfIds.size})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CF Records List */}
          <div className="p-4 pt-2">
            {cfError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" /><p className="text-red-400 text-sm">{cfError}</p>
              </div>
            )}
            {!client.cf_api_token || !client.cf_zone_id ? (
              <div className="text-center py-8">
                <Cloud size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 mb-2">No Cloudflare credentials</p>
                <p className="text-xs text-gray-500">Edit this client to add their API Token and Zone ID</p>
              </div>
            ) : loadingCf ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="lg" text="Loading DNS records..." /></div>
            ) : filteredCfRecords.length > 0 ? (
              <>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                  {filteredCfRecords.map(record => (
                    <div key={record.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${selectedCfIds.has(record.id) ? 'bg-orange-600/10 border-orange-500/30' : 'bg-gray-900/40 border-transparent hover:bg-gray-700/30'}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input 
                          type="checkbox"
                          checked={selectedCfIds.has(record.id)}
                          onChange={() => toggleCfId(record.id)}
                          className="rounded bg-gray-800 border-gray-600 text-orange-500 focus:ring-orange-500 shrink-0 mr-1"
                        />
                        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${getTypeColor(record.type)}`}>{record.type}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs font-mono truncate">{record.name}</p>
                          <p className="text-gray-500 text-xs font-mono truncate">{record.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {record.proxied && <span title="Proxied"><Shield size={12} className="text-orange-400" /></span>}
                        <span className="text-gray-600 text-xs w-8 text-right">{record.ttl === 1 ? 'Auto' : record.ttl}</span>
                        <button onClick={() => openEditCfForm(record)}
                          className="text-blue-400 hover:text-blue-300 p-1.5 hover:bg-blue-500/10 rounded transition-colors" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => deleteCfRecord(record.id, record.name, record.type)} disabled={deletingRecord === record.id}
                          className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded disabled:opacity-50 transition-colors" title="Delete">
                          {deletingRecord === record.id ? <LoadingSpinner size="sm" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {cfSearch ? `${filteredCfRecords.length} of ${cfRecords.length}` : cfRecords.length} records
                </p>
              </>
            ) : cfRecords.length > 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No records match "{cfSearch}"</p>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No DNS records found</p>
            )}
          </div>
        </div>
      </div>

      {/* Push Results Summary */}
      {pushResults.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-3">Push Results</h4>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400">✓ {pushResults.filter(r => r.status === 'success').length} successful</span>
            <span className="text-red-400">✗ {pushResults.filter(r => r.status === 'error').length} failed</span>
          </div>
        </div>
      )}
    </div>
  );
};

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    A: 'bg-blue-500/20 text-blue-400', AAAA: 'bg-cyan-500/20 text-cyan-400',
    CNAME: 'bg-green-500/20 text-green-400', MX: 'bg-amber-500/20 text-amber-400',
    TXT: 'bg-purple-500/20 text-purple-400', NS: 'bg-indigo-500/20 text-indigo-400',
    SRV: 'bg-pink-500/20 text-pink-400', CAA: 'bg-red-500/20 text-red-400',
    SOA: 'bg-gray-500/20 text-gray-400', PTR: 'bg-teal-500/20 text-teal-400',
    DNSKEY: 'bg-yellow-500/20 text-yellow-400', TLSA: 'bg-rose-500/20 text-rose-400',
  };
  return colors[type] || 'bg-gray-500/20 text-gray-400';
}
