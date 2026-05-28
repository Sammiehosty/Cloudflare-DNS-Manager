import axios from 'axios';

const BACKEND_URL = 'https://cf.sammiehosty.com/api';

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

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const response = await axios.get(`${BACKEND_URL}/users`);
    return response.data;
  },
  addUser: async (user: Omit<User, 'id'>): Promise<User> => {
    const response = await axios.post(`${BACKEND_URL}/users`, user);
    return response.data;
  },
  updateUser: async (user: User): Promise<User> => {
    const response = await axios.put(`${BACKEND_URL}/users/${user.id}`, user);
    return response.data;
  },
  deleteUser: async (id: number): Promise<void> => {
    await axios.delete(`${BACKEND_URL}/users/${id}`);
  },
  updatePassword: async (newPassword: string): Promise<void> => {
    await axios.post(`${BACKEND_URL}/admin/password`, { password: newPassword });
  },
  updateTheme: async (theme: string): Promise<void> => {
    await axios.post(`${BACKEND_URL}/admin/theme`, { theme });
  },
  login: async (password: string): Promise<{ success: boolean, theme?: string }> => {
    try {
      const response = await axios.post(`${BACKEND_URL}/login`, { password });
      return { success: true, theme: response.data.theme };
    } catch {
      return { success: false };
    }
  }
};

export const cfService = {
  getDNSRecords: async (zoneId: string, token: string): Promise<DNSRecord[]> => {
    const response = await axios.get(`${BACKEND_URL}/cf/${zoneId}/dns_records`, {
      headers: { 'X-CF-Token': token }
    });
    return response.data.result;
  },

  updateDNSRecord: async (zoneId: string, recordId: string, data: Partial<DNSRecord>, token: string): Promise<void> => {
    await axios.patch(`${BACKEND_URL}/cf/${zoneId}/dns_records/${recordId}`, data, {
      headers: { 'X-CF-Token': token }
    });
  },

  deleteDNSRecord: async (zoneId: string, recordId: string, token: string): Promise<void> => {
    await axios.delete(`${BACKEND_URL}/cf/${zoneId}/dns_records/${recordId}`, {
      headers: { 'X-CF-Token': token }
    });
  },

  createDNSRecord: async (zoneId: string, data: Omit<DNSRecord, 'id'>, token: string): Promise<void> => {
    await axios.post(`${BACKEND_URL}/cf/${zoneId}/dns_records`, data, {
      headers: { 'X-CF-Token': token }
    });
  },

  purgeCache: async (zoneId: string, token: string): Promise<void> => {
    await axios.post(`${BACKEND_URL}/cf/${zoneId}/purge_cache`, {}, {
      headers: { 'X-CF-Token': token }
    });
  },

  updateDevelopmentMode: async (zoneId: string, value: 'on' | 'off', token: string): Promise<void> => {
    await axios.patch(`${BACKEND_URL}/cf/${zoneId}/dev_mode`, { value }, {
      headers: { 'X-CF-Token': token }
    });
  }
};