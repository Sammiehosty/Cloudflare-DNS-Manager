import axios from 'axios';

const BACKEND_URL = 'https://cf.sammiehosty.com/api';

// This will be set upon login and used for all subsequent requests
let AUTH_KEY = '';

export const setAuthKey = (key: string) => {
  AUTH_KEY = key;
};

export interface User {
  id: number;
  name: string;
  website: string;
  cf_token: string;
  zone_id: string;
}

export interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

const getHeaders = () => ({
  headers: { 'x-admin-key': AUTH_KEY }
});

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const response = await axios.get(`${BACKEND_URL}/users`, getHeaders());
    return response.data;
  },
  addUser: async (user: Omit<User, 'id'>): Promise<User> => {
    const response = await axios.post(`${BACKEND_URL}/users`, user, getHeaders());
    return response.data;
  },
  updateUser: async (user: User): Promise<User> => {
    const response = await axios.put(`${BACKEND_URL}/users/${user.id}`, user, getHeaders());
    return response.data;
  },
  deleteUser: async (id: number): Promise<void> => {
    await axios.delete(`${BACKEND_URL}/users/${id}`, getHeaders());
  },
  updatePassword: async (newPassword: string): Promise<void> => {
    await axios.post(`${BACKEND_URL}/admin/password`, { password: newPassword }, getHeaders());
    setAuthKey(newPassword); // Update current session key
  },
  updateTheme: async (theme: string): Promise<void> => {
    await axios.post(`${BACKEND_URL}/admin/theme`, { theme }, getHeaders());
  },
  login: async (password: string): Promise<{ success: boolean, theme?: string }> => {
    try {
      const response = await axios.post(`${BACKEND_URL}/login`, { password });
      if (response.data.success) {
        setAuthKey(password);
      }
      return { success: true, theme: response.data.theme };
    } catch {
      return { success: false };
    }
  },
  registerClient: async (data: Omit<User, 'id'>): Promise<{ success: boolean, error?: string }> => {
    try {
      await axios.post(`${BACKEND_URL}/register`, data);
      return { success: true };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Registration failed' 
      };
    }
  }
};

export const cfService = {
  getDNSRecords: async (zoneId: string, token: string): Promise<DNSRecord[]> => {
    const response = await axios.get(`${BACKEND_URL}/cf/${zoneId}/dns_records`, {
      headers: { ...getHeaders().headers, 'X-CF-Token': token }
    });
    return response.data.result;
  },

  updateDNSRecord: async (zoneId: string, recordId: string, data: Partial<DNSRecord>, token: string): Promise<void> => {
    await axios.patch(`${BACKEND_URL}/cf/${zoneId}/dns_records/${recordId}`, data, {
      headers: { ...getHeaders().headers, 'X-CF-Token': token }
    });
  },

  deleteDNSRecord: async (zoneId: string, recordId: string, token: string): Promise<void> => {
    await axios.delete(`${BACKEND_URL}/cf/${zoneId}/dns_records/${recordId}`, {
      headers: { ...getHeaders().headers, 'X-CF-Token': token }
    });
  },

  createDNSRecord: async (zoneId: string, data: Omit<DNSRecord, 'id'>, token: string): Promise<void> => {
    await axios.post(`${BACKEND_URL}/cf/${zoneId}/dns_records`, data, {
      headers: { ...getHeaders().headers, 'X-CF-Token': token }
    });
  },

  purgeCache: async (zoneId: string, token: string): Promise<void> => {
    await axios.post(`${BACKEND_URL}/cf/${zoneId}/purge_cache`, {}, {
      headers: { ...getHeaders().headers, 'X-CF-Token': token }
    });
  }
};