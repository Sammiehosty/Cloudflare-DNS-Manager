import React, { useState, useEffect } from 'react';
import { 
  Settings,
  Plus,
  Globe,
  Search,
  LogOut,
  X,
  Check,
  Key,
  ArrowLeft,
  Users,
  AlertCircle,
  Filter,
  Lock,
  Sun,
  Moon,
  Zap,
  Shield,
  Monitor
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
      "fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-[0_2px_5px_rgba(11,20,26,0.1)] z-[500] flex items-center gap-4 animate-in slide-in-from-top-10 fade-in duration-500 min-w-[300px] max-w-[90vw] border border-[#e9edef] bg-white dark:bg-[#202c33] dark:border-[#2a3942]"
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
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-[1px] flex items-center justify-center z-[450] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#3b4a54] rounded-lg w-full max-w-sm overflow-hidden shadow-[0_24px_40px_rgba(11,20,26,0.2)] scale-in-center border-none">
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

const ClientRegistration = ({ onBack }: { onBack: () => void }) => {
  const [form, setForm] = useState({ name: '', website: '', zone_id: '', cf_token: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const result = await userService.registerClient(form);
    if (result.success) {
      setStatus({ type: 'success', msg: 'Profile submitted! Your administrator will review it shortly.' });
      setForm({ name: '', website: '', zone_id: '', cf_token: '' });
    } else {
      setStatus({ type: 'error', msg: result.error || 'Submission failed. Check your data and try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-center p-4 font-sans relative">
      <div className="absolute top-0 left-0 w-full h-[220px] bg-[#008069] z-0"></div>
      <div className="w-full max-w-[450px] relative z-10 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white dark:bg-[#202c33] rounded shadow-xl overflow-hidden">
          <div className="bg-[#008069] dark:bg-[#202c33] p-6 text-white flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-black/10 rounded-full transition-colors"><ArrowLeft /></button>
            <h2 className="text-xl font-medium">Submit Cloudflare Info</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {status && (
              <div className={cn("p-4 rounded-lg text-sm font-medium", status.type === 'success' ? "bg-green-50 text-[#008069]" : "bg-red-50 text-red-500")}>
                {status.msg}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#008069] uppercase tracking-wider">Full Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] outline-none text-[#3b4a54] dark:text-[#e9edef]" placeholder="John Doe" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#008069] uppercase tracking-wider">Domain Name</label>
                <input required value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="w-full p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] outline-none text-[#3b4a54] dark:text-[#e9edef]" placeholder="example.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#008069] uppercase tracking-wider">Cloudflare Zone ID</label>
                <input required value={form.zone_id} onChange={e => setForm({...form, zone_id: e.target.value})} className="w-full p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] outline-none text-[#3b4a54] dark:text-[#e9edef] font-mono text-xs" placeholder="32-char hex string" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#008069] uppercase tracking-wider">Cloudflare API Token</label>
                <input required type="password" value={form.cf_token} onChange={e => setForm({...form, cf_token: e.target.value})} className="w-full p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] outline-none text-[#3b4a54] dark:text-[#e9edef]" placeholder="••••••••••••" />
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full bg-[#00a884] hover:bg-[#06cf9c] text-white font-bold py-3 rounded shadow-md transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Login = ({ onLogin, setTheme, onGoToRegistration }: { onLogin: () => void, setTheme: (t: 'light' | 'dark') => void, onGoToRegistration: () => void }) => {
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
        setError('Invalid administrator key');
      }
    } catch (err) {
      setError('Connection refused by server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-center p-4 font-sans relative">
      <div className="absolute top-0 left-0 w-full h-[220px] bg-[#00a884] z-0"></div>
      
      <div className="w-full max-w-[400px] relative z-10">
        <div className="bg-white dark:bg-[#202c33] rounded shadow-[0_17px_50px_0_rgba(0,0,0,0.19),0_12px_15px_0_rgba(0,0,0,0.24)] p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-[#00a884] p-4 rounded-full shadow-sm mb-6 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.95 13.911c.05-.286.05-.566.05-.85 0-3.352-2.73-6.071-6.096-6.071-.161 0-.311.025-.472.038C15.42 4.195 12.95 2 10.021 2 6.55 2 3.74 4.805 3.74 8.261c0 .285.025.566.062.838A5.378 5.378 0 001 14.33c0 2.96 2.41 5.36 5.385 5.36h14.155c1.928 0 3.46-1.536 3.46-3.447a3.42 3.42 0 00-1.05-2.332z"/>
              </svg>
            </div>
            <h1 className="text-[28px] font-light text-[#41525d] dark:text-[#e9edef] mb-2 tracking-tight">Cloudflare Manager</h1>
            <p className="text-sm text-[#667781] dark:text-[#aebac1] leading-relaxed">
             Centralized DNS control and client management. Manage global infrastructure, optimize zone records, and maintain enterprise security through a secure, responsive dashboard.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-0 py-2 bg-transparent border-b-2 border-[#e9edef] dark:border-[#2a3942] focus:border-[#00a884] outline-none transition-all text-[#3b4a54] dark:text-[#e9edef] text-center text-xl font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal placeholder:text-sm"
                placeholder="Enter Administrator Key"
                required
              />
            </div>
            
            {error && (
              <p className="text-[#f15c5c] text-xs font-bold text-center animate-in shake duration-300">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00a884] hover:bg-[#06cf9c] text-white font-bold py-3 rounded shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Login to Dashboard</>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center space-y-4">
            <button 
              onClick={onGoToRegistration}
              className="text-[#00a884] text-xs font-bold hover:underline uppercase tracking-wider"
            >
              Submit Client Info
            </button>
            <p className="text-[10px] text-[#8696a0] uppercase tracking-widest font-bold block pt-4 border-t border-[#f0f2f5] dark:border-[#2a3942]">
              Protected by Sammie Hosty
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-[300] p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#111b21] w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg overflow-hidden shadow-2xl flex flex-col scale-in-center">
        <div className="bg-[#008069] dark:bg-[#202c33] text-white p-5 flex items-center gap-4 shrink-0 shadow-sm">
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors outline-none"><ArrowLeft className="w-6 h-6" /></button>
          <h3 className="font-medium text-lg">{userToEdit ? 'Client info' : 'New Client'}</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-[#f0f2f5] dark:bg-[#0b141a] scrollbar-none">
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-white dark:bg-[#202c33] p-6 rounded-lg shadow-sm border border-[#e9edef] dark:border-[#2a3942] space-y-6">
              <div className="space-y-1 group">
                <label className="text-xs font-medium text-[#008069] dark:text-[#00a884] uppercase tracking-wider">Client Name</label>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#8696a0]" />
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all text-[#3b4a54] dark:text-[#e9edef] font-medium"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              <div className="space-y-1 group">
                <label className="text-xs font-medium text-[#008069] dark:text-[#00a884] uppercase tracking-wider">Website Domain</label>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-[#8696a0]" />
                  <input 
                    value={website} 
                    onChange={e => setWebsite(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all text-[#3b4a54] dark:text-[#e9edef] font-medium"
                    placeholder="example.com"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#202c33] p-6 rounded-lg shadow-sm border border-[#e9edef] dark:border-[#2a3942] space-y-6">
              <div className="space-y-1 group">
                <label className="text-xs font-medium text-[#008069] dark:text-[#00a884] uppercase tracking-wider">Cloudflare Zone ID</label>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#8696a0]" />
                  <input 
                    value={zoneId} 
                    onChange={e => setZoneId(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all font-mono text-sm dark:text-[#e9edef]"
                    placeholder="32-char hex ID"
                  />
                </div>
              </div>

              <div className="space-y-1 group">
                <label className="text-xs font-medium text-[#008069] dark:text-[#00a884] uppercase tracking-wider">API Token</label>
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-[#8696a0]" />
                  <input 
                    type="password"
                    value={token} 
                    onChange={e => setToken(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all text-[#3b4a54] dark:text-[#e9edef] font-medium"
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
                  onClose();
                }}
                className="bg-[#00a884] text-white px-12 py-3 rounded-full font-bold shadow-md hover:bg-[#06cf9c] active:scale-95 transition-all uppercase tracking-wide text-xs"
              >
                {userToEdit ? 'Save Changes' : 'Initialize Client'}
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-[300] p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#111b21] w-full max-w-sm h-full sm:h-auto sm:rounded-lg overflow-hidden shadow-2xl flex flex-col scale-in-center">
        <div className="bg-[#008069] dark:bg-[#202c33] text-white p-5 flex items-center gap-4 shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
          <h3 className="font-medium text-lg">Settings</h3>
        </div>
        <div className="p-8 space-y-8 bg-[#f0f2f5] dark:bg-[#0b141a] flex-1">
          <div className="bg-white dark:bg-[#202c33] p-6 rounded-lg shadow-sm border border-[#e9edef] dark:border-[#2a3942] space-y-4 text-center">
            <label className="text-xs font-bold text-[#008069] dark:text-[#00a884] block mb-2 uppercase tracking-widest">Administrator Key</label>
            <input 
              type="password"
              value={newPass} 
              onChange={e => setNewPass(e.target.value)}
              className="w-full p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] outline-none transition-all text-center text-2xl font-bold dark:text-[#e9edef]"
              placeholder="••••••••••••"
            />
          </div>
          <button 
            onClick={() => { onSave(newPass); onClose(); }}
            className="w-full bg-[#00a884] text-white py-4 rounded-full font-bold shadow-lg hover:bg-[#06cf9c] active:scale-95 transition-all uppercase tracking-wide text-xs"
          >
            Update Key
          </button>
        </div>
      </div>
    </div>
  );
};

const BulkUpdateDialog = ({ isOpen, onClose, onUpdate, isProcessing, count }: { isOpen: boolean, onClose: () => void, onUpdate: (ip: string, options: { mail: boolean, root: boolean }) => void, isProcessing: boolean, count: number }) => {
  const [ip, setIp] = useState('');
  const [options, setOptions] = useState({ mail: true, root: false });
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-[350] p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#111b21] w-full max-w-md h-full sm:h-auto sm:rounded-lg overflow-hidden shadow-2xl flex flex-col scale-in-center">
        <div className="bg-[#008069] dark:bg-[#202c33] text-white p-5 flex items-center gap-4 shrink-0 shadow-sm">
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors outline-none"><ArrowLeft className="w-6 h-6" /></button>
          <h3 className="font-medium text-lg">Bulk Update ({count})</h3>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#f0f2f5] dark:bg-[#0b141a] p-6 space-y-6 scrollbar-none">
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-[#667781] dark:text-[#aebac1] uppercase tracking-widest ml-1">Target Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setOptions(prev => ({ ...prev, mail: !prev.mail }))}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left group relative",
                  options.mail ? "border-[#00a884] bg-white dark:bg-[#202c33] shadow-sm" : "border-transparent bg-[#e9edef] dark:bg-[#2a3942] opacity-60"
                )}
              >
                {options.mail && <Check className="absolute top-2 right-2 w-3 h-3 text-[#00a884]" />}
                <p className="font-bold text-sm dark:text-white">Mail</p>
                <p className="text-[10px] text-[#667781] dark:text-[#aebac1] mt-0.5 leading-tight">mail/webmail A</p>
              </button>
              <button 
                onClick={() => setOptions(prev => ({ ...prev, root: !prev.root }))}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left group relative",
                  options.root ? "border-[#00a884] bg-white dark:bg-[#202c33] shadow-sm" : "border-transparent bg-[#e9edef] dark:bg-[#2a3942] opacity-60"
                )}
              >
                {options.root && <Check className="absolute top-2 right-2 w-3 h-3 text-[#00a884]" />}
                <p className="font-bold text-sm dark:text-white">Root @</p>
                <p className="text-[10px] text-[#667781] dark:text-[#aebac1] mt-0.5 leading-tight">main/www A</p>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#202c33] p-6 rounded-lg shadow-sm border border-[#e9edef] dark:border-[#2a3942] space-y-4">
            <label className="text-xs font-bold text-[#008069] dark:text-[#00a884] uppercase tracking-widest">New Target IP</label>
            <input 
              value={ip} 
              onChange={e => setIp(e.target.value)}
              disabled={isProcessing}
              className="w-full p-2 bg-transparent border-b-2 border-[#f0f2f5] dark:border-[#2a3942] focus:border-[#008069] dark:focus:border-[#00a884] outline-none transition-all text-xl font-bold dark:text-[#e9edef]"
              placeholder="0.0.0.0"
            />
          </div>

          <div className="p-4 flex justify-center">
            <button 
              onClick={() => onUpdate(ip, options)}
              disabled={isProcessing || !ip || (!options.mail && !options.root)}
              className="bg-[#00a884] text-white px-12 py-3 rounded-full font-bold shadow-md hover:bg-[#06cf9c] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Zap className="w-4 h-4 fill-current" />}
              {isProcessing ? 'Updating...' : 'Migrate IP'}
            </button>
          </div>
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
    <tr className="border-b bg-[#d9fdd3]/20 dark:bg-[#00a884]/5 animate-in fade-in slide-in-from-top-1 duration-300">
      <td className="p-1.5 md:p-2 border-r dark:border-[#2a3942]"></td>
      <td className="p-1.5 md:p-2">
        <select 
          value={newRecord.type} 
          onChange={e => setNewRecord({...newRecord, type: e.target.value})} 
          className="w-full sm:w-20 p-1 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[10px] font-bold text-[#00a884] outline-none"
        >
          {['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'SRV', 'NS'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td className="p-1.5 md:p-2"><input placeholder="Name" value={newRecord.name} onChange={e => setNewRecord({...newRecord, name: e.target.value})} className="w-full p-1 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[11px] font-medium text-[#3b4a54] dark:text-[#e9edef] outline-none focus:ring-1 focus:ring-[#00a884]" /></td>
      <td className="p-1.5 md:p-2"><input placeholder="Content" value={newRecord.content} onChange={e => setNewRecord({...newRecord, content: e.target.value})} className="w-full p-1 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[11px] font-medium text-[#3b4a54] dark:text-[#e9edef] outline-none focus:ring-1 focus:ring-[#00a884]" /></td>
      <td className="p-1.5 md:p-2">
        <select 
          value={newRecord.proxied ? 'true' : 'false'} 
          onChange={e => setNewRecord({...newRecord, proxied: e.target.value === 'true'})}
          className="w-full p-1 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[9px] font-bold uppercase dark:text-[#aebac1] outline-none"
        >
          <option value="true">Proxied</option>
          <option value="false">DNS Only</option>
        </select>
      </td>
      <td className="p-1.5 md:p-2 flex gap-2 justify-center">
        <button onClick={() => onAdd(newRecord)} className="text-[#00a884] hover:bg-green-50 dark:hover:bg-green-950/20 p-1.5 rounded-full transition-all active:scale-90"><Check className="w-4 h-4 stroke-[3px]" /></button>
        <button onClick={onCancel} className="text-[#f15c5c] hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-full transition-all active:scale-90"><X className="w-4 h-4 stroke-[3px]" /></button>
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
      <tr className="border-b bg-[#d9fdd3]/20 dark:bg-[#00a884]/5">
        <td className="p-1.5 md:p-2 text-center border-r dark:border-[#2a3942]">
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(record.id)} className="w-3.5 h-3.5 rounded-full border-2 border-[#adb5bd] text-[#00a884] focus:ring-[#00a884] cursor-pointer" />
        </td>
        <td className="p-1.5 md:p-2"><input value={edited.type} onChange={e => setEdited({...edited, type: e.target.value})} className="w-14 p-1 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[9px] font-bold text-[#00a884] outline-none" /></td>
        <td className="p-1.5 md:p-2"><input value={edited.name} onChange={e => setEdited({...edited, name: e.target.value})} className="w-full p-1 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[11px] font-medium text-[#3b4a54] dark:text-[#e9edef] outline-none focus:ring-1 focus:ring-[#00a884]" /></td>
        <td className="p-1.5 md:p-2"><input value={edited.content} onChange={e => setEdited({...edited, content: e.target.value})} className="w-full p-1 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[11px] font-medium text-[#3b4a54] dark:text-[#e9edef] outline-none focus:ring-1 focus:ring-[#00a884]" /></td>
        <td className="p-1.5 md:p-2">
          <select 
            value={edited.proxied ? 'true' : 'false'} 
            onChange={e => setEdited({...edited, proxied: e.target.value === 'true'})}
            className="w-full p-1 border border-[#e9edef] dark:border-[#2a3942] rounded bg-white dark:bg-[#202c33] text-[8px] font-bold uppercase dark:text-[#aebac1] outline-none"
          >
            <option value="true">Proxied</option>
            <option value="false">DNS Only</option>
          </select>
        </td>
        <td className="p-1.5 md:p-2 flex gap-1 justify-center">
          <button onClick={() => { onUpdate(edited); setIsEditing(false); }} className="text-[#00a884] hover:bg-green-50 dark:hover:bg-green-950/20 p-1 rounded-full transition-all active:scale-90"><Check className="w-4 h-4 stroke-[3px]" /></button>
          <button onClick={() => setIsEditing(false)} className="text-[#667781] hover:bg-gray-100 dark:hover:bg-[#2a3942] p-1 rounded-full transition-all active:scale-90"><X className="w-4 h-4 stroke-[3px]" /></button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={cn(
      "border-b dark:border-[#2a3942] hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/50 transition-colors group",
      isSelected && "bg-[#d9fdd3]/20 dark:bg-[#00a884]/5"
    )}>
      <td className="p-1.5 md:p-2 text-center border-r dark:border-[#2a3942]">
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(record.id)} className="w-3.5 h-3.5 rounded-full border-2 border-[#adb5bd] dark:border-[#667781] text-[#00a884] focus:ring-[#00a884] cursor-pointer" />
      </td>
      <td className="p-1.5 md:p-2"><span className="px-1.5 py-0.5 bg-[#f0f2f5] dark:bg-[#2a3942] rounded text-[8px] font-bold text-[#667781] dark:text-[#aebac1] uppercase tracking-wider">{record.type}</span></td>
      <td className="p-1.5 md:p-2 font-bold text-[#111b21] dark:text-[#e9edef] tracking-tight text-[12px]">{record.name}</td>
      <td className="p-1.5 md:p-2 text-[#667781] dark:text-[#aebac1] font-medium truncate max-w-[150px] sm:max-w-[300px] text-[10px]">{record.content}</td>
      <td className="p-1.5 md:p-2">
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest whitespace-nowrap",
          record.proxied ? "bg-[#d9fdd3] text-[#008069] dark:bg-[#00a884]/20 dark:text-[#00a884]" : "bg-[#f0f2f5] text-[#667781] dark:bg-[#2a3942] dark:text-[#aebac1]"
        )}>
          {record.proxied ? 'Proxied' : 'DNS'}
        </span>
      </td>
      <td className="p-1.5 md:p-2 text-center">
        <div className="flex gap-1 justify-center">
          <button 
            onClick={() => setIsEditing(true)} 
            className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-full border border-[#e9edef] dark:border-[#2a3942] text-[#00a884] hover:bg-[#00a884] hover:text-white transition-all active:scale-95"
          >
            Edit
          </button>
          <button 
            onClick={onDelete} 
            className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-full border border-[#e9edef] dark:border-[#2a3942] text-[#f15c5c] hover:bg-[#f15c5c] hover:text-white transition-all active:scale-95"
          >
            Del
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function App() {
  const [view, setView] = useState<'login' | 'dashboard' | 'register'>('login');
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
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdatingIP, setIsBulkUpdatingIP] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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
        if (view === 'dashboard') {
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
    if (view === 'dashboard') {
      loadUsers();
    }
  }, [view]);

  useEffect(() => {
    if (selectedUser) {
      setSelectedRecords([]);
      loadDNS(selectedUser);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      setToast({ message: 'API Connection Error', type: 'error' });
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
      setError('Cloudflare refused the connection. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpsertUser = async (u: User | Omit<User, 'id'>) => {
    const isEdit = 'id' in u;
    setConfirmModal({
      isOpen: true,
      title: isEdit ? 'Update Client' : 'Initialize Client',
      message: isEdit ? `Apply changes to "${u.name}"?` : `Add "${u.name}" to the management list?`,
      confirmText: 'Confirm',
      type: 'info',
      onConfirm: async () => {
        try {
          if (isEdit) {
            const updatedUser = await userService.updateUser(u as User);
            setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
            if (selectedUser?.id === updatedUser.id) setSelectedUser(updatedUser);
            setToast({ message: 'Profile updated', type: 'success' });
          } else {
            const newUser = await userService.addUser(u);
            setUsers([newUser, ...users]);
            setToast({ message: 'Client initialized', type: 'success' });
          }
          setIsAddUserOpen(false);
          setUserToEdit(null);
        } catch (err: any) {
          const errMsg = err.response?.data?.error || 'Operation failed';
          setToast({ message: errMsg, type: 'error' });
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteUser = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Client',
      message: 'This will remove the client from this dashboard. No data will be deleted from Cloudflare.',
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
      message: `Publish changes to Cloudflare edge?`,
      confirmText: 'Publish',
      type: 'info',
      onConfirm: async () => {
        try {
          await cfService.updateDNSRecord(selectedUser!.zone_id, recordId, data, selectedUser!.cf_token);
          setRecords(records.map(r => r.id === recordId ? { ...r, ...data } : r));
          setToast({ message: 'DNS Synchronized', type: 'success' });
        } catch (err) {
          setToast({ message: 'Sync failed', type: 'error' });
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
      message: `Create new ${data.type} record for ${selectedUser.website}?`,
      confirmText: 'Create',
      type: 'info',
      onConfirm: async () => {
        try {
          await cfService.createDNSRecord(selectedUser!.zone_id, data, selectedUser!.cf_token);
          setIsAddingRecord(false);
          loadDNS(selectedUser!);
          setToast({ message: 'Record created', type: 'success' });
        } catch (err) {
          setToast({ message: 'Creation failed', type: 'error' });
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
      message: 'This will permanently remove the record from the Cloudflare zone.',
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

  const handleBulkDelete = async () => {
    if (!selectedUser || !selectedUser.zone_id || selectedRecords.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete',
      message: `Remove ${selectedRecords.length} records from Cloudflare?`,
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
          setToast({ message: `Removed ${successCount} records`, type: 'success' });
        }
        if (failCount > 0) setToast({ message: `${failCount} records failed`, type: 'error' });

        setIsBulkDeleting(false);
      }
    });
  };

  const handleUpdatePassword = async (newPass: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Update Key',
      message: 'Change your master admin key? You will need it for the next session.',
      confirmText: 'Update',
      type: 'info',
      onConfirm: async () => {
        try {
          await userService.updatePassword(newPass);
          setToast({ message: 'Key updated', type: 'success' });
        } catch (err) {
          setToast({ message: 'Update failed', type: 'error' });
        }
        setConfirmModal(null);
        setIsSettingsOpen(false);
      }
    });
  };

  const executeBulkIPUpdate = async (newIp: string, options: { mail: boolean, root: boolean }) => {
    if (selectedUsers.length === 0) return;
    setIsBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedUsers) {
      const user = users.find(u => u.id === userId);
      if (!user) continue;

      try {
        const dnsRecords = await cfService.getDNSRecords(user.zone_id, user.cf_token);
        const targetRecords = dnsRecords.filter(r => {
          if (r.type !== 'A') return false;
          const isMail = r.name === `mail.${user.website}` || r.name === `webmail.${user.website}`;
          const isRoot = r.name === user.website || r.name === `www.${user.website}`;
          if (options.mail && isMail) return true;
          if (options.root && isRoot) return true;
          return false;
        });

        for (const record of targetRecords) {
          await cfService.updateDNSRecord(user.zone_id, record.id, { content: newIp }, user.cf_token);
        }
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    setIsBulkProcessing(false);
    setIsBulkUpdatingIP(false);
    setSelectedUsers([]);
    setToast({ 
      message: `Global migration finished. Success: ${successCount}`, 
      type: successCount > 0 ? 'success' : 'error' 
    });
  };

  if (view === 'login') return <Login onLogin={() => setView('dashboard')} setTheme={setTheme} onGoToRegistration={() => setView('register')} />;
  if (view === 'register') return <ClientRegistration onBack={() => setView('login')} />;

  return (
    <div className="flex h-screen bg-[#f0f2f5] dark:bg-[#0b141a] overflow-hidden transition-colors duration-300 font-sans">
      {/* Sidebar - WhatsApp Styled */}
      <div className={cn(
        "w-full md:w-[400px] flex flex-col bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#2a3942] transition-all shrink-0",
        isMobileView && selectedUser && "hidden"
      )}>
        {/* Sidebar Header */}
        <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-3 md:px-4 flex justify-between items-center shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={users.length > 0 && selectedUsers.length === users.length}
              onChange={(e) => {
                if (e.target.checked) setSelectedUsers(users.map(u => u.id));
                else setSelectedUsers([]);
              }}
              className="w-5 h-5 rounded-full border-2 border-[#e9edef] dark:border-[#3b4a54] text-[#00a884] focus:ring-[#00a884] cursor-pointer transition-all accent-[#00a884]"
              title="Select All"
            />
            {selectedUsers.length > 0 ? (
              <button 
                onClick={() => setIsBulkUpdatingIP(true)}
                className="bg-[#00a884] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-in zoom-in duration-300 shadow-sm whitespace-nowrap"
              >
                IP Update ({selectedUsers.length})
              </button>
            ) : (
              <h1 className="font-bold text-[#111b21] dark:text-[#e9edef] text-base tracking-tight truncate max-w-[100px] md:max-w-none">Cloudflare Manager</h1>
            )}
          </div>
          <div className="flex gap-0.5 md:gap-1 text-[#54656f] dark:text-[#aebac1]">
            
            <button onClick={() => { setUserToEdit(null); setIsAddUserOpen(true); }} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90" title="Add Client">
              <Plus className="w-6 h-6" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90" title="Settings">
              <Settings className="w-6 h-6" />
            </button>
            <button onClick={() => setView('login')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90" title="Logout">
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
              placeholder="Search or start new manager"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21] scrollbar-none">
          {users.length === 0 ? (
            <div className="p-12 text-center text-[#667781] dark:text-[#aebac1]">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="text-sm font-medium">No clients added yet</p>
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
                <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center pr-1">
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => {
                      setSelectedUsers(prev => 
                        prev.includes(user.id) ? prev.filter(i => i !== user.id) : [...prev, user.id]
                      );
                    }}
                    className="w-5 h-5 rounded-full border-2 border-[#e9edef] dark:border-[#3b4a54] text-[#00a884] focus:ring-[#00a884] cursor-pointer transition-all accent-[#00a884]"
                  />
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-center mb-0">
                    <h4 className="font-bold text-[#111b21] dark:text-[#e9edef] truncate text-[13px] tracking-tight">{user.name}</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10.5px] text-[#667781] dark:text-[#aebac1] truncate flex items-center gap-1 leading-none">
                      <Globe className="w-3 h-3 opacity-50 shrink-0" /> {user.website}
                    </p>
                    <div className="flex gap-1 transition-all shrink-0 ml-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setUserToEdit(user); setIsAddUserOpen(true); }}
                        className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-[#00a884]/10 text-[#00a884] border border-[#00a884]/20 hover:bg-[#00a884] hover:text-white transition-all whitespace-nowrap"
                      >
                        Edit user
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                        className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-red-50/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
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
            <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 flex items-center justify-between border-b border-[#e9edef] dark:border-[#2a3942] relative z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {isMobileView && (
                  <button onClick={() => setSelectedUser(null)} className="p-2 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 rounded-full shrink-0">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-full bg-[#dfe5e7] dark:bg-[#2a3942] flex items-center justify-center text-[#54656f] dark:text-[#aebac1] font-bold shrink-0 shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-[#111b21] dark:text-[#e9edef] leading-tight truncate text-sm sm:text-base tracking-tight">{selectedUser.name}</h3>
                  <p className="text-[11px] text-[#667781] dark:text-[#aebac1] leading-none mt-1 truncate uppercase tracking-widest">{selectedUser.website}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => loadDNS(selectedUser)} className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 rounded-full p-2 active:rotate-180 duration-500" title="Refresh DNS">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-2 sm:p-4 relative z-10 overflow-y-auto space-y-3 max-w-6xl mx-auto w-full scrollbar-none">
              <div className="bg-white dark:bg-[#111b21] rounded shadow-[0_1px_3px_rgba(11,20,26,0.08)] flex flex-col border border-[#e9edef] dark:border-[#2a3942] min-h-fit">
                <div className="p-2 sm:p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#2a3942] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-medium text-[#008069] dark:text-[#00a884] flex items-center gap-2 text-base tracking-tight italic uppercase text-xs font-black">DNS Management Zone</h2>
                    {selectedRecords.length > 0 && (
                      <button 
                        onClick={handleBulkDelete}
                        disabled={isBulkDeleting}
                        className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 shadow-sm animate-in zoom-in duration-300 disabled:opacity-50"
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
                        placeholder="Filter list..."
                        value={dnsFilter}
                        onChange={e => setDnsFilter(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddingRecord(true)}
                      className="bg-[#00a884] text-white px-4 py-2 rounded font-medium text-xs hover:bg-[#06cf9c] transition-all active:scale-95 uppercase tracking-wide shrink-0 shadow-sm"
                    >
                      + New Record
                    </button>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="p-20 flex flex-col items-center justify-center text-[#667781] dark:text-[#aebac1]">
                    <div className="w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-medium">Syncing with Cloudflare Edge...</p>
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
                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-[#f0f2f5] dark:bg-[#202c33] text-[#667781] dark:text-[#aebac1] uppercase text-[9px] font-black tracking-widest border-b border-[#e9edef] dark:border-[#2a3942] sticky top-0 z-20">
                        <tr>
                          <th className="p-2 w-10 text-center border-r dark:border-[#2a3942]">
                            <input 
                              type="checkbox" 
                              checked={records.length > 0 && selectedRecords.length === records.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedRecords(records.map(r => r.id));
                                else setSelectedRecords([]);
                              }}
                              className="w-3.5 h-3.5 rounded-full border-2 border-[#adb5bd] dark:border-[#667781] text-[#00a884] focus:ring-[#00a884] cursor-pointer accent-[#00a884]"
                            />
                          </th>
                          <th className="p-2 font-black border-r dark:border-[#2a3942]">Type</th>
                          <th className="p-2 font-black border-r dark:border-[#2a3942]">Name</th>
                          <th className="p-2 font-black border-r dark:border-[#2a3942]">Content</th>
                          <th className="p-2 font-black border-r dark:border-[#2a3942]">Status</th>
                          <th className="p-2 font-black text-center">Action</th>
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
            <div className="w-48 h-48 sm:w-64 sm:h-64 bg-[#dfe5e7] dark:bg-[#202c33] rounded-full flex items-center justify-center mb-8 relative">
               <Monitor className="w-24 h-24 sm:w-32 sm:h-32 text-[#54656f] dark:text-[#8696a0] relative z-10" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-light text-[#41525d] dark:text-[#e9edef] mb-4">Cloudflare DNS Manager</h2>
            <p className="text-[#667781] dark:text-[#aebac1] max-w-md leading-relaxed text-sm sm:text-base px-4">
              Select a client to manage their Cloudflare DNS records. Your connection is secured via encrypted API proxy.
            </p>
            <div className="mt-12 flex items-center gap-2 text-[#8696a0] font-medium uppercase tracking-widest text-[10px] bg-white dark:bg-[#202c33] px-6 py-2 rounded-full border border-[#e9edef] dark:border-[#2a3942] shadow-sm">
              <Lock className="w-4 h-4" /> End-to-end encrypted
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
      <BulkUpdateDialog
        isOpen={isBulkUpdatingIP}
        onClose={() => setIsBulkUpdatingIP(false)}
        onUpdate={executeBulkIPUpdate}
        isProcessing={isBulkProcessing}
        count={selectedUsers.length}
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
