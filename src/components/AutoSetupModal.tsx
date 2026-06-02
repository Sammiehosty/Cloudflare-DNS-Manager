import React, { useState, useEffect } from 'react';
import { X, Zap, Check, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { Client, HestiaConfig } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import type { ToastActions } from './Toast';
import * as hestiaApi from '../services/hestiaApi';
import * as cfApi from '../services/cloudflareApi';

interface Props {
  client: Client;
  hestiaConfig: HestiaConfig;
  hestiaConnected: boolean;
  addLog: (action: string, details: string, status: 'success' | 'error' | 'info') => void;
  toast: ToastActions;
  onClose: () => void;
  onComplete: () => void;
}

type StepStatus = 'pending' | 'checking' | 'ok' | 'needs-setup' | 'running' | 'done' | 'error';

interface StepInfo {
  id: string;
  label: string;
  status: StepStatus;
  detail: string;
  result?: string;
}

function generatePassword(len = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_+-=';
  let pwd = '';
  for (let i = 0; i < len; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

export const AutoSetupModal: React.FC<Props> = ({ client, hestiaConfig, addLog, toast, onClose, onComplete }) => {
  const [phase, setPhase] = useState<'check' | 'run' | 'done'>('check');
  const [mailPassword] = useState(() => generatePassword(16));
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [resultSummary, setResultSummary] = useState<{ email: string; password: string; actions: string[] } | null>(null);
  const [closing, setClosing] = useState(false);

  const domain = client.cf_zone_name || '';
  const user = hestiaConfig.user || 'admin';

  const updateStep = (id: string, patch: Partial<StepInfo>) => {
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  // ─── Pre-check phase ─────────────────────────────────────
  useEffect(() => {
    if (!domain) return;
    runPrecheck();
  }, []);

  const runPrecheck = async () => {
    const initial: StepInfo[] = [
      { id: 'mail-domain', label: 'Mail domain', status: 'checking', detail: `Checking ${domain}` },
      { id: 'dns', label: 'Mail / Webmail DNS', status: 'pending', detail: 'Checking Cloudflare records' },
      { id: 'ssl', label: 'Let\'s Encrypt SSL', status: 'pending', detail: 'Checking SSL certificate' },
      { id: 'mail-account', label: 'Mail account (support@)', status: 'pending', detail: 'Checking email accounts' },
    ];
    setSteps(initial);

    // 1. Check mail domain
    try {
      const domains = await hestiaApi.listMailDomains(hestiaConfig, user);
      const found = domains.some(d => d.domain === domain);
      updateStep('mail-domain', {
        status: found ? 'ok' : 'needs-setup',
        detail: found ? 'Mail domain exists' : 'Will be created',
      });
    } catch (e: any) {
      updateStep('mail-domain', { status: 'needs-setup', detail: 'Will be created' });
    }

    // 2. Check mail/webmail DNS on Cloudflare
    if (client.cf_api_token && client.cf_zone_id) {
      try {
        const records = await cfApi.getAllDnsRecords({ apiToken: client.cf_api_token, zoneId: client.cf_zone_id });
        const hasMail = records.some(r => r.type === 'A' && r.name === `mail.${domain}`);
        const hasWebmail = records.some(r => r.type === 'A' && r.name === `webmail.${domain}`);
        if (hasMail && hasWebmail) {
          updateStep('dns', { status: 'ok', detail: 'mail + webmail A records exist' });
        } else {
          const missing = [];
          if (!hasMail) missing.push('mail');
          if (!hasWebmail) missing.push('webmail');
          updateStep('dns', { status: 'needs-setup', detail: `Missing: ${missing.join(', ')} A record(s)` });
        }
      } catch {
        updateStep('dns', { status: 'needs-setup', detail: 'Could not check — will create' });
      }
    } else {
      updateStep('dns', { status: 'needs-setup', detail: 'No Cloudflare credentials — skipped' });
    }

    // 3. Check SSL
    try {
      const domains = await hestiaApi.listMailDomains(hestiaConfig, user);
      const md = domains.find(d => d.domain === domain);
      if (md && (md.ssl === 'yes' || md.letsencrypt === 'yes')) {
        updateStep('ssl', { status: 'ok', detail: 'Let\'s Encrypt SSL active' });
      } else {
        updateStep('ssl', { status: 'needs-setup', detail: 'Will install Let\'s Encrypt SSL' });
      }
    } catch {
      updateStep('ssl', { status: 'needs-setup', detail: 'Will install Let\'s Encrypt SSL' });
    }

    // 4. Check mail accounts
    try {
      const accts = await hestiaApi.listMailAccounts(hestiaConfig, user, domain);
      if (accts.length > 0) {
        updateStep('mail-account', { status: 'ok', detail: `${accts.length} account(s) exist` });
      } else {
        updateStep('mail-account', { status: 'needs-setup', detail: 'Will create support@' + domain });
      }
    } catch {
      updateStep('mail-account', { status: 'needs-setup', detail: 'Will create support@' + domain });
    }

    setPhase('check');
  };

  const actions = steps.filter(s => s.status === 'needs-setup');

  // ─── Run phase ────────────────────────────────────────────
  const runSetup = async () => {
    setPhase('run');
    const done: string[] = [];

    // 1. Mail domain
    const mdStep = steps.find(s => s.id === 'mail-domain')!;
    if (mdStep.status === 'needs-setup') {
      updateStep('mail-domain', { status: 'running', detail: 'Creating...' });
      try {
        await hestiaApi.addMailDomain(hestiaConfig, user, domain);
        updateStep('mail-domain', { status: 'done', detail: 'Created', result: 'Mail domain created' });
        done.push(`Created mail domain ${domain}`);
      } catch (e: any) {
        if (e.message?.includes('already exists') || e.message?.includes('exist')) {
          updateStep('mail-domain', { status: 'done', detail: 'Already existed', result: 'Already existed' });
          done.push(`Mail domain ${domain} already existed`);
        } else {
          updateStep('mail-domain', { status: 'error', detail: e.message, result: 'Failed: ' + e.message });
        }
      }
    } else {
      updateStep('mail-domain', { status: 'done', detail: 'Already existed', result: 'Already existed' });
    }

    // 2. DNS
    const dnsStep = steps.find(s => s.id === 'dns')!;
    if (dnsStep.status === 'needs-setup' && client.cf_api_token && client.cf_zone_id) {
      updateStep('dns', { status: 'running', detail: 'Pushing records...' });
      const hostIp = (hestiaConfig.hostIp || hestiaConfig.hostname || '').trim();
      if (hostIp) {
        try {
          const result = await cfApi.bulkUpdateIp(hostIp, ['mail', 'webmail'], [{
            api_token: client.cf_api_token,
            zone_id: client.cf_zone_id,
            zone_name: domain,
          }]);
          const n = result.totalUpdated;
          updateStep('dns', { status: 'done', detail: `${n} record(s) pushed`, result: `${n} record(s) pushed` });
          done.push(`Pushed ${n} DNS record(s) to Cloudflare`);
        } catch (e: any) {
          updateStep('dns', { status: 'error', detail: e.message, result: 'Failed: ' + e.message });
        }
      } else {
        updateStep('dns', { status: 'error', detail: 'No host IP configured', result: 'No host IP' });
      }
    } else {
      updateStep('dns', { status: 'done', detail: 'Already set', result: 'Already set' });
    }

    // 3. SSL
    const sslStep = steps.find(s => s.id === 'ssl')!;
    if (sslStep.status === 'needs-setup') {
      updateStep('ssl', { status: 'running', detail: 'Requesting certificate...' });
      try {
        const msg = await hestiaApi.addMailSsl(hestiaConfig, user, domain);
        updateStep('ssl', { status: 'done', detail: msg, result: msg });
        done.push(`Installed SSL for mail.${domain}`);
      } catch (e: any) {
        updateStep('ssl', { status: 'error', detail: e.message, result: 'Failed: ' + e.message });
      }
    } else {
      updateStep('ssl', { status: 'done', detail: 'Already active', result: 'Already active' });
    }

    // 4. Mail account
    const acctStep = steps.find(s => s.id === 'mail-account')!;
    const supportEmail = `support@${domain}`;
    const supportAccount = 'support';
    if (acctStep.status === 'needs-setup') {
      updateStep('mail-account', { status: 'running', detail: 'Creating account...' });
      try {
        await hestiaApi.addMailAccount(hestiaConfig, user, domain, supportAccount, mailPassword);
        updateStep('mail-account', { status: 'done', detail: `${supportEmail} created`, result: `${supportEmail} created` });
        done.push(`Created ${supportEmail}`);
      } catch (e: any) {
        if (e.message?.includes('already exists')) {
          updateStep('mail-account', { status: 'done', detail: `${supportEmail} already existed`, result: 'Already existed' });
          done.push(`${supportEmail} already existed`);
        } else {
          updateStep('mail-account', { status: 'error', detail: e.message, result: 'Failed: ' + e.message });
        }
      }
    } else {
      updateStep('mail-account', { status: 'done', detail: 'Accounts exist', result: 'Already existed' });
    }

    setResultSummary({ email: supportEmail, password: mailPassword, actions: done });
    setPhase('done');
    toast.success('Auto Setup Complete', `${done.length} step(s) completed`);
    addLog('AutoSetup', `Completed for ${domain}: ${done.join('; ')}`, 'success');
  };

  const statusIcon = (s: StepStatus) => {
    switch (s) {
      case 'checking': return <LoadingSpinner size="sm" />;
      case 'ok': return <Check size={14} className="text-green-400" />;
      case 'needs-setup': return <AlertCircle size={14} className="text-amber-400" />;
      case 'running': return <LoadingSpinner size="sm" />;
      case 'done': return <Check size={14} className="text-green-400" />;
      case 'error': return <X size={14} className="text-red-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-stretch md:items-center justify-stretch md:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !closing && phase !== 'run' && onClose()} />
      <div className="relative w-full h-full md:h-auto md:max-w-lg md:rounded-2xl bg-gray-900 border-0 md:border md:border-gray-700 md:shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Auto Setup</h3>
              <p className="text-xs text-gray-400">{domain}</p>
            </div>
          </div>
          <button onClick={() => !closing && phase !== 'run' && onClose()} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 flex-1 overflow-y-auto">
          {/* PHASE 1: Pre-check */}
          {phase === 'check' && (
            <>
              <p className="text-sm text-gray-300 mb-4">This will configure the following for <strong className="text-white">{domain}</strong>:</p>
              <div className="space-y-2">
                {steps.map(step => (
                  <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg border ${step.status === 'ok' ? 'bg-green-900/10 border-green-700/30' : step.status === 'needs-setup' ? 'bg-amber-900/10 border-amber-700/30' : 'bg-gray-800/50 border-gray-700/50'}`}>
                    {statusIcon(step.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{step.label}</p>
                      <p className={`text-xs mt-0.5 ${step.status === 'ok' ? 'text-green-400' : step.status === 'needs-setup' ? 'text-amber-400' : 'text-gray-400'}`}>
                        {step.status === 'ok' ? '✓ ' : step.status === 'needs-setup' ? '→ ' : ''}{step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {actions.length > 0 && (
                <div className="mt-3 p-3 bg-amber-900/10 border border-amber-700/30 rounded-lg">
                  <p className="text-xs text-amber-300">
                    <strong>{actions.length}</strong> action(s) will be performed.{' '}
                    {steps.filter(s => s.status === 'ok').length > 0 && (
                      <span className="text-green-400">{steps.filter(s => s.status === 'ok').length} already configured.</span>
                    )}
                  </p>
                </div>
              )}
              {actions.length === 0 && (
                <div className="mt-3 p-3 bg-green-900/10 border border-green-700/30 rounded-lg">
                  <p className="text-xs text-green-300">Everything is already set up for <strong>{domain}</strong>. No changes needed.</p>
                </div>
              )}
            </>
          )}

          {/* PHASE 2: Running */}
          {phase === 'run' && (
            <>
              <p className="text-sm text-gray-300 mb-4">Running setup for <strong className="text-white">{domain}</strong>...</p>
              <div className="space-y-2">
                {steps.map(step => (
                  <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    step.status === 'done' ? 'bg-green-900/10 border-green-700/30' :
                    step.status === 'error' ? 'bg-red-900/10 border-red-700/30' :
                    step.status === 'running' ? 'bg-blue-900/10 border-blue-700/30' :
                    step.status === 'ok' ? 'bg-gray-800/30 border-gray-700/40' :
                    'bg-gray-800/50 border-gray-700/50'
                  }`}>
                    {statusIcon(step.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{step.label}</p>
                      <p className="text-xs mt-0.5 text-gray-400">{step.detail}</p>
                      {step.result && step.status === 'done' && <p className="text-xs mt-0.5 text-green-400">{step.result}</p>}
                      {step.result && step.status === 'error' && <p className="text-xs mt-0.5 text-red-400">{step.result}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* PHASE 3: Done */}
          {phase === 'done' && resultSummary && (
            <>
              <div className="p-4 bg-green-900/10 border border-green-700/30 rounded-xl mb-4">
                <h4 className="text-green-400 font-semibold flex items-center gap-2 mb-2"><Check size={18} />Setup Complete</h4>
                <p className="text-sm text-gray-300">All steps for <strong className="text-white">{domain}</strong> have been processed.</p>
              </div>

              {/* Steps summary */}
              <div className="space-y-2 mb-4">
                {steps.map(step => (
                  <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    step.status === 'done' ? 'bg-green-900/10 border-green-700/30' :
                    step.status === 'error' ? 'bg-red-900/10 border-red-700/30' :
                    'bg-gray-800/50 border-gray-700/50'
                  }`}>
                    {statusIcon(step.status)}
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-gray-400">{step.result || step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mail account card */}
              <div className="p-4 bg-gradient-to-r from-purple-900/20 to-orange-900/20 border border-purple-700/30 rounded-xl">
                <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                  <Mail size={16} className="text-orange-400" />Email Account Created
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg">
                    <span className="text-xs text-gray-400 w-16 shrink-0">Email</span>
                    <span className="text-white text-sm font-mono">{resultSummary.email}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg">
                    <span className="text-xs text-gray-400 w-16 shrink-0">Password</span>
                    <span className="text-white text-sm font-mono select-all">{resultSummary.password}</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">Share these credentials with the client. They can use this email with any mail client (IMAP/SMTP).</p>
              </div>

              {/* Actions taken */}
              {resultSummary.actions.length > 0 && (
                <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Actions Performed:</p>
                  <ul className="space-y-1">
                    {resultSummary.actions.map((action, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-center gap-2">
                        <ArrowRight size={10} className="text-green-400 shrink-0" />{action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50 flex gap-3 mt-auto shrink-0">
          {phase === 'check' && (
            <>
              <button onClick={runSetup}
                disabled={actions.length === 0}
                className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 disabled:opacity-50 text-black font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2">
                <Zap size={16} />Run Auto Setup
              </button>
              <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg">Cancel</button>
            </>
          )}
          {phase === 'run' && (
            <div className="flex-1 text-center py-2">
              <LoadingSpinner size="sm" text="Processing... please wait" />
            </div>
          )}
          {phase === 'done' && (
            <button onClick={() => { setClosing(true); onComplete(); onClose(); }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2">
              <Check size={16} />Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [autoSetupClient, setAutoSetupClient] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [hostIpUsage, setHostIpUsage] = useState<Record<number, 'loading' | 'yes' | 'no' | 'unknown'>>({});

  const isIpv4 = (value: string) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim());

  const resolveHostToIp = async (value: string): Promise<string> => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (isIpv4(trimmed)) return trimmed;

    try {
      const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(trimmed)}&type=A`);
      const data = await response.json();
      const answer = Array.isArray(data.Answer)
        ? data.Answer.find((a: any) => a.type === 1 && typeof a.data === 'string')
        : null;
      return answer?.data?.trim() || '';
    } catch {
      return '';
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cf_api_token: '',
    cf_zone_id: '',
    cf_zone_name: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(q) ||
      (client.cf_zone_name || '').toLowerCase().includes(q) ||
      (client.notes || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const fetchClients = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await backendApi.getClients();
      if (response.success && response.data) {
        setClients(response.data);
        addLog('Clients', `Loaded ${response.data.length} clients`, 'success');
      }
    } catch (err: any) {
      setError(err.message);
      addLog('Clients', `Error loading clients: ${err.message}`, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const checkUsage = async () => {
      const resolvedTarget = await resolveHostToIp(hestiaHostIp || '');
      const target = resolvedTarget.trim().toLowerCase();
      if (!target || clients.length === 0) {
        setHostIpUsage({});
        return;
      }

      const eligible = clients.filter(c => c.cf_api_token && c.cf_zone_id && c.cf_zone_name);
      const loadingMap: Record<number, 'loading'> = {};
      eligible.forEach(c => {
        loadingMap[c.id] = 'loading';
      });
      setHostIpUsage(prev => ({ ...prev, ...loadingMap }));

      const results = await Promise.all(
        eligible.map(async client => {
          try {
            const cfConfig = {
              apiToken: client.cf_api_token,
              zoneId: client.cf_zone_id,
            };
            const records = await cfApi.getAllDnsRecords(cfConfig);
            const zone = (client.cf_zone_name || '').trim().toLowerCase();
            const mailName = `mail.${zone}`;
            const webmailName = `webmail.${zone}`;
            const matches = records.some(r => {
              const recordName = String(r.name || '').trim().toLowerCase();
              const content = String(r.content || '').trim().toLowerCase();
              return r.type === 'A' && (recordName === mailName || recordName === webmailName) && content === target;
            });
            return [client.id, matches ? 'yes' : 'no'] as const;
          } catch {
            return [client.id, 'unknown'] as const;
          }
        })
      );

      const usageMap: Record<number, 'loading' | 'yes' | 'no' | 'unknown'> = {};
      results.forEach(([id, status]) => {
        usageMap[id] = status;
      });
      setHostIpUsage(prev => ({ ...prev, ...usageMap }));
    };

    void checkUsage();
  }, [clients, hestiaHostIp]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      cf_api_token: '',
      cf_zone_id: '',
      cf_zone_name: '',
      notes: '',
    });
    setEditingClient(null);
    setShowForm(false);
  };

  const openEditForm = (client: Client) => {
    setFormData({
      name: client.name,
      email: client.email || '',
      cf_api_token: client.cf_api_token || '',
      cf_zone_id: client.cf_zone_id || '',
      cf_zone_name: client.cf_zone_name || '',
      notes: client.notes || '',
    });
    setEditingClient(client);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingClient) {
        // Update existing client
        const response = await backendApi.updateClient(editingClient.id, formData);
        if (response.success && response.data) {
          setClients(clients.map(c => c.id === editingClient.id ? response.data! : c));
          addLog('Clients', `Updated client: ${formData.name}`, 'success');
          toast.success('Client Updated', formData.name);
          resetForm();
        }
      } else {
        // Create new client
        const response = await backendApi.createClient(formData);
        if (response.success && response.data) {
          setClients([...clients, response.data]);
          addLog('Clients', `Created client: ${formData.name}`, 'success');
          toast.success('Client Created', formData.name);
          resetForm();
        }
      }
    } catch (err: any) {
      setError(err.message);
      addLog('Clients', `Error saving client: ${err.message}`, 'error');
      toast.error('Save Failed', err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (client: Client) => {
    const approved = await confirm({
      title: `Delete client \"${client.name}\"?`,
      message: 'This action cannot be undone.',
      confirmText: 'Delete Client',
      cancelText: 'Keep Client',
      tone: 'danger',
    });
    if (!approved) return;

    setDeleting(client.id);
    try {
      const response = await backendApi.deleteClient(client.id);
      if (response.success) {
        setClients(clients.filter(c => c.id !== client.id));
        if (selectedClient?.id === client.id) {
          setSelectedClient(null);
        }
        addLog('Clients', `Deleted client: ${client.name}`, 'success');
        toast.success('Client Deleted', client.name);
      }
    } catch (err: any) {
      setError(err.message);
      addLog('Clients', `Error deleting client: ${err.message}`, 'error');
      toast.error('Delete Failed', err.message);
    }
    setDeleting(null);
  };

  const handleOpenAutoSetup = (client: Client) => {
    if (!hestiaConnected || !hestiaConfig.hostname) {
      toast.error('HestiaCP Required', 'Connect your HestiaCP server first in Settings');
      return;
    }
    if (!client.cf_zone_name) {
      toast.error('Missing Domain', 'Client must have a Zone Name (domain) set');
      return;
    }
    setAutoSetupClient(client);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl max-h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Clients</h3>
              <p className="text-xs text-gray-400">{clients.length} clients registered</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setEditingClient(null);
                setShowForm(true);
              }}
              className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              Add Client
            </button>
            <button
              onClick={fetchClients}
              disabled={loading}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : <RefreshCw size={14} />}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Add/Edit Client Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-700/50 bg-gray-900/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              {editingClient ? <Edit2 size={16} className="text-blue-400" /> : <UserPlus size={16} className="text-green-400" />}
              {editingClient ? `Edit Client: ${editingClient.name}` : 'Add New Client'}
            </h4>
            <button type="button" onClick={resetForm} className="text-gray-500 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Client Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe / Company Name" required className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="client@example.com" className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cloudflare API Token</label>
              <input type="password" value={formData.cf_api_token} onChange={e => setFormData({ ...formData, cf_api_token: e.target.value })} placeholder="Client's Cloudflare API Token" className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cloudflare Zone ID</label>
              <input type="text" value={formData.cf_zone_id} onChange={e => setFormData({ ...formData, cf_zone_id: e.target.value })} placeholder="Zone ID from Cloudflare Dashboard" className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Zone Name (Domain)</label>
              <input type="text" value={formData.cf_zone_name} onChange={e => setFormData({ ...formData, cf_zone_name: e.target.value })} placeholder="example.com" className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes" className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving || !formData.name} className={`${editingClient ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2`}>
              {saving ? <LoadingSpinner size="sm" /> : <Check size={16} />}
              {editingClient ? 'Update Client' : 'Create Client'}
            </button>
            <button type="button" onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      {clients.length > 0 && (
        <div className="px-3 pt-3 border-b border-gray-700/30  max-h-[500px]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">{filteredClients.length} of {clients.length} clients</p>
        </div>
      )}

      {/* Clients List */}
      <div className="p-3 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner size="lg" text="Loading clients..." />
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="space-y-1.5">
            {filteredClients.map(client => (
              <div
                key={client.id}
                className={`bg-gray-900/40 border rounded-lg p-3 transition-all cursor-pointer ${
                  selectedClient?.id === client.id
                    ? 'border-blue-500/50 bg-blue-900/10'
                    : 'border-gray-700/40 hover:border-blue-500/30'
                }`}
               
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 shrink-0 bg-orange-500/10 border border-orange-400/20 rounded-lg flex items-center justify-center">
                      <Cloud size={14} className="text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white text-sm font-medium truncate">{client.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                        {client.cf_zone_name && (
                          <span className="flex items-center gap-1 text-orange-400 truncate">
                            <Cloud size={8} />
                            {client.cf_zone_name}
                          </span>
                        )}
                        {hostIpUsage[client.id] === 'yes' && (
                          <span className="text-[6px] bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/20">
                            Using Hestia Host IP
                          </span>
                        )}
                        {hostIpUsage[client.id] === 'no' && (
                          <span className="text-[6px] bg-gray-700/40 text-gray-300 px-2 py-0.5 rounded-full border border-gray-600/30">
                            Not using Hestia Host IP
                          </span>
                        )}
                        {hostIpUsage[client.id] === 'unknown' && (
                          <span className="text-[11px] bg-red-500/10 text-red-300 px-2 py-0.5 rounded-full border border-red-400/20">
                            Unable to check DNS
                          </span>
                        )}
                        {hostIpUsage[client.id] === 'loading' && (
                          <span className="text-[11px] bg-gray-700/40 text-gray-400 px-2 py-0.5 rounded-full">
                            Checking DNS...
                          </span>
                        )}
                      </div>
                      {client.notes && (
                        <p className="text-[11px] text-gray-500 mt-1 truncate">{client.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {client.cf_api_token && client.cf_zone_id && (
                      <span className="text-[11px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full hidden sm:inline-flex">
                        CF Connected
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedClient(client)}
                      className="text-[8px] text-green-300 hover:text-green-200 px-2 py-1 rounded-md bg-green-500/10 hover:bg-green-500/15 transition-colors"
                      title="View client"
                    >
                      View Client
                    </button>
                    {hestiaConnected && client.cf_zone_name && client.cf_api_token && client.cf_zone_id && (
                      <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAutoSetup(client);
                      }}
                        disabled={autoSetupClient?.id === client.id}
                        className="text-[8px] text-orange-300 hover:text-orange-200 px-2 py-1 rounded-md bg-orange-500/10 hover:bg-orange-500/15 transition-colors disabled:opacity-50"
                        title="Auto setup: create mail domain + push DNS + install SSL"
                      >
                        {autoSetupClient?.id === client.id ? (
                          <span className="flex items-center gap-1"><LoadingSpinner size="sm" />Setting up...</span>
                        ) : (
                          <span className="flex items-center gap-1"><Zap size={11} />Auto Setup</span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(client);
                      }}
                      className="text-[8px] text-blue-300 hover:text-blue-200 px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/15 transition-colors"
                      title="Edit client"
                    >
                      Edit Client
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(client);
                      }}
                      disabled={deleting === client.id}
                      className="text-[8px] text-red-300 hover:text-red-200 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                      title="Delete client"
                    >
                      {deleting === client.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : clients.length > 0 ? (
          <div className="text-center py-6">
            <Users size={36} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm mb-1">No matching clients</p>
            <p className="text-[11px] text-gray-500">Try a different search term</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <Users size={36} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm mb-1">No clients yet</p>
            <p className="text-[11px] text-gray-500">Click "Add Client" to add your first client</p>
          </div>
        )}
      </div>

      {/* Auto Setup Modal */}
      {autoSetupClient && (
        <AutoSetupModal
          client={autoSetupClient}
          hestiaConfig={hestiaConfig}
          hestiaConnected={hestiaConnected}
          addLog={addLog}
          toast={toast}
          onClose={() => setAutoSetupClient(null)}
          onComplete={() => fetchClients()}
        />
      )}
    </div>
  );
};
