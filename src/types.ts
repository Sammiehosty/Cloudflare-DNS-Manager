// HestiaCP Types
export interface HestiaConfig {
  hostname: string;
  port: string;
  authType: 'credentials' | 'accesskey' | 'hash';
  username: string;
  password: string;
  accessKey: string;
  secretKey: string;
  apiHash: string;
  user: string;
  hostIp: string;
}

export interface HestiaMailDomain {
  domain: string;
  accounts: string;
  ssl: string;
  letsencrypt: string;
  antispam: string;
  antivirus: string;
  dkim: string;
  catchall: string;
  suspended: string;
  time: string;
  date: string;
  webmail: string;
}

export interface HestiaDnsRecord {
  id: string;
  record: string;
  type: string;
  priority: string;
  value: string;
  ttl: string;
  suspended: string;
  time: string;
  date: string;
}

export interface HestiaDnsDomain {
  domain: string;
  ip: string;
  tpl: string;
  ttl: string;
  exp: string;
  soa: string;
  serial: string;
  records: string;
  suspended: string;
  time: string;
  date: string;
}

// User Config (stored in database)
export interface UserConfig {
  id?: number;
  user_id: number;
  hestia_hostname: string;
  hestia_port: string;
  hestia_auth_type: 'credentials' | 'accesskey';
  hestia_username: string;
  hestia_password: string;
  hestia_access_key: string;
  hestia_secret_key: string;
  hestia_user: string;
  cf_api_token: string;
  cf_zone_id: string;
  created_at?: string;
  updated_at?: string;
}

// Client (managed by admin)
export interface Client {
  id: number;
  name: string;
  email: string;
  cf_api_token: string;
  cf_zone_id: string;
  cf_zone_name?: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

// WHM Servers
export interface WhmServer {
  id: number;
  name: string;
  hostname: string;
  port: string;
  username: string;
  password?: string;
  password_masked?: string;
  use_ssl: boolean;
  enabled: boolean;
  last_sync_at?: string | null;
  last_sync_status?: 'success' | 'error' | 'info' | null;
  last_sync_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WhmAccount {
  server_id: number;
  server_name: string;
  domain: string;
  user: string;
  owner: string;
  suspended: boolean;
  suspendreason?: string;
}

export interface WhmAccountList {
  accounts: WhmAccount[];
  errors: Array<{
    server_id: number;
    server_name: string;
    message: string;
  }>;
}

export interface WhmSyncResult {
  id?: number;
  job_id?: number;
  server: string;
  server_name?: string;
  domain: string;
  whm_status?: 'active' | 'suspended';
  hestia_status?: string;
  hestia_action?: 'suspended' | 'unsuspended' | 'none';
  status: 'success' | 'error' | 'skipped' | 'planned';
  message?: string;
  created_at?: string;
}

export interface WhmSyncJob {
  id: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  dry_run: boolean;
  source: 'manual' | 'cron' | string;
  selected_accounts: Array<Pick<WhmAccount, 'server_id' | 'domain' | 'user'>>;
  total_accounts: number;
  processed_accounts: number;
  changed_count: number;
  error_count: number;
  message?: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;
  updated_at?: string;
  results: WhmSyncResult[];
}

// Cloudflare Types
export interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
}

export interface CloudflareDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
  locked: boolean;
  created_on: string;
  modified_on: string;
}

export interface CloudflareCreateRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
}

export interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_pages: number;
    count: number;
    total_count: number;
  };
}

// Push Result
export interface PushResult {
  record: string;
  type: string;
  value: string;
  status: 'success' | 'error' | 'skipped' | 'pending';
  message: string;
}

// Activity Log
export interface LogEntry {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  status: 'success' | 'error' | 'info';
}

// User / Auth Types (admin only)
export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'admin';
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

// Backend API Response
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// Mail Domain DNS Info (for pushing to Cloudflare)
export interface MailDomainDns {
  domain: string;
  records: HestiaDnsRecord[];
  dkim?: HestiaDnsRecord[];
  spf?: string;
  dmarc?: string;
}
