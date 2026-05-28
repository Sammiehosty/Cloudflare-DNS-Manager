import React, { useState, useEffect } from 'react';
import { 
  Settings,
  Plus,
  Globe,
  Search,
  LogOut,
  X,
  Check,
  Server,
  Key,
  ArrowLeft,
  Users,
  AlertCircle,
  Filter,
  Lock,
  Sun,
  Moon
} from 'lucide-react';
import { userService, cfService, User, DNSRecord } from './services/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={cn(
      "fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-[0_2px_5px_rgba(11,20,26,0.1)] z-[400] flex items-center gap-4 animate-in slide-in-from-top-10 fade-in duration-500 min-w-[300px] max-w-[90vw] border border-[#e9edef] bg-white dark:bg-[#202c33] dark:border-[#2a3942]"
    )}>
      <div className={cn(
        "p-2 rounded-full",
        type === 'success' ? "bg-[#00a884] text-white" : "bg-[#f15c5c] text-white"
      )}>
        {type === 'success' ? <Check className="w-5 h-5 stroke-[3px]" /> : <AlertCircle className="w-5 h-5 stroke-[3px]" />}
      </div>
      <div className="flex-1">
        <p className={cn(
          "text-sm font-bold leading-none mb-1",
          type === 'success' ? "text-[#00a884]" : "text-[#f15c5c]"
        )}>
          {type === 'success' ? 'Success' : 'Error'}
        </p>
        <p className="text-xs font-medium text-[#667781] dark:text-[#aebac1] leading-tight">{message}</p>
      </div>
      <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] text-[#667781] transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Delete", 
  type = "danger" 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  confirmText?: string,
  type?: 'danger' | 'info'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-[2px] flex items-center justify-center z-[400] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#202c33] rounded-lg w-full max-w-sm overflow-hidden shadow-[0_24px_40px_rgba(11,20,26,0.2)] scale-in-center border-none">
        <div className="p-6">
          <h3 className="text-lg font-medium text-[#3b4a54] dark:text-[#e9edef] mb-4">{title}</h3>
          <p className="text-[#667781] dark:text-[#aebac1] text-[13px] leading-relaxed">{message}</p>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-6">
          <button 
            onClick={onCancel}
            className="font-bold text-[#00a884] dark:text-[#00a884] transition-colors text-[13px] uppercase tracking-wider outline-none"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={cn(
              "font-bold transition-all active:scale-[0.98] text-[13px] uppercase tracking-wider outline-none",
              type === 'danger' ? "text-[#f15c5c]" : "text-[#00a884]"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const Login = ({ onLogin, setTheme }: { onLogin: () => void, setTheme: (t: 'light' | 'dark') => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const result = await userService.login(password);
      if (result.success) {
        if (result.theme) setTheme(result.theme as 'light' | 'dark');
        onLogin();
      } else {
        setError('Invalid administrator password');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#202c33] rounded-lg shadow-[0_1px_3px_rgba(11,20,26,0.1)] border-none p-10 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-[#00a884] p-4 rounded-full shadow-sm mb-6 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.95 13.911c.05-.286.05-.566.05-.85 0-3.352-2.73-6.071-6.096-6.071-.161 0-.311.025-.472.038C15.42 4.195 12.95 2 10.021 2 6.55 2 3.74 4.805 3.74 8.261c0 .285.025.566.062.838A5.378 5.378 0 001 14.33c0 2.96 2.41 5.36 5.385 5.36h14.155c1.928 0 3.46-1.536 3.46-3.447a3.42 3.42 0 00-1.05-2.332z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#3b4a54] dark:text-[#e9edef] tracking-tight">Cloudflare Manager</h1>
            <p className="text-sm text-[#667781] dark:text-[#aebac1] text-center mt-3 font-medium leading-relaxed px-2">
              Centralized DNS control and client management. Manage global infrastructure, optimize zone records, and maintain enterprise security through a secure, responsive dashboard.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#00a884] uppercase tracking-wider ml-1">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#f0f2f5] dark:bg-[#2a3942] border-none rounded-lg focus:ring-2 focus:ring-[#00a884] outline-none transition-all text-[#3b4a54] dark:text-[#e9edef] font-medium"
                placeholder="••••••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="bg-[#fee8e8] dark:bg-[#3d2121] text-[#f15c5c] text-xs font-bold p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00a884] hover:bg-[#06cf9c] text-white font-bold py-3.5 rounded-full shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Login to Dashboard</>
              )}
            </button>
          </form>
          
          <div className="mt-10 pt-8 border-t border-[#f0f2f5] dark:border-[#2a3942] text-center">
            <p className="text-[10px] text-[#667781] dark:text-[#aebac1] uppercase tracking-widest font-bold">
              Professional Multi-Client Control
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserDialog = ({ isOpen, onClose, onAdd, userToEdit }: { isOpen: boolean, onClose: () => void, onAdd: (u: User | Omit<User, 'id'>) => void, userToEdit?: User | null }) => {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [token, setToken] = useState('');
  const [zoneId, setZoneId] = useState('');

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setWebsite(userToEdit.website);
      setToken(userToEdit.cf_token);
      setZoneId(userToEdit.zone_id);
    } else {
      setName(''); setWebsite(''); setToken(''); setZoneId('');
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#111b21] w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg overflow-hidden shadow-2xl flex flex-col scale-in-center transition-all">
        <div className="bg-[#008069] dark:bg-[#202c33] text-white p-5 flex items-center gap-4 shrink-0 shadow-sm">
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors outline-none"><ArrowLeft className="w-6 h-6" /></button>
          <h3 className="font-medium text-lg">{userToEdit ? 'Edit Client' : 'Add New Client'}</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-[#f0f2f5] dark:bg-[#111b21] scrollbar-none">
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-white dark:bg-[#202c33] p-4 sm:p-6 rounded-lg shadow-sm border border-[#e9edef] dark:border-[#2a3942] space-y-6">
              <div className="space-y-1 relative group">
                <label className="text-[11px] font-medium text-[#008069] dark:text-[#00a884] uppercase tracking-wider ml-1">Name</label>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#8696a0]" />
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-b border-[#e9edef] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all text-[#3b4a54] dark:text-[#e9edef] font-medium"
                    placeholder="Client name"
                  />
                </div>
              </div>

              <div className="space-y-1 relative group">
                <label className="text-[11px] font-medium text-[#008069] dark:text-[#00a884] uppercase tracking-wider ml-1">Domain</label>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-[#8696a0]" />
                  <input 
                    value={website} 
                    onChange={e => setWebsite(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-b border-[#e9edef] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all text-[#3b4a54] dark:text-[#e9edef] font-medium"
                    placeholder="example.com"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#202c33] p-4 sm:p-6 rounded-lg shadow-sm border border-[#e9edef] dark:border-[#2a3942] space-y-6">
              <div className="space-y-1 relative group">
                <label className="text-[11px] font-medium text-[#008069] dark:text-[#00a884] uppercase tracking-wider ml-1">Zone ID</label>
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-[#8696a0]" />
                  <input 
                    value={zoneId} 
                    onChange={e => setZoneId(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-b border-[#e9edef] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all font-mono text-sm dark:text-[#e9edef]"
                    placeholder="32-char Zone ID"
                  />
                </div>
              </div>

              <div className="space-y-1 relative group">
                <label className="text-[11px] font-medium text-[#008069] dark:text-[#00a884] uppercase tracking-wider ml-1">API Token</label>
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-[#8696a0]" />
                  <input 
                    type="password"
                    value={token} 
                    onChange={e => setToken(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-b border-[#e9edef] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all text-[#3b4a54] dark:text-[#e9edef] font-medium"
                    placeholder="Cloudflare Token"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 flex justify-center sticky bottom-0">
              <button 
                onClick={() => {
                  const userData = userToEdit ? { ...userToEdit, name, website, cf_token: token, zone_id: zoneId } : { name, website, cf_token: token, zone_id: zoneId };
                  onAdd(userData);
                }}
                className="bg-[#00a884] text-white px-12 py-3.5 rounded-full font-bold shadow-lg hover:bg-[#06cf9c] active:scale-95 transition-all uppercase tracking-wide text-xs"
              >
                {userToEdit ? 'Save Profile' : 'Initialize Client'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsDialog = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (p: string) => void }) => {
  const [newPass, setNewPass] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#111b21] w-full max-w-sm h-full sm:h-auto sm:rounded-lg overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-[#008069] dark:bg-[#202c33] text-white p-5 flex items-center gap-4 shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
          <h3 className="font-medium text-lg">Settings</h3>
        </div>
        <div className="p-8 space-y-8 bg-[#f0f2f5] dark:bg-[#111b21] flex-1">
          <div className="bg-white dark:bg-[#202c33] p-6 rounded-lg shadow-sm border border-transparent dark:border-[#2a3942] space-y-4 text-center">
            <label className="text-sm font-medium text-[#008069] dark:text-[#00a884] block mb-2 uppercase tracking-widest">Update Admin Password</label>
            <input 
              type="password"
              value={newPass} 
              onChange={e => setNewPass(e.target.value)}
              className="w-full p-2 bg-transparent border-b border-[#e9edef] dark:border-[#2a3942] focus:border-[#008069] outline-none transition-all text-center text-xl font-bold dark:text-[#e9edef]"
              placeholder="••••••••••••"
            />
          </div>
          <button 
            onClick={() => { onSave(newPass); onClose(); }}
            className="w-full bg-[#00a884] text-white py-4 rounded-full font-bold shadow-lg hover:bg-[#06cf9c] active:scale-95 transition-all uppercase tracking-wide text-sm"
          >
            Update Key
          </button>
        </div>
      </div>
    </div>
  );
};

const NewDNSRecordRow = ({ onAdd, onCancel }: { onAdd: (r: Omit<DNSRecord, 'id'>) => void, onCancel: () => void }) => {
  const [newRecord, setNewRecord] = useState<Omit<DNSRecord, 'id'>>({
    type: 'A',
    name: '',
    content: '',
    ttl: 3600,
    proxied: true
  });

  return (
    <tr className="border-b bg-[#f0f2f5]/50 dark:bg-[#2a3942]/10 animate-in fade-in slide-in-from-top-2 duration-300">
      <td className="p-2 sm:p-4 border-r dark:border-[#2a3942]"></td>
      <td className="p-2 sm:p-4">
        <select 
          value={newRecord.type} 
          onChange={e => setNewRecord({...newRecord, type: e.target.value})} 
          className="w-full sm:w-20 p-2 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-xs font-bold text-[#00a884] outline-none"
        >
          {['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'SRV', 'NS'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td className="p-2 sm:p-4"><input placeholder="Name" value={newRecord.name} onChange={e => setNewRecord({...newRecord, name: e.target.value})} className="w-full p-2 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-xs sm:text-sm text-[#3b4a54] dark:text-[#e9edef] outline-none focus:ring-1 focus:ring-[#00a884]" /></td>
      <td className="p-2 sm:p-4"><input placeholder="Content" value={newRecord.content} onChange={e => setNewRecord({...newRecord, content: e.target.value})} className="w-full p-2 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-xs sm:text-sm text-[#3b4a54] dark:text-[#e9edef] outline-none focus:ring-1 focus:ring-[#00a884]" /></td>
      <td className="p-2 sm:p-4">
        <select 
          value={newRecord.proxied ? 'true' : 'false'} 
          onChange={e => setNewRecord({...newRecord, proxied: e.target.value === 'true'})}
          className="w-full p-2 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[10px] font-bold uppercase dark:text-gray-300 outline-none"
        >
          <option value="true">Proxied</option>
          <option value="false">DNS Only</option>
        </select>
      </td>
      <td className="p-2 sm:p-4 text-center">
        <div className="flex gap-2 justify-center">
          <button onClick={() => onAdd(newRecord)} className="text-[#00a884] hover:bg-green-50 dark:hover:bg-green-950/20 p-2 rounded-full transition-all"><Check className="w-5 h-5 stroke-[3px]" /></button>
          <button onClick={onCancel} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-full transition-all"><X className="w-5 h-5 stroke-[3px]" /></button>
        </div>
      </td>
    </tr>
  );
};

const DNSRecordRow = ({ 
  record, 
  onUpdate, 
  onDelete, 
  isSelected, 
  onSelect 
}: { 
  record: DNSRecord, 
  onUpdate: (r: Partial<DNSRecord>) => void, 
  onDelete: () => void,
  isSelected: boolean,
  onSelect: (id: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState(record);

  if (isEditing) {
    return (
      <tr className="border-b bg-[#f0f2f5]/30 dark:bg-[#2a3942]/5">
        <td className="p-2 sm:p-4 text-center">
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={() => onSelect(record.id)}
            className="w-4 h-4 rounded border-[#e9edef] dark:border-[#2a3942] text-[#00a884] focus:ring-[#00a884] cursor-pointer"
          />
        </td>
        <td className="p-2 sm:p-4"><input value={edited.type} onChange={e => setEdited({...edited, type: e.target.value})} className="w-full sm:w-16 p-2 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-xs font-bold text-[#00a884] outline-none" /></td>
        <td className="p-2 sm:p-4"><input value={edited.name} onChange={e => setEdited({...edited, name: e.target.value})} className="w-full p-2 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-xs sm:text-sm text-[#3b4a54] dark:text-[#e9edef] outline-none focus:ring-1 focus:ring-[#00a884]" /></td>
        <td className="p-2 sm:p-4"><input value={edited.content} onChange={e => setEdited({...edited, content: e.target.value})} className="w-full p-2 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-xs sm:text-sm text-[#3b4a54] dark:text-[#e9edef] outline-none focus:ring-1 focus:ring-[#00a884]" /></td>
        <td className="p-2 sm:p-4">
          <select 
            value={edited.proxied ? 'true' : 'false'} 
            onChange={e => setEdited({...edited, proxied: e.target.value === 'true'})}
            className="w-full p-2 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[10px] font-bold uppercase dark:text-gray-300 outline-none"
          >
            <option value="true">Proxied</option>
            <option value="false">DNS Only</option>
          </select>
        </td>
        <td className="p-2 sm:p-4 text-center">
          <div className="flex gap-2 justify-center">
            <button onClick={() => { onUpdate(edited); setIsEditing(false); }} className="text-[#00a884] hover:bg-green-50 dark:hover:bg-green-950/20 p-2 rounded-full transition-all"><Check className="w-5 h-5 stroke-[3px]" /></button>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a3942] p-2 rounded-full transition-all"><X className="w-4 h-4 stroke-[3px]" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={cn(
      "border-b dark:border-[#2a3942] hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/50 transition-colors group",
      isSelected && "bg-[#d9fdd3]/30 dark:bg-[#00a884]/5"
    )}>
      <td className="p-3 sm:p-4 text-center">
        <input 
          type="checkbox" 
          checked={isSelected} 
          onChange={() => onSelect(record.id)}
          className="w-4 h-4 rounded border-[#e9edef] dark:border-[#2a3942] text-[#00a884] focus:ring-[#00a884] cursor-pointer"
        />
      </td>
      <td className="p-3 sm:p-4"><span className="px-2 py-1 bg-[#f0f2f5] dark:bg-[#2a3942] rounded text-[10px] font-bold text-[#667781] dark:text-[#aebac1] uppercase tracking-wider">{record.type}</span></td>
      <td className="p-3 sm:p-4 font-medium text-[#111b21] dark:text-[#e9edef] text-sm sm:text-base">{record.name}</td>
      <td className="p-3 sm:p-4 text-[#667781] dark:text-[#aebac1] font-medium truncate max-w-[120px] sm:max-w-[300px] text-xs sm:text-sm">{record.content}</td>
      <td className="p-3 sm:p-4">
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
          record.proxied ? "bg-[#d9fdd3] text-[#008069] dark:bg-[#00a884]/20 dark:text-[#00a884]" : "bg-[#f0f2f5] text-[#667781] dark:bg-[#2a3942] dark:text-[#aebac1]"
        )}>
          {record.proxied ? 'Proxied' : 'DNS'}
        </span>
      </td>
      <td className="p-3 sm:p-4 text-center">
        <div className="flex gap-2 justify-center">
          <button 
            onClick={() => setIsEditing(true)} 
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-[#e9edef] dark:border-[#2a3942] text-[#00a884] hover:bg-[#00a884] hover:text-white transition-all active:scale-95"
          >
            Edit
          </button>
          <button 
            onClick={onDelete} 
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-[#e9edef] dark:border-[#2a3942] text-[#f15c5c] hover:bg-[#f15c5c] hover:text-white transition-all active:scale-95"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dnsFilter, setDnsFilter] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void,
    confirmText?: string,
    type?: 'danger' | 'info'
  } | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setConfirmModal({
      isOpen: true,
      title: 'Switch Theme',
      message: `Switch to ${newTheme} mode? Your preference will be saved.`,
      confirmText: `Switch`,
      type: 'info',
      onConfirm: async () => {
        setTheme(newTheme);
        if (isLoggedIn) {
          try {
            await userService.updateTheme(newTheme);
            setToast({ message: `Theme updated`, type: 'success' });
          } catch (err) {
            setToast({ message: 'Failed to save preference', type: 'error' });
          }
        }
        setConfirmModal(null);
      }
    });
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadUsers();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedUser) {
      setSelectedRecords([]);
      loadDNS(selectedUser);
    }
  }, [selectedUser]);

  const handleBulkDelete = async () => {
    if (!selectedUser || !selectedUser.zone_id || selectedRecords.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Records',
      message: `Are you sure you want to delete ${selectedRecords.length} selected DNS records from Cloudflare? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setIsBulkDeleting(true);
        setConfirmModal(null);
        let successCount = 0;
        let failCount = 0;

        for (const recordId of selectedRecords) {
          try {
            await cfService.deleteDNSRecord(selectedUser.zone_id, recordId, selectedUser.cf_token);
            successCount++;
          } catch (err) {
            failCount++;
          }
        }

        if (successCount > 0) {
          setRecords(records.filter(r => !selectedRecords.includes(r.id)));
          setSelectedRecords([]);
          setToast({ message: `Successfully deleted ${successCount} records`, type: 'success' });
        }
        
        if (failCount > 0) {
          setToast({ message: `Failed to delete ${failCount} records`, type: 'error' });
        }

        setIsBulkDeleting(false);
      }
    });
  };

  const loadUsers = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      setToast({ message: 'Failed to fetch clients', type: 'error' });
    }
  };

  const loadDNS = async (user: User) => {
    setIsLoading(true);
    setError(null);
    if (!user.zone_id) {
      setError('Zone ID is missing.');
      setIsLoading(false);
      return;
    }
    try {
      const dnsRecords = await cfService.getDNSRecords(user.zone_id, user.cf_token);
      setRecords(dnsRecords);
    } catch (err: any) {
      setError('Failed to fetch records from Cloudflare.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpsertUser = async (u: User | Omit<User, 'id'>) => {
    const isEdit = 'id' in u;
    setConfirmModal({
      isOpen: true,
      title: isEdit ? 'Update Client' : 'Add Client',
      message: isEdit ? `Update profile for "${u.name}"?` : `Add "${u.name}" to clients list?`,
      confirmText: 'Confirm',
      type: 'info',
      onConfirm: async () => {
        try {
          if (isEdit) {
            const updatedUser = await userService.updateUser(u as User);
            setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
            if (selectedUser?.id === updatedUser.id) setSelectedUser(updatedUser);
            setToast({ message: 'Client updated', type: 'success' });
          } else {
            const newUser = await userService.addUser(u);
            setUsers([newUser, ...users]);
            setToast({ message: 'Client added', type: 'success' });
          }
        } catch (err) {
          setToast({ message: 'Operation failed', type: 'error' });
        }
        setConfirmModal(null);
        setUserToEdit(null);
        setIsAddUserOpen(false);
      }
    });
  };

  const handleDeleteUser = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Client',
      message: 'Are you sure you want to remove this client? This will not affect their Cloudflare account.',
      onConfirm: async () => {
        try {
          await userService.deleteUser(id);
          setUsers(users.filter(u => u.id !== id));
          if (selectedUser?.id === id) setSelectedUser(null);
          setToast({ message: 'Client removed', type: 'success' });
        } catch (err) {
          setToast({ message: 'Failed to delete', type: 'error' });
        }
        setConfirmModal(null);
      }
    });
  };

  const handleUpdateRecord = async (recordId: string, data: Partial<DNSRecord>) => {
    if (!selectedUser || !selectedUser.zone_id) return;
    setConfirmModal({
      isOpen: true,
      title: 'Update Record',
      message: `Save changes to this DNS record?`,
      confirmText: 'Save',
      type: 'info',
      onConfirm: async () => {
        try {
          await cfService.updateDNSRecord(selectedUser!.zone_id, recordId, data, selectedUser!.cf_token);
          setRecords(records.map(r => r.id === recordId ? { ...r, ...data } : r));
          setToast({ message: 'DNS Updated', type: 'success' });
        } catch (err) {
          setToast({ message: 'Update failed', type: 'error' });
        }
        setConfirmModal(null);
      }
    });
  };

  const handleCreateRecord = async (data: Omit<DNSRecord, 'id'>) => {
    if (!selectedUser || !selectedUser.zone_id) return;
    setConfirmModal({
      isOpen: true,
      title: 'Add Record',
      message: `Add this record to Cloudflare?`,
      confirmText: 'Add',
      type: 'info',
      onConfirm: async () => {
        try {
          await cfService.createDNSRecord(selectedUser!.zone_id, data, selectedUser!.cf_token);
          setIsAddingRecord(false);
          loadDNS(selectedUser!);
          setToast({ message: 'DNS Record Added', type: 'success' });
        } catch (err) {
          setToast({ message: 'Failed to add', type: 'error' });
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!selectedUser || !selectedUser.zone_id) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete DNS Record',
      message: 'Are you sure? This will remove the record from Cloudflare.',
      onConfirm: async () => {
        try {
          await cfService.deleteDNSRecord(selectedUser!.zone_id, recordId, selectedUser!.cf_token);
          setRecords(records.filter(r => r.id !== recordId));
          setToast({ message: 'Record deleted', type: 'success' });
        } catch (err) {
          setToast({ message: 'Delete failed', type: 'error' });
        }
        setConfirmModal(null);
      }
    });
  };



  const handleUpdatePassword = async (newPass: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Update Password',
      message: 'Change your admin login password?',
      confirmText: 'Update',
      type: 'info',
      onConfirm: async () => {
        try {
          await userService.updatePassword(newPass);
          setToast({ message: 'Password updated', type: 'success' });
        } catch (err) {
          setToast({ message: 'Update failed', type: 'error' });
        }
        setConfirmModal(null);
        setIsSettingsOpen(false);
      }
    });
  };

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} setTheme={setTheme} />;

  return (
    <div className="flex h-screen bg-[#f0f2f5] dark:bg-[#0b141a] overflow-hidden transition-colors duration-300 font-sans">
      {/* Sidebar - WhatsApp Styled */}
      <div className={cn(
        "w-full md:w-[400px] flex flex-col bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#2a3942] transition-all shrink-0",
        isMobileView && selectedUser && "hidden"
      )}>
        {/* Sidebar Header */}
        <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 flex justify-between items-center shrink-0 border-b border-gray-200 dark:border-gray-700">
          <h1 className="font-bold text-[#111b21] dark:text-[#e9edef] text-lg tracking-tight">Cloudflare Manager</h1>
          <div className="flex gap-1 md:gap-2 text-[#54656f] dark:text-[#aebac1]">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90" title="Theme">
              {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6 text-[#00a884]" />}
            </button>
            <button onClick={() => { setUserToEdit(null); setIsAddUserOpen(true); }} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90" title="Add Client">
              <Plus className="w-6 h-6" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90" title="Settings">
              <Settings className="w-6 h-6" />
            </button>
            <button onClick={() => setIsLoggedIn(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90" title="Logout">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 bg-white dark:bg-[#111b21]">
          <div className="relative flex items-center bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg px-3 group">
            <Search className="w-4 h-4 text-[#54656f] dark:text-[#aebac1] group-focus-within:text-[#00a884] transition-colors" />
            <input 
              className="w-full bg-transparent p-2 outline-none text-sm font-medium text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781]"
              placeholder="Search or start new chat"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
          {users.length === 0 ? (
            <div className="p-12 text-center text-[#667781] dark:text-[#aebac1]">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No clients initialized yet</p>
            </div>
          ) : (
            users
              .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.website.toLowerCase().includes(search.toLowerCase()))
              .map(user => (
              <div 
                key={user.id} 
                onClick={() => setSelectedUser(user)}
                className={cn(
                  "flex items-center gap-4 p-3 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942]/50 transition-all border-b border-[#f0f2f5] dark:border-[#2a3942] group relative",
                  selectedUser?.id === user.id && "bg-[#f0f2f5] dark:bg-[#2a3942]"
                )}
              >

                <div className="flex-1 min-w-0 border-b-none py-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-medium text-[#111b21] dark:text-[#e9edef] truncate">{user.name}</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#667781] dark:text-[#aebac1] truncate flex items-center gap-1.5 leading-none">
                      <Globe className="w-3.5 h-3.5 opacity-50" /> {user.website}
                    </p>
                    <div className="flex gap-2 transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setUserToEdit(user); setIsAddUserOpen(true); }}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-[#00a884]/10 text-[#00a884] border border-[#00a884]/20 hover:bg-[#00a884] hover:text-white transition-all whitespace-nowrap"
                      >
                        Edit user
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-red-50/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden",
        isMobileView && !selectedUser && "hidden"
      )}>
        <div 
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}
        ></div>

        {selectedUser ? (
          <>
            {/* Main Header */}
            <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 flex items-center justify-between border-b border-[#e9edef] dark:border-[#2a3942] relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                {isMobileView && (
                  <button onClick={() => setSelectedUser(null)} className="p-2 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 rounded-full shrink-0">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                )}

                <div className="min-w-0">
                  <h3 className="font-medium text-[#111b21] dark:text-[#e9edef] leading-tight truncate text-sm sm:text-base tracking-tight">{selectedUser.name}</h3>
                  <p className="text-[11px] text-[#667781] dark:text-[#aebac1] leading-none mt-1 truncate">{selectedUser.website}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => loadDNS(selectedUser)} className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 rounded-full p-2 active:rotate-180 duration-500" title="Refresh DNS">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 sm:p-6 relative z-10 overflow-y-auto space-y-4 max-w-6xl mx-auto w-full">
              <div className="bg-white dark:bg-[#111b21] rounded-lg shadow-sm flex flex-col border border-[#e9edef] dark:border-[#2a3942] min-h-fit">
                <div className="p-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#2a3942] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="font-medium text-[#008069] dark:text-[#00a884] flex items-center gap-2 text-base tracking-tight italic">DNS Management Zone</h2>
                    {selectedRecords.length > 0 && (
                      <button 
                        onClick={handleBulkDelete}
                        disabled={isBulkDeleting}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 shadow-sm animate-in zoom-in duration-300 disabled:opacity-50"
                      >
                        {isBulkDeleting ? 'Deleting...' : `Delete (${selectedRecords.length})`}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-md">
                    <div className="relative flex-1 group">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667781] group-focus-within:text-[#00a884] transition-colors" />
                      <input 
                        className="w-full bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] focus:border-[#00a884] rounded-lg p-2 pl-9 text-xs sm:text-sm font-medium text-[#111b21] dark:text-[#e9edef] outline-none transition-all"
                        placeholder="Filter records..."
                        value={dnsFilter}
                        onChange={e => setDnsFilter(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddingRecord(true)}
                      className="bg-[#00a884] text-white px-4 py-2 rounded font-medium text-xs hover:bg-[#06cf9c] transition-all active:scale-95 uppercase tracking-wide shrink-0 shadow-sm"
                    >
                      Add Record
                    </button>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="p-20 flex flex-col items-center justify-center text-[#667781] dark:text-[#aebac1]">
                    <div className="w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-medium">Fetching DNS Zone data...</p>
                  </div>
                ) : error ? (
                  <div className="p-20 text-center">
                    <div className="bg-red-50 dark:bg-red-950/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-red-500 font-medium mb-6 text-sm">{error}</p>
                    <button onClick={() => loadDNS(selectedUser)} className="px-6 py-2 bg-[#3b4a54] text-white rounded font-medium text-sm hover:bg-[#111b21] transition-colors">Retry Connection</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-[#f0f2f5]/50 dark:bg-[#202c33]/50 text-[#667781] dark:text-[#aebac1] uppercase text-[10px] font-bold tracking-widest border-b border-[#e9edef] dark:border-[#2a3942] sticky top-0 z-20">
                        <tr>
                          <th className="p-4 w-10 text-center border-r dark:border-[#2a3942]">
                            <input 
                              type="checkbox" 
                              checked={records.length > 0 && selectedRecords.length === records.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRecords(records.map(r => r.id));
                                } else {
                                  setSelectedRecords([]);
                                }
                              }}
                              className="w-4 h-4 rounded border-[#e9edef] dark:border-[#2a3942] text-[#00a884] focus:ring-[#00a884] cursor-pointer"
                            />
                          </th>
                          <th className="p-4 font-medium border-r dark:border-[#2a3942]">Type</th>
                          <th className="p-4 font-medium border-r dark:border-[#2a3942]">Name</th>
                          <th className="p-4 font-medium border-r dark:border-[#2a3942]">Content</th>
                          <th className="p-4 font-medium border-r dark:border-[#2a3942]">Status</th>
                          <th className="p-4 font-medium text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f2f5] dark:divide-[#2a3942]">
                        {isAddingRecord && (
                          <NewDNSRecordRow 
                            onAdd={handleCreateRecord} 
                            onCancel={() => setIsAddingRecord(false)} 
                          />
                        )}
                        {records
                          .filter(r => 
                            r.name.toLowerCase().includes(dnsFilter.toLowerCase()) || 
                            r.content.toLowerCase().includes(dnsFilter.toLowerCase()) ||
                            r.type.toLowerCase().includes(dnsFilter.toLowerCase())
                          )
                          .map(record => (
                          <DNSRecordRow 
                            key={record.id} 
                            record={record} 
                            isSelected={selectedRecords.includes(record.id)}
                            onSelect={(id) => {
                              setSelectedRecords(prev => 
                                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                              );
                            }}
                            onUpdate={(data) => handleUpdateRecord(record.id, data)}
                            onDelete={() => handleDeleteRecord(record.id)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f8f9fa] dark:bg-[#0b141a]">
            <h2 className="text-3xl sm:text-5xl font-black text-[#41525d] dark:text-[#e9edef] mb-4 uppercase tracking-tighter">Cloudflare Manager</h2>
            <p className="text-[#667781] dark:text-[#aebac1] max-w-md leading-relaxed text-sm sm:text-base px-4">
              Select a client to manage their Cloudflare DNS records. Your connection is secured via encrypted API proxy.
            </p>
            <div className="mt-12 flex items-center gap-2 text-[#8696a0] font-medium uppercase tracking-widest text-[10px] bg-white dark:bg-[#202c33] px-6 py-2 rounded-full border border-[#e9edef] dark:border-[#2a3942] shadow-sm">
              <Lock className="w-4 h-4" /> Secure End-to-End
            </div>
          </div>
        )}
      </div>

      <UserDialog 
        isOpen={isAddUserOpen} 
        userToEdit={userToEdit}
        onClose={() => { setIsAddUserOpen(false); setUserToEdit(null); }} 
        onAdd={handleUpsertUser} 
      />
      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleUpdatePassword} 
      />

      {confirmModal && (
        <ConfirmModal 
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
