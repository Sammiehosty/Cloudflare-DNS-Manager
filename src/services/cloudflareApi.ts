import { CloudflareConfig, CloudflareDnsRecord, CloudflareCreateRecord } from '../types';

// Use backend proxy for all Cloudflare API calls
const getBackendUrl = (): string => {
  return localStorage.getItem('backend_url') || 'https://smhcp.sammiehosty.com/api';
};

const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

async function cfProxyRequest(endpoint: string, data: Record<string, any> = {}): Promise<any> {
  const url = `${getBackendUrl()}/cf/${endpoint}`;
  const token = getToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Cloudflare request failed');
  }
  return result;
}

export async function verifyToken(config: CloudflareConfig): Promise<{ success: boolean; error?: string }> {
  try {
    if (!config.apiToken) return { success: false, error: 'API Token is required' };
    const result = await cfProxyRequest('verify', { api_token: config.apiToken });
    return { success: result.success };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getZoneDetails(config: CloudflareConfig): Promise<{ name: string; status: string } | null> {
  try {
    if (!config.zoneId) return null;
    const result = await cfProxyRequest('zone', { api_token: config.apiToken, zone_id: config.zoneId });
    if (result.success && result.data) {
      return { name: result.data.name, status: result.data.status };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAllDnsRecords(config: CloudflareConfig): Promise<CloudflareDnsRecord[]> {
  const result = await cfProxyRequest('list-records', {
    api_token: config.apiToken,
    zone_id: config.zoneId,
  });
  return result.data || [];
}

export async function createDnsRecord(
  config: CloudflareConfig,
  record: CloudflareCreateRecord
): Promise<CloudflareDnsRecord> {
  const result = await cfProxyRequest('create-record', {
    api_token: config.apiToken,
    zone_id: config.zoneId,
    record: {
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl || 1,
      proxied: record.proxied || false,
      priority: record.priority,
    },
  });
  return result.data;
}

export async function updateDnsRecord(
  config: CloudflareConfig,
  recordId: string,
  record: CloudflareCreateRecord
): Promise<CloudflareDnsRecord> {
  const result = await cfProxyRequest('update-record', {
    api_token: config.apiToken,
    zone_id: config.zoneId,
    record_id: recordId,
    record: {
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl || 1,
      proxied: record.proxied || false,
      priority: record.priority,
    },
  });
  return result.data;
}

export async function deleteDnsRecord(
  config: CloudflareConfig,
  recordId: string
): Promise<boolean> {
  const result = await cfProxyRequest('delete-record', {
    api_token: config.apiToken,
    zone_id: config.zoneId,
    record_id: recordId,
  });
  return result.success;
}

export interface BulkUpdateClient {
  api_token: string;
  zone_id: string;
  zone_name: string;
}

export interface BulkUpdateResult {
  client: string;
  status: 'success' | 'error' | 'no_match' | 'partial' | 'skipped';
  updated?: number;
  errors?: number;
  message: string;
}

export async function bulkUpdateIp(
  newIp: string,
  recordNames: string[],
  clients: BulkUpdateClient[]
): Promise<{ results: BulkUpdateResult[]; totalUpdated: number }> {
  const result = await cfProxyRequest('bulk-update-ip', {
    new_ip: newIp,
    record_names: recordNames,
    clients,
  });
  return {
    results: result.data || [],
    totalUpdated: result.total_updated || 0,
  };
}
