import { useState, useCallback, useEffect, useRef } from 'react';
import {
  HestiaConfig,
  HestiaMailDomain,
  HestiaDnsDomain,
  HestiaDnsRecord,
  LogEntry,
  User,
  Client,
} from '../types';
import * as backendApi from '../services/backendApi';
import * as hestiaApi from '../services/hestiaApi';

const DEFAULT_HESTIA_CONFIG: HestiaConfig = {
  hostname: '',
  port: '8083',
  authType: 'credentials',
  username: 'admin',
  password: '',
  accessKey: '',
  secretKey: '',
  apiHash: '',
  user: 'admin',
  hostIp: '',
};

export function useStore() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // HestiaCP Config (admin's global config)
  const [hestiaConfig, setHestiaConfigState] = useState<HestiaConfig>(DEFAULT_HESTIA_CONFIG);
  const [hestiaConnected, setHestiaConnected] = useState(false);
  const [hestiaConnecting, setHestiaConnecting] = useState(false);

  // Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // HestiaCP Data
  const [hestiaUsers, setHestiaUsers] = useState<string[]>([]);
  const [mailDomains, setMailDomains] = useState<HestiaMailDomain[]>([]);
  const [dnsDomains, setDnsDomains] = useState<HestiaDnsDomain[]>([]);
  const [dnsRecords, setDnsRecords] = useState<HestiaDnsRecord[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  // UI States
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [configSaving, setConfigSaving] = useState(false);

  // Ref to prevent double auto-connect
  const autoConnectAttempted = useRef(false);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setAuthLoading(true);
    const storedUser = backendApi.getStoredUser();
    
    if (storedUser && backendApi.isAuthenticated()) {
      try {
        const response = await backendApi.verifyToken();
        if (response.success) {
          setCurrentUser(response.user || storedUser);
          setIsAuthenticated(true);
          // Load HestiaCP config from backend then auto-connect
          await loadHestiaConfigAndConnect();
          try {
            const clientsResp = await backendApi.getClients();
            if (clientsResp.success && clientsResp.data) {
              setClients(clientsResp.data);
            }
          } catch {
            // ignore
          }
        } else {
          handleLogout();
        }
      } catch {
        setCurrentUser(storedUser);
        setIsAuthenticated(true);
        await loadHestiaConfigAndConnect();
        try {
          const clientsResp = await backendApi.getClients();
          if (clientsResp.success && clientsResp.data) {
            setClients(clientsResp.data);
          }
        } catch {
          // ignore
        }
      }
    }
    setAuthLoading(false);
  };

  const handleLogin = useCallback(async (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    autoConnectAttempted.current = false;
    await loadHestiaConfigAndConnect();
    try {
      const clientsResp = await backendApi.getClients();
      if (clientsResp.success && clientsResp.data) {
        setClients(clientsResp.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await backendApi.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setHestiaConfigState(DEFAULT_HESTIA_CONFIG);
    setHestiaConnected(false);
    setClients([]);
    setSelectedClient(null);
    setHestiaUsers([]);
    setMailDomains([]);
    setDnsDomains([]);
    setDnsRecords([]);
    setLogs([]);
    autoConnectAttempted.current = false;
  }, []);

  // Load config from backend AND auto-connect HestiaCP
  const loadHestiaConfigAndConnect = async () => {
    try {
      const response = await backendApi.loadHestiaConfig();
      if (response.success && response.data) {
        const config = backendApi.configToHestiaFormat(response.data);
        setHestiaConfigState(config);

        // Auto-connect if config has enough data
        const hasAuth =
          (config.authType === 'hash' && config.apiHash) ||
          (config.authType === 'credentials' && config.username && config.password) ||
          (config.authType === 'accesskey' && config.accessKey && config.secretKey);

        if (config.hostname && hasAuth && !autoConnectAttempted.current) {
          autoConnectAttempted.current = true;
          autoConnectHestia(config);
        }
      }
    } catch (error) {
      console.log('No saved HestiaCP config found:', error);
    }
  };

  // Auto-connect to HestiaCP
  const autoConnectHestia = async (config: HestiaConfig) => {
    setHestiaConnecting(true);
    addLogLocal('HestiaCP', `Auto-connecting to ${config.hostname}:${config.port}...`, 'info');
    try {
      const result = await hestiaApi.testConnection(config);
      if (result.success) {
        setHestiaConnected(true);
        if (result.users) setHestiaUsers(result.users);
        addLogLocal('HestiaCP', `Auto-connected! Found ${result.users?.length || 0} users.`, 'success');
      } else {
        setHestiaConnected(false);
        addLogLocal('HestiaCP', `Auto-connect failed: ${result.error}`, 'error');
      }
    } catch (e: any) {
      setHestiaConnected(false);
      addLogLocal('HestiaCP', `Auto-connect error: ${e.message}`, 'error');
    }
    setHestiaConnecting(false);
  };

  const saveHestiaConfigToBackend = async () => {
    setConfigSaving(true);
    try {
      await backendApi.saveHestiaConfig(hestiaConfig);
      addLogLocal('Config', 'HestiaCP configuration saved to database', 'success');
      // After saving, try auto-connect with the new config
      autoConnectAttempted.current = false;
      await autoConnectHestia(hestiaConfig);
    } catch (error: any) {
      addLogLocal('Config', `Failed to save config: ${error.message}`, 'error');
    }
    setConfigSaving(false);
  };

  const setHestiaConfig = useCallback((config: HestiaConfig) => {
    setHestiaConfigState(config);
  }, []);

  // Local log that doesn't try to save to backend (to avoid auth issues during init)
  const addLogLocal = (action: string, details: string, status: 'success' | 'error' | 'info') => {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      action, details, status,
    };
    setLogs(prev => [entry, ...prev].slice(0, 100));
  };

  const addLog = useCallback(async (action: string, details: string, status: 'success' | 'error' | 'info') => {
    addLogLocal(action, details, status);
    if (isAuthenticated) {
      try { await backendApi.saveActivityLog(action, details, status); } catch { /* ignore */ }
    }
  }, [isAuthenticated]);

  return {
    // Auth
    isAuthenticated,
    currentUser,
    authLoading,
    handleLogin,
    handleLogout,

    // HestiaCP Config
    hestiaConfig,
    setHestiaConfig,
    hestiaConnected,
    setHestiaConnected,
    hestiaConnecting,
    saveHestiaConfigToBackend,
    configSaving,

    // Clients
    clients,
    setClients,
    selectedClient,
    setSelectedClient,

    // HestiaCP Data
    hestiaUsers,
    setHestiaUsers,
    mailDomains,
    setMailDomains,
    dnsDomains,
    setDnsDomains,
    dnsRecords,
    setDnsRecords,
    selectedDomain,
    setSelectedDomain,
    selectedUser,
    setSelectedUser,

    // UI
    logs,
    addLog,
  };
}
