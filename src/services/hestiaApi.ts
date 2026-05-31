import { HestiaConfig, HestiaMailDomain, HestiaDnsRecord } from '../types';

// Get backend URL
const getBackendUrl = (): string => {
  return localStorage.getItem('backend_url') || 'https://smhcp.sammiehosty.com/api';
};

// Get auth token
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Make request through backend proxy
async function hestiaProxyRequest(endpoint: string, config: HestiaConfig, extraParams: Record<string, string> = {}): Promise<any> {
  const url = `${getBackendUrl()}/hestia/${endpoint}`;
  const token = getToken();

  const body = {
    hostname: config.hostname,
    port: config.port,
    auth_type: config.authType,
    username: config.username,
    password: config.password,
    access_key: config.accessKey,
    secret_key: config.secretKey,
    api_hash: config.apiHash,
    hestia_user: config.user,
    ...extraParams,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export async function testConnection(config: HestiaConfig): Promise<{ success: boolean; error?: string; users?: string[] }> {
  try {
    // Validate config
    if (!config.hostname) {
      return { success: false, error: 'Hostname is required' };
    }
    if (config.authType === 'credentials' && (!config.username || !config.password)) {
      return { success: false, error: 'Username and password are required' };
    }
    if (config.authType === 'accesskey' && (!config.accessKey || !config.secretKey)) {
      return { success: false, error: 'Access key and secret key are required' };
    }

    console.log('[HestiaCP] Testing connection via backend proxy...');
    
    const result = await hestiaProxyRequest('test', config);
    
    console.log('[HestiaCP] Connection result:', result);
    
    return { 
      success: true, 
      users: result.users || [] 
    };
  } catch (error: any) {
    console.error('[HestiaCP] Connection test failed:', error);
    return { success: false, error: error.message };
  }
}

export async function listUsers(config: HestiaConfig): Promise<string[]> {
  const result = await hestiaProxyRequest('users', config);
  return result.data || [];
}

export async function listMailDomains(config: HestiaConfig, user: string): Promise<HestiaMailDomain[]> {
  const result = await hestiaProxyRequest('mail-domains', { ...config, user });
  return result.data || [];
}

export async function listDnsRecords(config: HestiaConfig, user: string, domain: string): Promise<HestiaDnsRecord[]> {
  const result = await hestiaProxyRequest('dns-records', { ...config, user }, { domain });
  return result.data || [];
}

export async function listMailDomainDkimDns(config: HestiaConfig, user: string, domain: string): Promise<HestiaDnsRecord[]> {
  try {
    const result = await hestiaProxyRequest('mail-dkim', { ...config, user }, { domain });
    return result.data || [];
  } catch {
    return [];
  }
}

/**
 * Fetch ALL DNS records for a domain in one call
 * Returns: A, AAAA, MX, TXT, CNAME, NS, SRV, CAA + DKIM records
 */
export async function listAllMailDnsRecords(config: HestiaConfig, user: string, domain: string): Promise<{ records: HestiaDnsRecord[]; debug: string[] }> {
  const result = await hestiaProxyRequest('mail-all-dns', { ...config, user }, { domain });
  return {
    records: result.data || [],
    debug: result.debug || [],
  };
}

// =====================
// MAIL DOMAIN MANAGEMENT
// =====================

export async function addMailDomain(config: HestiaConfig, user: string, domain: string): Promise<void> {
  await hestiaProxyRequest('add-mail-domain', { ...config, user }, { domain });
}

export async function deleteMailDomain(config: HestiaConfig, user: string, domain: string): Promise<void> {
  await hestiaProxyRequest('delete-mail-domain', { ...config, user }, { domain });
}

export async function suspendMailDomain(config: HestiaConfig, user: string, domain: string): Promise<void> {
  await hestiaProxyRequest('suspend-mail-domain', { ...config, user }, { domain });
}

export async function unsuspendMailDomain(config: HestiaConfig, user: string, domain: string): Promise<void> {
  await hestiaProxyRequest('unsuspend-mail-domain', { ...config, user }, { domain });
}

// =====================
// MAIL ACCOUNT MANAGEMENT
// =====================

export interface MailAccount {
  account: string;
  email: string;
  quota: string;
  used: string;
  suspended: string;
  fwd: string;
  fwd_only: string;
  autoreply: string;
}

export async function listMailAccounts(config: HestiaConfig, user: string, domain: string): Promise<MailAccount[]> {
  const result = await hestiaProxyRequest('mail-accounts', { ...config, user }, { domain });
  return result.data || [];
}

export async function addMailAccount(config: HestiaConfig, user: string, domain: string, account: string, password: string): Promise<void> {
  await hestiaProxyRequest('add-mail-account', { ...config, user }, { domain, account, password });
}

export async function deleteMailAccount(config: HestiaConfig, user: string, domain: string, account: string): Promise<void> {
  await hestiaProxyRequest('delete-mail-account', { ...config, user }, { domain, account });
}

export async function changeMailPassword(config: HestiaConfig, user: string, domain: string, account: string, password: string): Promise<void> {
  await hestiaProxyRequest('change-mail-password', { ...config, user }, { domain, account, password });
}

// =====================
// SSL
// =====================

export async function addMailSsl(config: HestiaConfig, user: string, domain: string): Promise<string> {
  const result = await hestiaProxyRequest('add-mail-ssl', { ...config, user }, { domain });
  return result.message || 'SSL installed';
}

export async function deleteMailSsl(config: HestiaConfig, user: string, domain: string): Promise<string> {
  const result = await hestiaProxyRequest('delete-mail-ssl', { ...config, user }, { domain });
  return result.message || 'SSL removed';
}

export async function reinstallMailSsl(config: HestiaConfig, user: string, domain: string): Promise<string> {
  const result = await hestiaProxyRequest('reinstall-mail-ssl', { ...config, user }, { domain });
  return result.message || 'SSL reinstalled';
}
