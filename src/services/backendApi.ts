import { AuthResponse, ApiResponse, UserConfig, User, HestiaConfig, Client, WhmServer, WhmAccount, WhmAccountList, WhmSyncJob } from '../types';

// Backend URL - configurable
const getBackendUrl = (): string => {
  return localStorage.getItem('backend_url') || 'https://smhcp.sammiehosty.com/api';
};

export const setBackendUrl = (url: string): void => {
  localStorage.setItem('backend_url', url);
};

export const getStoredBackendUrl = (): string => {
  return localStorage.getItem('backend_url') || 'https://smhcp.sammiehosty.com/api';
};

// Get auth token
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const url = `${getBackendUrl()}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// =====================
// AUTH ENDPOINTS
// =====================

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', 'POST', { username, password });
  
  if (response.success && response.token) {
    localStorage.setItem('auth_token', response.token);
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
  }
  
  return response;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', 'POST');
  } catch {
    // Ignore errors on logout
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
}

export async function verifyToken(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/verify', 'GET');
}

export async function updateAdminAccount(payload: {
  username: string;
  currentPassword: string;
  newPassword?: string;
}): Promise<ApiResponse<User>> {
  const response = await apiRequest<ApiResponse<User>>('/auth/update-account', 'POST', payload);
  if (response.success && response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  return response;
}

// =====================
// ADMIN CONFIG ENDPOINTS (HestiaCP)
// =====================

export async function saveHestiaConfig(hestiaConfig: HestiaConfig): Promise<ApiResponse<UserConfig>> {
  const configData = {
    hestia_hostname: hestiaConfig.hostname,
    hestia_port: hestiaConfig.port,
    hestia_auth_type: hestiaConfig.authType,
    hestia_username: hestiaConfig.username,
    hestia_password: hestiaConfig.password,
    hestia_access_key: hestiaConfig.accessKey,
    hestia_secret_key: hestiaConfig.secretKey,
    hestia_api_hash: hestiaConfig.apiHash,
    hestia_user: hestiaConfig.user,
    hestia_host_ip: hestiaConfig.hostIp,
  };

  return apiRequest<ApiResponse<UserConfig>>('/config', 'POST', configData);
}

export async function loadHestiaConfig(): Promise<ApiResponse<UserConfig>> {
  return apiRequest<ApiResponse<UserConfig>>('/config', 'GET');
}

// =====================
// CLIENT ENDPOINTS
// =====================

export async function getClients(): Promise<ApiResponse<Client[]>> {
  return apiRequest<ApiResponse<Client[]>>('/clients', 'GET');
}

export async function getClient(id: number): Promise<ApiResponse<Client>> {
  return apiRequest<ApiResponse<Client>>(`/clients/${id}`, 'GET');
}

export async function createClient(client: Partial<Client>): Promise<ApiResponse<Client>> {
  return apiRequest<ApiResponse<Client>>('/clients', 'POST', client);
}

export async function updateClient(id: number, client: Partial<Client>): Promise<ApiResponse<Client>> {
  return apiRequest<ApiResponse<Client>>(`/clients/${id}`, 'PUT', client);
}

export async function deleteClient(id: number): Promise<ApiResponse<null>> {
  return apiRequest<ApiResponse<null>>(`/clients/${id}`, 'DELETE');
}

export async function registerClient(client: Partial<Client>): Promise<ApiResponse<Client>> {
  return apiRequest<ApiResponse<Client>>('/clients/register', 'POST', client);
}

// =====================
// WHM SERVER ENDPOINTS
// =====================

export async function getWhmServers(): Promise<ApiResponse<WhmServer[]>> {
  return apiRequest<ApiResponse<WhmServer[]>>('/whm/servers', 'GET');
}

export async function createWhmServer(server: Partial<WhmServer>): Promise<ApiResponse<WhmServer>> {
  return apiRequest<ApiResponse<WhmServer>>('/whm/servers', 'POST', server);
}

export async function updateWhmServer(id: number, server: Partial<WhmServer>): Promise<ApiResponse<WhmServer>> {
  return apiRequest<ApiResponse<WhmServer>>(`/whm/servers/${id}`, 'PUT', server);
}

export async function deleteWhmServer(id: number): Promise<ApiResponse<null>> {
  return apiRequest<ApiResponse<null>>(`/whm/servers/${id}`, 'DELETE');
}

export async function testWhmServer(server: Partial<WhmServer> & { server_id?: number }): Promise<ApiResponse<any>> {
  return apiRequest<ApiResponse<any>>('/whm/test', 'POST', server);
}

export async function getWhmAccounts(): Promise<ApiResponse<WhmAccountList>> {
  return apiRequest<ApiResponse<WhmAccountList>>('/whm/accounts', 'GET');
}

export async function syncWhmServers(
  serverId?: number,
  accounts?: Pick<WhmAccount, 'server_id' | 'domain' | 'user'>[],
  dryRun = false
): Promise<ApiResponse<WhmSyncJob>> {
  const payload: Record<string, any> = {};
  if (serverId) payload.server_id = serverId;
  if (accounts && accounts.length > 0) payload.accounts = accounts;
  if (dryRun) payload.dry_run = true;
  return apiRequest<ApiResponse<WhmSyncJob>>('/whm/sync', 'POST', payload);
}

export async function getWhmSyncJob(jobId: number): Promise<ApiResponse<WhmSyncJob>> {
  return apiRequest<ApiResponse<WhmSyncJob>>(`/whm/jobs/${jobId}`, 'GET');
}

export async function runWhmSyncJob(jobId: number): Promise<ApiResponse<WhmSyncJob>> {
  return apiRequest<ApiResponse<WhmSyncJob>>(`/whm/jobs/${jobId}/run`, 'POST');
}

// =====================
// ACTIVITY LOG ENDPOINTS
// =====================

export async function saveActivityLog(
  action: string,
  details: string,
  status: 'success' | 'error' | 'info',
  clientId?: number
): Promise<ApiResponse<null>> {
  return apiRequest<ApiResponse<null>>('/logs', 'POST', { action, details, status, client_id: clientId });
}

export async function getActivityLogs(limit: number = 100): Promise<ApiResponse<any[]>> {
  return apiRequest<ApiResponse<any[]>>(`/logs?limit=${limit}`, 'GET');
}

// =====================
// HELPER FUNCTIONS
// =====================

export function getStoredUser(): User | null {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Convert stored config to app config format
export function configToHestiaFormat(config: any): HestiaConfig {
  return {
    hostname: config.hestia_hostname || '',
    port: config.hestia_port || '8083',
    authType: config.hestia_auth_type || 'credentials',
    username: config.hestia_username || 'admin',
    password: config.hestia_password || '',
    accessKey: config.hestia_access_key || '',
    secretKey: config.hestia_secret_key || '',
    apiHash: config.hestia_api_hash || '',
    user: config.hestia_user || 'admin',
    hostIp: config.hestia_host_ip || '',
  };
}
