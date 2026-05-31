import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  Key,
  Shield,
  ShieldOff,
  User,
  Globe,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Search,
  Cloud,
  Server,
  Zap,
} from 'lucide-react';
import { HestiaConfig, HestiaMailDomain, Client, HestiaDnsRecord } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import type { ToastActions } from './Toast';
import type { ConfirmFn } from './ConfirmDialog';
import * as hestiaApi from '../services/hestiaApi';
import * as cfApi from '../services/cloudflareApi';
import type { MailAccount } from '../services/hestiaApi';

interface Props {
  hestiaConfig: HestiaConfig;
  hestiaConnected: boolean;
  addLog: (action: string, details: string, status: 'success' | 'error' | 'info') => void;
  toast: ToastActions;
  clients: Client[];
  confirm: ConfirmFn;
}

export const MailManager: React.FC<Props> = ({
  hestiaConfig,
  hestiaConnected,
  addLog,
  toast,
  clients,
  confirm,
}) => {
  const user = hestiaConfig.user || 'admin';

  // domains
  const [domains, setDomains] = useState<HestiaMailDomain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedDomainInfo, setSelectedDomainInfo] = useState<HestiaMailDomain | null>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainSearch, setDomainSearch] = useState('');

  // add/delete domain
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState('');
  const [suspendingDomain, setSuspendingDomain] = useState('');
  const [unsuspendingDomain, setUnsuspendingDomain] = useState('');

  // accounts
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState('');

  // dns records in mail-domain popup
  const [dnsRecords, setDnsRecords] = useState<HestiaDnsRecord[]>([]);
  const [loadingDns, setLoadingDns] = useState(false);
  const [dnsDebug, setDnsDebug] = useState<string[]>([]);
  const [selectedDnsIds, setSelectedDnsIds] = useState<Set<string>>(new Set());
  const [dnsSearch, setDnsSearch] = useState('');
  const [pushClientId, setPushClientId] = useState<number | ''>('');
  const [pushingDns, setPushingDns] = useState(false);

  // password change
  const [changingPwFor, setChangingPwFor] = useState('');
  const [changePw, setChangePw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // ssl modal flow
  const [sslAction, setSslAction] = useState('');
  const [showSslModal, setShowSslModal] = useState(false);
  const [sslDomain, setSslDomain] = useState('');
  const [sslClientId, setSslClientId] = useState<number | ''>('');
  const [sslClientSearch, setSslClientSearch] = useState('');
  const [sslUpdateDnsFirst, setSslUpdateDnsFirst] = useState(true);
  const [serverIp, setServerIp] = useState('');
  const [sslStep, setSslStep] = useState<'idle' | 'dns' | 'ssl'>('idle');

  // messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredDomains = useMemo(() => {
    if (!domainSearch.trim()) return domains;
    const q = domainSearch.toLowerCase();
    return domains.filter(d => d.domain.toLowerCase().includes(q));
  }, [domains, domainSearch]);

  const eligibleClients = useMemo(
    () => clients.filter(c => c.cf_api_token && c.cf_zone_id && c.cf_zone_name),
    [clients]
  );

  const filteredSslClients = useMemo(() => {
    if (!sslClientSearch.trim()) return eligibleClients;
    const q = sslClientSearch.toLowerCase();
    return eligibleClients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.cf_zone_name || '').toLowerCase().includes(q)
    );
  }, [eligibleClients, sslClientSearch]);

  const filteredDnsRecords = useMemo(() => {
    if (!dnsSearch.trim()) return dnsRecords;
    const q = dnsSearch.toLowerCase();
    return dnsRecords.filter(r =>
      r.record.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.value.toLowerCase().includes(q)
    );
  }, [dnsRecords, dnsSearch]);

  useEffect(() => {
    if (hestiaConnected) void fetchDomains();
  }, [hestiaConnected]);

  const clearMsg = () => {
    setError('');
    setSuccess('');
  };

  const fetchDomains = async () => {
    setLoadingDomains(true);
    clearMsg();
    try {
      const data = await hestiaApi.listMailDomains(hestiaConfig, user);
      setDomains(data);
      if (selectedDomain) {
        setSelectedDomainInfo(data.find(d => d.domain === selectedDomain) || null);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoadingDomains(false);
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    clearMsg();
    try {
      await hestiaApi.addMailDomain(hestiaConfig, user, newDomain.trim());
      setSuccess(`Mail domain ${newDomain} added`);
      toast.success('Domain Added', newDomain);
      addLog('Mail', `Added domain: ${newDomain}`, 'success');
      setNewDomain('');
      setShowAddDomain(false);
      await fetchDomains();
    } catch (e: any) {
      setError(e.message);
      toast.error('Add Domain Failed', e.message);
    }
    setAddingDomain(false);
  };

  const handleDeleteDomain = async (domain: string) => {
    const approved = await confirm({
      title: `Delete \"${domain}\"?`,
      message: 'This will remove the mail domain and all its email accounts. This cannot be undone.',
      confirmText: 'Delete Domain',
      cancelText: 'Keep Domain',
      tone: 'danger',
    });
    if (!approved) return;
    setDeletingDomain(domain);
    clearMsg();
    try {
      await hestiaApi.deleteMailDomain(hestiaConfig, user, domain);
      setSuccess(`Domain ${domain} deleted`);
      toast.success('Domain Deleted', domain);
      addLog('Mail', `Deleted domain: ${domain}`, 'success');
      if (selectedDomain === domain) {
        setSelectedDomain('');
        setSelectedDomainInfo(null);
        setAccounts([]);
      }
      await fetchDomains();
    } catch (e: any) {
      setError(e.message);
      toast.error('Delete Failed', e.message);
    }
    setDeletingDomain('');
  };

  const fetchDomainDns = async (domain: string) => {
    setLoadingDns(true);
    setDnsRecords([]);
    setDnsDebug([]);
    setSelectedDnsIds(new Set());
    try {
      const result = await hestiaApi.listAllMailDnsRecords(hestiaConfig, user, domain);
      const records = [...(result.records || [])];
      const debug = [...(result.debug || [])];

      const hostTarget = (hestiaConfig.hostIp || hestiaConfig.hostname || '').trim();
      if (hostTarget) {
        const hasMailA = records.some(r => r.type === 'A' && r.record === 'mail' && r.value === hostTarget);
        const hasWebmailA = records.some(r => r.type === 'A' && r.record === 'webmail' && r.value === hostTarget);

        if (!hasMailA) {
          records.push({
            id: 'synthetic-mail-a',
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
            id: 'synthetic-webmail-a',
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

      setDnsRecords(records);
      setDnsDebug(debug);
    } catch {
      setDnsRecords([]);
      setDnsDebug([]);
    }
    setLoadingDns(false);
  };

  const handleSelectDomain = async (md: HestiaMailDomain) => {
    setSelectedDomain(md.domain);
    setSelectedDomainInfo(md);
    setShowDomainModal(true);
    clearMsg();
    setShowAddAccount(false);
    setChangingPwFor('');
    const matchedClient = eligibleClients.find(c => (c.cf_zone_name || '').toLowerCase() === md.domain.toLowerCase());
    setPushClientId(matchedClient ? matchedClient.id : '');
    await Promise.all([fetchAccounts(md.domain), fetchDomainDns(md.domain)]);
  };

  const handleSuspendDomain = async (domain: string) => {
    const approved = await confirm({
      title: `Suspend \"${domain}\"?`,
      message: 'Mail services for this domain will be suspended until you unsuspend it.',
      confirmText: 'Suspend Domain',
      cancelText: 'Cancel',
      tone: 'warning',
    });
    if (!approved) return;
    setSuspendingDomain(domain);
    clearMsg();
    try {
      await hestiaApi.suspendMailDomain(hestiaConfig, user, domain);
      setSuccess(`Domain ${domain} suspended`);
      toast.warning('Domain Suspended', domain);
      addLog('Mail', `Suspended domain: ${domain}`, 'success');
      await fetchDomains();
    } catch (e: any) {
      setError(e.message);
      toast.error('Suspend Failed', e.message);
    }
    setSuspendingDomain('');
  };

  const handleUnsuspendDomain = async (domain: string) => {
    const approved = await confirm({
      title: `Unsuspend \"${domain}\"?`,
      message: 'Mail services for this domain will be restored.',
      confirmText: 'Unsuspend Domain',
      cancelText: 'Cancel',
      tone: 'info',
    });
    if (!approved) return;
    setUnsuspendingDomain(domain);
    clearMsg();
    try {
      await hestiaApi.unsuspendMailDomain(hestiaConfig, user, domain);
      setSuccess(`Domain ${domain} unsuspended`);
      toast.success('Domain Unsuspended', domain);
      addLog('Mail', `Unsuspended domain: ${domain}`, 'success');
      await fetchDomains();
    } catch (e: any) {
      setError(e.message);
      toast.error('Unsuspend Failed', e.message);
    }
    setUnsuspendingDomain('');
  };

  const openSslModal = (domain: string) => {
    setSslDomain(domain);
    const matchedClient = eligibleClients.find(
      c => (c.cf_zone_name || '').trim().toLowerCase() === domain.trim().toLowerCase()
    );
    setSslClientId(matchedClient ? matchedClient.id : '');
    setSslClientSearch(matchedClient ? '' : domain);
    setSslUpdateDnsFirst(true);
    // auto-fill from Hestia host IP first, then fallback to hostname
    setServerIp(hestiaConfig.hostIp || hestiaConfig.hostname || '');
    setSslStep('idle');
    clearMsg();
    setShowSslModal(true);
  };

  const handleInstallSsl = async () => {
    if (!sslDomain) return;
    if (sslUpdateDnsFirst && (!sslClientId || !serverIp.trim())) {
      toast.error('Missing Data', 'Select a client and confirm the Hestia host IP');
      return;
    }

    setSslAction(sslDomain);
    clearMsg();

    try {
      if (sslUpdateDnsFirst) {
        const client = eligibleClients.find(c => String(c.id) === String(sslClientId));
        if (!client) throw new Error('Selected user not found');

        setSslStep('dns');
        toast.info('Updating DNS', `Updating mail/webmail for ${client.cf_zone_name}`);

        const update = await cfApi.bulkUpdateIp(serverIp.trim(), ['mail', 'webmail'], [
          {
            api_token: client.cf_api_token,
            zone_id: client.cf_zone_id,
            zone_name: client.cf_zone_name || sslDomain,
          },
        ]);

        const failed = update.results.find(r => r.status === 'error' || r.status === 'partial');
        if (failed) {
          throw new Error(failed.message || 'Failed to update DNS records');
        }

        addLog('SSL', `Updated mail/webmail DNS for ${client.cf_zone_name} to ${serverIp}`, 'success');
        toast.success('DNS Updated', `mail/webmail → ${serverIp}`);
      }

      setSslStep('ssl');
      const msg = await hestiaApi.addMailSsl(hestiaConfig, user, sslDomain);
      setSuccess(msg);
      toast.success('SSL Installed', `Let’s Encrypt active for mail.${sslDomain}`);
      addLog('SSL', `Installed SSL: mail.${sslDomain}`, 'success');
      setShowSslModal(false);
      await fetchDomains();
    } catch (e: any) {
      setError(e.message);
      toast.error('SSL Failed', e.message);
      addLog('SSL', `Error: ${e.message}`, 'error');
    }

    setSslAction('');
    setSslStep('idle');
  };

  const handleRemoveSsl = async (domain: string) => {
    const approved = await confirm({
      title: `Remove SSL from mail.${domain}?`,
      message: 'The current mail SSL certificate will be removed.',
      confirmText: 'Remove SSL',
      cancelText: 'Keep SSL',
      tone: 'warning',
    });
    if (!approved) return;
    setSslAction(domain);
    clearMsg();
    try {
      const msg = await hestiaApi.deleteMailSsl(hestiaConfig, user, domain);
      setSuccess(msg);
      toast.warning('SSL Removed', `Certificate removed from mail.${domain}`);
      addLog('SSL', `Removed SSL: mail.${domain}`, 'success');
      await fetchDomains();
    } catch (e: any) {
      setError(e.message);
      toast.error('SSL Error', e.message);
      addLog('SSL', `Error: ${e.message}`, 'error');
    }
    setSslAction('');
  };

  const handleReinstallSsl = async (domain: string) => {
    const approved = await confirm({
      title: `Reinstall SSL for mail.${domain}?`,
      message: 'The existing SSL certificate will be reissued with Let\'s Encrypt.',
      confirmText: 'Reinstall SSL',
      cancelText: 'Cancel',
      tone: 'info',
    });
    if (!approved) return;
    setSslAction(domain);
    clearMsg();
    try {
      const msg = await hestiaApi.reinstallMailSsl(hestiaConfig, user, domain);
      setSuccess(msg);
      toast.success('SSL Reinstalled', `mail.${domain}`);
      addLog('SSL', `Reinstalled SSL: mail.${domain}`, 'success');
      await fetchDomains();
    } catch (e: any) {
      setError(e.message);
      toast.error('Reinstall Failed', e.message);
      addLog('SSL', `Reinstall error: ${e.message}`, 'error');
    }
    setSslAction('');
  };

  const toggleDnsRecord = (id: string) => {
    const next = new Set(selectedDnsIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedDnsIds(next);
  };

  const toggleAllDns = () => {
    if (selectedDnsIds.size === dnsRecords.length) {
      setSelectedDnsIds(new Set());
    } else {
      setSelectedDnsIds(new Set(dnsRecords.map(r => r.id)));
    }
  };

  const handlePushDnsToClient = async () => {
    if (!selectedDomain || !pushClientId) {
      toast.error('Missing Selection', 'Select a user and at least one DNS record');
      return;
    }
    const targetClient = eligibleClients.find(c => String(c.id) === String(pushClientId));
    if (!targetClient) {
      toast.error('User Not Found', 'Selected user could not be found');
      return;
    }
    const recordsToPush = dnsRecords.filter(r => selectedDnsIds.has(r.id));
    if (recordsToPush.length === 0) {
      toast.error('No Records Selected', 'Select one or more DNS records first');
      return;
    }

    setPushingDns(true);
    let successCount = 0;
    let failCount = 0;
    const cfConfig = { apiToken: targetClient.cf_api_token, zoneId: targetClient.cf_zone_id };

    for (const record of recordsToPush) {
      let fullName = record.record;
      if (record.record === '@' || record.record === '') fullName = selectedDomain;
      else if (!record.record.endsWith(selectedDomain)) fullName = `${record.record}.${selectedDomain}`;

      const isMailRecord = record.record === 'mail' || record.record === 'webmail' || 
                           fullName.startsWith('mail.') || fullName.startsWith('webmail.');

      try {
        const existing = await cfApi.getAllDnsRecords(cfConfig).then(recs =>
          recs.find(cf => cf.name === fullName && cf.type === record.type)
        );
        
        const payload = {
          type: record.type,
          name: fullName,
          content: record.value,
          ttl: isMailRecord ? 1 : (parseInt(record.ttl) || 1),
          proxied: isMailRecord ? false : false, // Always DNS only for these as requested
          priority: record.type === 'MX' ? parseInt(record.priority) || 10 : undefined,
        };

        if (existing) {
          await cfApi.updateDnsRecord(cfConfig, existing.id, payload);
        } else {
          await cfApi.createDnsRecord(cfConfig, payload);
        }
        successCount++;
      } catch {
        failCount++;
      }
    }

    setPushingDns(false);
    if (failCount === 0) {
      toast.success('DNS Pushed', `${successCount} record(s) pushed to ${targetClient.name}`);
      addLog('DNS Push', `Pushed ${successCount} DNS records for ${selectedDomain} to ${targetClient.name}`, 'success');
    } else {
      toast.warning('Partial Push', `${successCount} succeeded, ${failCount} failed`);
      addLog('DNS Push', `Partial push for ${selectedDomain}: ${successCount} ok, ${failCount} failed`, 'error');
    }
  };

  const fetchAccounts = async (domain: string) => {
    setLoadingAccounts(true);
    try {
      setAccounts(await hestiaApi.listMailAccounts(hestiaConfig, user, domain));
    } catch {
      setAccounts([]);
    }
    setLoadingAccounts(false);
  };

  const handleAddAccount = async () => {
    if (!newAccount.trim() || !newPassword) return;
    setAddingAccount(true);
    clearMsg();
    try {
      await hestiaApi.addMailAccount(hestiaConfig, user, selectedDomain, newAccount.trim(), newPassword);
      setSuccess(`${newAccount}@${selectedDomain} created`);
      toast.success('Account Created', `${newAccount}@${selectedDomain}`);
      addLog('Mail', `Created: ${newAccount}@${selectedDomain}`, 'success');
      setNewAccount('');
      setNewPassword('');
      setShowAddAccount(false);
      await fetchAccounts(selectedDomain);
    } catch (e: any) {
      setError(e.message);
      toast.error('Create Failed', e.message);
    }
    setAddingAccount(false);
  };

  const handleDeleteAccount = async (account: string) => {
    const approved = await confirm({
      title: `Delete \"${account}@${selectedDomain}\"?`,
      message: 'This email account will be permanently removed.',
      confirmText: 'Delete Account',
      cancelText: 'Keep Account',
      tone: 'danger',
    });
    if (!approved) return;
    setDeletingAccount(account);
    clearMsg();
    try {
      await hestiaApi.deleteMailAccount(hestiaConfig, user, selectedDomain, account);
      setSuccess(`${account}@${selectedDomain} deleted`);
      toast.success('Account Deleted', `${account}@${selectedDomain}`);
      addLog('Mail', `Deleted: ${account}@${selectedDomain}`, 'success');
      await fetchAccounts(selectedDomain);
    } catch (e: any) {
      setError(e.message);
      toast.error('Delete Failed', e.message);
    }
    setDeletingAccount('');
  };

  const handleChangePassword = async () => {
    if (!changePw) return;
    setChangingPw(true);
    clearMsg();
    try {
      await hestiaApi.changeMailPassword(hestiaConfig, user, selectedDomain, changingPwFor, changePw);
      setSuccess(`Password changed for ${changingPwFor}@${selectedDomain}`);
      toast.success('Password Changed', `${changingPwFor}@${selectedDomain}`);
      addLog('Mail', `Changed password: ${changingPwFor}@${selectedDomain}`, 'success');
      setChangingPwFor('');
      setChangePw('');
    } catch (e: any) {
      setError(e.message);
      toast.error('Password Error', e.message);
    }
    setChangingPw(false);
  };

  if (!hestiaConnected) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
        <Mail size={48} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-400">HestiaCP Not Connected</h3>
        <p className="text-sm text-gray-500 mt-1">Go to Settings to connect your HestiaCP server</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-xl flex items-center gap-2">
          <Check size={16} className="text-green-400 shrink-0" />
          <p className="text-green-400 text-sm flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400/50 hover:text-green-400"><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400/50 hover:text-red-400"><X size={14} /></button>
        </div>
      )}

      {showDomainModal && selectedDomainInfo && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDomainModal(false)} />
          <div className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedDomain}</h3>
                <p className="text-xs text-gray-400">Mail domain management</p>
              </div>
              <button onClick={() => setShowDomainModal(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className={`border rounded-xl p-4 mb-4 ${selectedDomainInfo.ssl === 'yes' || selectedDomainInfo.letsencrypt === 'yes' ? 'bg-green-900/10 border-green-700/30' : 'bg-amber-900/10 border-amber-700/30'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {selectedDomainInfo.ssl === 'yes' || selectedDomainInfo.letsencrypt === 'yes' ? <ShieldCheck size={24} className="text-green-400" /> : <ShieldOff size={24} className="text-amber-400" />}
                  <div>
                    <h4 className="text-white font-semibold">SSL: mail.{selectedDomain}</h4>
                    <p className="text-xs mt-0.5">
                      {selectedDomainInfo.ssl === 'yes' || selectedDomainInfo.letsencrypt === 'yes'
                        ? <span className="text-green-400">Let's Encrypt SSL is active</span>
                        : <span className="text-amber-400">No SSL certificate installed</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedDomainInfo.suspended === 'yes' ? (
                    <button onClick={() => void handleUnsuspendDomain(selectedDomain)} disabled={unsuspendingDomain === selectedDomain} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                      {unsuspendingDomain === selectedDomain ? <LoadingSpinner size="sm" /> : 'Unsuspend'}
                    </button>
                  ) : (
                    <button onClick={() => void handleSuspendDomain(selectedDomain)} disabled={suspendingDomain === selectedDomain} className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                      {suspendingDomain === selectedDomain ? <LoadingSpinner size="sm" /> : 'Suspend'}
                    </button>
                  )}
                  {selectedDomainInfo.ssl === 'yes' || selectedDomainInfo.letsencrypt === 'yes' ? (
                    <>
                      <button onClick={() => void handleReinstallSsl(selectedDomain)} disabled={sslAction === selectedDomain} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                        {sslAction === selectedDomain ? <LoadingSpinner size="sm" text="Reinstalling..." /> : <><Shield size={14} />Reinstall SSL</>}
                      </button>
                      <button onClick={() => void handleRemoveSsl(selectedDomain)} disabled={sslAction === selectedDomain} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                        {sslAction === selectedDomain ? <LoadingSpinner size="sm" /> : <><ShieldOff size={14} />Remove SSL</>}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => openSslModal(selectedDomain)} disabled={sslAction === selectedDomain} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                      {sslAction === selectedDomain ? <LoadingSpinner size="sm" text="Installing..." /> : <><Shield size={14} />Install SSL</>}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden mb-4">
              <div className="p-4 border-b border-gray-700/50 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Server size={18} className="text-purple-400" />DNS Records: {selectedDomain}
                      {loadingDns && <LoadingSpinner size="sm" />}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Includes synthetic <code className="text-purple-300">mail</code> and <code className="text-purple-300">webmail</code> A records using the Hestia Host target when available.
                    </p>
                  </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <select
                    value={pushClientId}
                    onChange={e => setPushClientId(e.target.value ? Number(e.target.value) : '')}
                    className="bg-gray-900/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="">Select user</option>
                    {eligibleClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.cf_zone_name})</option>
                    ))}
                  </select>
                  <button onClick={toggleAllDns} className="text-xs text-purple-400 hover:text-purple-300 px-2 py-1 rounded border border-purple-500/20">
                    {selectedDnsIds.size === dnsRecords.length && dnsRecords.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={handlePushDnsToClient}
                    disabled={pushingDns || !pushClientId || selectedDnsIds.size === 0}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    {pushingDns ? <LoadingSpinner size="sm" /> : <Zap size={12} />}Push to User
                  </button>
                </div>
              </div>

              {dnsRecords.length > 0 && (
                <div className="px-4 pt-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={dnsSearch}
                      onChange={e => setDnsSearch(e.target.value)}
                      placeholder="Filter DNS records..."
                      className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-8 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    {dnsSearch && <button onClick={() => setDnsSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{filteredDnsRecords.length} of {dnsRecords.length} records selected: {selectedDnsIds.size}</p>
                </div>
              )}

              <div className="p-4">
                {dnsDebug.length > 0 && !loadingDns && (
                  <div className="mb-3 p-2 bg-gray-900/50 border border-gray-700/30 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">DNS Fetch Log:</p>
                    {dnsDebug.map((d, i) => <p key={i} className="text-xs text-gray-400 font-mono">• {d}</p>)}
                  </div>
                )}
                {loadingDns ? (
                  <div className="flex justify-center py-6"><LoadingSpinner size="md" text="Loading DNS..." /></div>
                ) : filteredDnsRecords.length > 0 ? (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {filteredDnsRecords.map((r, i) => (
                      <label key={r.id || i} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-all ${selectedDnsIds.has(r.id) ? 'bg-purple-600/15 border-purple-500/30' : 'bg-gray-900/40 border-gray-700/40 hover:border-purple-500/20'}`}>
                        <input
                          type="checkbox"
                          checked={selectedDnsIds.has(r.id)}
                          onChange={() => toggleDnsRecord(r.id)}
                          className="mt-0.5 rounded bg-gray-800 border-gray-600 text-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-700 text-white">{r.type}</span>
                            <span className="text-white text-sm font-mono">{r.record || '@'}</span>
                            {r.priority && <span className="text-xs text-gray-500">pri:{r.priority}</span>}
                          </div>
                          <p className="text-gray-400 text-xs font-mono mt-1 break-all">{r.value}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-6">No DNS records for {selectedDomain}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Mail size={18} className="text-orange-400" />Accounts: {selectedDomain}
                  {loadingAccounts && <LoadingSpinner size="sm" />}
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddAccount(!showAddAccount); setChangingPwFor(''); clearMsg(); }} className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5">
                    {showAddAccount ? <X size={14} /> : <Plus size={14} />}{showAddAccount ? 'Cancel' : 'Add'}
                  </button>
                  <button onClick={() => fetchAccounts(selectedDomain)} disabled={loadingAccounts} className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {showAddAccount && selectedDomain && (
                <div className="p-4 border-b border-gray-700/50 bg-gray-900/30">
                  <p className="text-xs text-gray-400 mb-2">New account for <strong className="text-white">{selectedDomain}</strong></p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="relative">
                      <input type="text" value={newAccount} onChange={e => setNewAccount(e.target.value)} placeholder="username" onKeyDown={e => e.key === 'Enter' && handleAddAccount()} className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 pr-24" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">@{selectedDomain}</span>
                    </div>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleAddAccount()} className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50" />
                  </div>
                  <button onClick={handleAddAccount} disabled={addingAccount || !newAccount.trim() || !newPassword} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
                    {addingAccount ? <LoadingSpinner size="sm" /> : <Plus size={14} />}Create Account
                  </button>
                </div>
              )}

              <div className="p-4">
                {loadingAccounts ? (
                  <div className="flex justify-center py-6"><LoadingSpinner size="md" text="Loading accounts..." /></div>
                ) : accounts.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {accounts.map(acc => (
                      <div key={acc.account} className="bg-gray-900/40 border border-gray-700/40 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{acc.email}</p>
                            <div className="flex gap-3 mt-1">
                              <span className="text-xs text-gray-400">Quota: {acc.quota === '0' || acc.quota === 'unlimited' ? '∞' : acc.quota + 'MB'}</span>
                              <span className="text-xs text-gray-400">Used: {acc.used}MB</span>
                              {acc.suspended === 'yes' && <span className="text-xs text-red-400">Suspended</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => { setChangingPwFor(changingPwFor === acc.account ? '' : acc.account); setChangePw(''); setShowPw(false); clearMsg(); }} className={`p-1.5 rounded transition-colors ${changingPwFor === acc.account ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'}`}>
                              <Key size={14} />
                            </button>
                            <button onClick={() => handleDeleteAccount(acc.account)} disabled={deletingAccount === acc.account} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded disabled:opacity-50">
                              {deletingAccount === acc.account ? <LoadingSpinner size="sm" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>

                        {changingPwFor === acc.account && (
                          <div className="mt-3 pt-3 border-t border-gray-700/50 flex gap-2">
                            <div className="relative flex-1">
                              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                              <input type={showPw ? 'text' : 'password'} value={changePw} onChange={e => setChangePw(e.target.value)} placeholder="New password" onKeyDown={e => e.key === 'Enter' && handleChangePassword()} className="w-full bg-gray-800 border border-gray-600/50 rounded-lg pl-9 pr-8 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
                              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                            </div>
                            <button onClick={handleChangePassword} disabled={changingPw || !changePw} className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-black px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
                              {changingPw ? <LoadingSpinner size="sm" /> : <Check size={14} />}Set
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-6">No email accounts for {selectedDomain}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSslModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => sslStep === 'idle' && setShowSslModal(false)} />
          <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Shield size={22} className="text-blue-400" />Install Let's Encrypt SSL
            </h3>
            <p className="text-gray-400 text-sm mb-5">For <strong className="text-white">mail.{sslDomain}</strong></p>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 p-4 rounded-lg border bg-gray-800/50 border-gray-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sslUpdateDnsFirst}
                  onChange={e => setSslUpdateDnsFirst(e.target.checked)}
                  className="mt-0.5 rounded bg-gray-800 border-gray-600 text-blue-500"
                />
                <div>
                  <p className="text-white font-medium text-sm">Update selected user's DNS first</p>
                  <p className="text-gray-500 text-xs mt-0.5">Update <code className="text-blue-300">mail</code> and <code className="text-blue-300">webmail</code> A records in the selected user's Cloudflare zone before SSL installation.</p>
                </div>
              </label>

              {sslUpdateDnsFirst && (
                <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Cloud size={12} />Select User</label>
                    {sslClientId && (
                      <p className="text-[11px] text-emerald-400 mb-1">Auto-selected matching Cloudflare user for this mail domain.</p>
                    )}
                    {!sslClientId && (
                      <div className="mb-2 relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          value={sslClientSearch}
                          onChange={e => setSslClientSearch(e.target.value)}
                          placeholder="Search Cloudflare user..."
                          className="w-full bg-gray-800 border border-gray-600/50 rounded-lg pl-8 pr-8 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        {sslClientSearch && (
                          <button onClick={() => setSslClientSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}
                    <select
                      value={sslClientId}
                      onChange={e => setSslClientId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">-- Select a user --</option>
                      {filteredSslClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.cf_zone_name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Server size={12} />Hestia Host IP</label>
                    <input
                      type="text"
                      value={serverIp}
                      onChange={e => setServerIp(e.target.value)}
                      placeholder="123.45.67.89"
                      className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-filled from Hestia Host IP. Adjust if needed.</p>
                  </div>
                </div>
              )}
            </div>

            {sslStep !== 'idle' && (
              <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  {sslStep === 'dns' && <><LoadingSpinner size="sm" /><span className="text-blue-400">Updating mail/webmail DNS records...</span></>}
                  {sslStep === 'ssl' && <><LoadingSpinner size="sm" /><span className="text-purple-400">Requesting Let's Encrypt certificate...</span></>}
                </div>
              </div>
            )}
   <p className="text-xs text-gray-500 mt-1">If you got any error during installation. It may be that the mail/webmail A records was not pushed to cloudflare. Goto user account and push mail/webmail A record from there before installing SSL</p>
            <div className="flex gap-3">
              <button
                onClick={handleInstallSsl}
                disabled={sslStep !== 'idle' || (sslUpdateDnsFirst && (!sslClientId || !serverIp.trim()))}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                {sslStep !== 'idle' ? <LoadingSpinner size="sm" /> : <Zap size={16} />}
                Update & Install SSL
              </button>
              <button
                onClick={() => setShowSslModal(false)}
                disabled={sslStep !== 'idle'}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2.5 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Globe size={18} className="text-purple-400" />Mail Domains
              {loadingDomains && <LoadingSpinner size="sm" />}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => { setShowAddDomain(!showAddDomain); clearMsg(); }} className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5">
                {showAddDomain ? <X size={14} /> : <Plus size={14} />}{showAddDomain ? 'Cancel' : 'Add'}
              </button>
              <button onClick={fetchDomains} disabled={loadingDomains} className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {showAddDomain && (
            <div className="p-4 border-b border-gray-700/50 bg-gray-900/30">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                  className="flex-1 bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
                <button onClick={handleAddDomain} disabled={addingDomain || !newDomain.trim()} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
                  {addingDomain ? <LoadingSpinner size="sm" /> : <Plus size={14} />}Add
                </button>
              </div>
            </div>
          )}

          {domains.length > 0 && (
            <div className="px-4 pt-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={domainSearch}
                  onChange={e => setDomainSearch(e.target.value)}
                  placeholder="Search mail domains..."
                  className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-8 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                {domainSearch && <button onClick={() => setDomainSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
              </div>
              <p className="text-xs text-gray-500 mt-1">{filteredDomains.length} of {domains.length} domains</p>
            </div>
          )}

          <div className="p-4 pt-2">
            {loadingDomains ? (
              <div className="flex justify-center py-6"><LoadingSpinner size="md" text="Loading..." /></div>
            ) : filteredDomains.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredDomains.map(md => (
                  <div
                    key={md.domain}
                    className={`p-3 rounded-lg transition-all cursor-pointer border ${
                      selectedDomain === md.domain ? 'bg-purple-600/20 border-purple-500/30' : 'bg-gray-900/40 border-gray-700/40 hover:border-purple-500/20'
                    }`}
                    onClick={() => handleSelectDomain(md)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium">{md.domain}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400">{md.accounts} accounts</span>
                          {md.dkim === 'yes' && <span className="text-xs text-green-400">DKIM ✓</span>}
                          {md.antispam === 'yes' && <span className="text-xs text-amber-400">AntiSpam</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2 flex-wrap justify-end">
                        {md.suspended === 'yes' ? (
                          <button
                            onClick={e => { e.stopPropagation(); void handleUnsuspendDomain(md.domain); }}
                            disabled={unsuspendingDomain === md.domain}
                            className="text-xs bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full hover:bg-emerald-500/25 disabled:opacity-50 transition-colors"
                          >
                            {unsuspendingDomain === md.domain ? '...' : 'Unsuspend'}
                          </button>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); void handleSuspendDomain(md.domain); }}
                            disabled={suspendingDomain === md.domain}
                            className="text-xs bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
                          >
                            {suspendingDomain === md.domain ? '...' : 'Suspend'}
                          </button>
                        )}
                        {md.ssl === 'yes' || md.letsencrypt === 'yes' ? (
                          <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={12} />SSL
                          </span>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openSslModal(md.domain);
                            }}
                            disabled={sslAction === md.domain}
                            className="flex items-center gap-1 text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full hover:bg-blue-500/25 disabled:opacity-50 transition-colors"
                          >
                            {sslAction === md.domain ? <LoadingSpinner size="sm" /> : <Shield size={12} />}Install SSL
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); void handleDeleteDomain(md.domain); }} disabled={deletingDomain === md.domain} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded disabled:opacity-50">
                          {deletingDomain === md.domain ? <LoadingSpinner size="sm" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : domains.length > 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No domains match "{domainSearch}"</p>
            ) : (
              <p className="text-gray-500 text-sm text-center py-6">No mail domains. Click Add.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {selectedDomainInfo && (
            <div className={`border rounded-xl p-4 ${selectedDomainInfo.ssl === 'yes' || selectedDomainInfo.letsencrypt === 'yes' ? 'bg-green-900/10 border-green-700/30' : 'bg-amber-900/10 border-amber-700/30'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {selectedDomainInfo.ssl === 'yes' || selectedDomainInfo.letsencrypt === 'yes' ? <ShieldCheck size={24} className="text-green-400" /> : <ShieldOff size={24} className="text-amber-400" />}
                  <div>
                    <h4 className="text-white font-semibold">SSL: mail.{selectedDomain}</h4>
                    <p className="text-xs mt-0.5">
                      {selectedDomainInfo.ssl === 'yes' || selectedDomainInfo.letsencrypt === 'yes'
                        ? <span className="text-green-400">Let's Encrypt SSL is active</span>
                        : <span className="text-amber-400">No SSL certificate installed</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedDomainInfo.suspended === 'yes' ? (
                    <button onClick={() => void handleUnsuspendDomain(selectedDomain)} disabled={unsuspendingDomain === selectedDomain} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                      {unsuspendingDomain === selectedDomain ? <LoadingSpinner size="sm" /> : 'Unsuspend'}
                    </button>
                  ) : (
                    <button onClick={() => void handleSuspendDomain(selectedDomain)} disabled={suspendingDomain === selectedDomain} className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                      {suspendingDomain === selectedDomain ? <LoadingSpinner size="sm" /> : 'Suspend'}
                    </button>
                  )}
                  {selectedDomainInfo.ssl === 'yes' || selectedDomainInfo.letsencrypt === 'yes' ? (
                    <>
                      <button onClick={() => void handleReinstallSsl(selectedDomain)} disabled={sslAction === selectedDomain} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                        {sslAction === selectedDomain ? <LoadingSpinner size="sm" text="Reinstalling..." /> : <><Shield size={14} />Reinstall SSL</>}
                      </button>
                      <button onClick={() => void handleRemoveSsl(selectedDomain)} disabled={sslAction === selectedDomain} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                        {sslAction === selectedDomain ? <LoadingSpinner size="sm" /> : <><ShieldOff size={14} />Remove SSL</>}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => openSslModal(selectedDomain)} disabled={sslAction === selectedDomain} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                      {sslAction === selectedDomain ? <LoadingSpinner size="sm" text="Installing..." /> : <><Shield size={14} />Install SSL</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Mail size={18} className="text-orange-400" />
                {selectedDomain ? `Accounts: ${selectedDomain}` : 'Mail Accounts'}
                {loadingAccounts && <LoadingSpinner size="sm" />}
              </h3>
              {selectedDomain && (
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddAccount(!showAddAccount); setChangingPwFor(''); clearMsg(); }} className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5">
                    {showAddAccount ? <X size={14} /> : <Plus size={14} />}{showAddAccount ? 'Cancel' : 'Add'}
                  </button>
                  <button onClick={() => fetchAccounts(selectedDomain)} disabled={loadingAccounts} className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}
            </div>

            {showAddAccount && selectedDomain && (
              <div className="p-4 border-b border-gray-700/50 bg-gray-900/30">
                <p className="text-xs text-gray-400 mb-2">New account for <strong className="text-white">{selectedDomain}</strong></p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="relative">
                    <input type="text" value={newAccount} onChange={e => setNewAccount(e.target.value)} placeholder="username" onKeyDown={e => e.key === 'Enter' && handleAddAccount()} className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 pr-24" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">@{selectedDomain}</span>
                  </div>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleAddAccount()} className="w-full bg-gray-800 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50" />
                </div>
                <button onClick={handleAddAccount} disabled={addingAccount || !newAccount.trim() || !newPassword} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
                  {addingAccount ? <LoadingSpinner size="sm" /> : <Plus size={14} />}Create Account
                </button>
              </div>
            )}

            <div className="p-4">
              {!selectedDomain ? (
                <div className="text-center py-8">
                  <User size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">Select a mail domain to manage accounts</p>
                </div>
              ) : loadingAccounts ? (
                <div className="flex justify-center py-6"><LoadingSpinner size="md" text="Loading accounts..." /></div>
              ) : accounts.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {accounts.map(acc => (
                    <div key={acc.account} className="bg-gray-900/40 border border-gray-700/40 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium text-sm">{acc.email}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs text-gray-400">Quota: {acc.quota === '0' || acc.quota === 'unlimited' ? '∞' : acc.quota + 'MB'}</span>
                            <span className="text-xs text-gray-400">Used: {acc.used}MB</span>
                            {acc.suspended === 'yes' && <span className="text-xs text-red-400">Suspended</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => { setChangingPwFor(changingPwFor === acc.account ? '' : acc.account); setChangePw(''); setShowPw(false); clearMsg(); }} className={`p-1.5 rounded transition-colors ${changingPwFor === acc.account ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'}`}>
                            <Key size={14} />
                          </button>
                          <button onClick={() => handleDeleteAccount(acc.account)} disabled={deletingAccount === acc.account} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded disabled:opacity-50">
                            {deletingAccount === acc.account ? <LoadingSpinner size="sm" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>

                      {changingPwFor === acc.account && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50 flex gap-2">
                          <div className="relative flex-1">
                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input type={showPw ? 'text' : 'password'} value={changePw} onChange={e => setChangePw(e.target.value)} placeholder="New password" onKeyDown={e => e.key === 'Enter' && handleChangePassword()} className="w-full bg-gray-800 border border-gray-600/50 rounded-lg pl-9 pr-8 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                          </div>
                          <button onClick={handleChangePassword} disabled={changingPw || !changePw} className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-black px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
                            {changingPw ? <LoadingSpinner size="sm" /> : <Check size={14} />}Set
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-6">No email accounts for {selectedDomain}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
