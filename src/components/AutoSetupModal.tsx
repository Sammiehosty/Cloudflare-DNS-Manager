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
    <div className="fixed inset-0 z-[10000] flex items-stretch md:items-center justify-stretch md:justify-center max-h-500px] overflow-y-auto">
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
       <div className="p-5 space-y-3 max-h-[260px] overflow-y-auto">
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
        <div className="p-4 border-t border-gray-700/50 flex gap-3">
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
};
