import React, { useState } from 'react';
import { Server, Settings, ArrowLeftRight, ArrowLeft, Menu, X, LogOut, Save, Users, User, Mail, Globe } from 'lucide-react';
import { useStore } from './store/useStore';
import { LoginPage } from './components/LoginPage';
import { HestiaConfigPanel } from './components/HestiaConfigPanel';
import { ClientsList } from './components/ClientsList';
import { ClientDnsPanel } from './components/ClientDnsPanel';
import { MailManager } from './components/MailManager';
import { BulkIpUpdate } from './components/BulkIpUpdate';
import { ActivityLog } from './components/ActivityLog';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ToastContainer, useToast } from './components/Toast';
import { useConfirm } from './components/ConfirmDialog';
import { AdminAccountSection } from './components/AdminAccountSection';

type Tab = 'clients' | 'mail' | 'bulkip' | 'account' | 'settings';

export default function App() {
  const store = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('clients');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show loading while checking auth
  if (store.authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="fixed inset-0 bg-gradient-to-br from-purple-950/30 via-gray-950 to-orange-950/20 pointer-events-none" />
        <div className="relative z-10 text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!store.isAuthenticated) {
    return <LoginPage onLogin={store.handleLogin} />;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'clients', label: 'Clients', icon: <Users size={18} /> },
    { id: 'mail', label: 'Mail Manager', icon: <Mail size={18} /> },
    { id: 'bulkip', label: 'Bulk IP', icon: <Globe size={18} /> },
    { id: 'account', label: 'Admin Account', icon: <User size={18} /> },
    { id: 'settings', label: 'HestiaCP Settings', icon: <Settings size={18} /> },
  ];

  const BackButton = ({ target = 'clients' as Tab }: { target?: Tab }) => (
    <button
      onClick={() => {
        setActiveTab(target);
        store.setSelectedClient(null);
      }}
      className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-4"
    >
      <ArrowLeft size={16} />
      Back to {tabs.find(t => t.id === target)?.label || 'Clients'}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Overlays */}
      {confirm.dialog}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />

      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950/30 via-gray-950 to-orange-950/20 pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-20 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 via-orange-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                <ArrowLeftRight size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                  CloudHestia
                </h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">Admin Panel</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    store.setSelectedClient(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gray-800 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* User & Status */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${store.hestiaConnecting ? 'bg-blue-400 animate-pulse' : store.hestiaConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-xs text-gray-500">{store.hestiaConnecting ? 'Connecting...' : 'HestiaCP'}</span>
              </div>

              <div className="flex items-center gap-2 pl-4 border-l border-gray-700/50">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User size={14} className="text-white" />
                </div>
                <div className="text-sm">
                  <p className="text-white font-medium">{store.currentUser?.username}</p>
                  <p className="text-[10px] text-gray-500">Admin</p>
                </div>
                <button
                  onClick={store.handleLogout}
                  className="ml-2 text-gray-500 hover:text-red-400 transition-colors p-1"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden relative z-10 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50">
          <div className="px-4 py-2 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                  store.setSelectedClient(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <button
              onClick={store.handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 transition-all"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4">
        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Show client detail if selected */}
            {store.selectedClient ? (
              <>
                <button
                  onClick={() => store.setSelectedClient(null)}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-4"
                >
                  ← Back to Clients
                </button>
                <ClientDnsPanel
                  client={store.selectedClient}
                  hestiaConfig={store.hestiaConfig}
                  hestiaConnected={store.hestiaConnected}
                  addLog={store.addLog}
                  toast={toast}
                  confirm={confirm.confirm}
                />
              </>
            ) : (
              <>
                {/* Hero */}
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-gray-700/30 rounded-2xl p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      Client Management
                    </span>
                  </h2>
                  <p className="text-gray-400 text-sm md:text-base max-w-2xl">
                    Manage your clients' Cloudflare DNS records. Add clients with their Cloudflare credentials,
                    then push mail DNS records from your HestiaCP server to their Cloudflare accounts.
                  </p>
                  
                  {/* HestiaCP Status */}
                  <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                    store.hestiaConnecting
                      ? 'bg-blue-900/20 border border-blue-700/30'
                      : store.hestiaConnected 
                      ? 'bg-green-900/20 border border-green-700/30' 
                      : 'bg-amber-900/20 border border-amber-700/30'
                  }`}>
                    {store.hestiaConnecting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Server size={16} className={store.hestiaConnected ? 'text-green-400' : 'text-amber-400'} />
                    )}
                    <span className={`text-sm ${store.hestiaConnecting ? 'text-blue-400' : store.hestiaConnected ? 'text-green-400' : 'text-amber-400'}`}>
                      {store.hestiaConnecting
                        ? `Connecting to ${store.hestiaConfig.hostname}...`
                        : store.hestiaConnected 
                        ? `HestiaCP Connected: ${store.hestiaConfig.hostname}` 
                        : 'HestiaCP not configured – Go to Settings'}
                    </span>
                    {!store.hestiaConnected && (
                      <button
                        onClick={() => setActiveTab('settings')}
                        className="text-xs text-amber-300 hover:text-amber-200 underline"
                      >
                        Configure
                      </button>
                    )}
                  </div>
                </div>

                {/* Clients List */}
                <ClientsList
                  clients={store.clients}
                  setClients={store.setClients}
                  selectedClient={store.selectedClient}
                  setSelectedClient={store.setSelectedClient}
                  addLog={store.addLog}
                  toast={toast}
                  hestiaHostIp={store.hestiaConfig.hostIp || store.hestiaConfig.hostname}
                  confirm={confirm.confirm}
                  hestiaConfig={store.hestiaConfig}
                  hestiaConnected={store.hestiaConnected}
                />
              </>
            )}

            <ActivityLog logs={store.logs} />
          </div>
        )}

        {/* Mail Manager Tab */}
        {activeTab === 'mail' && (
          <div className="space-y-6">
            <BackButton target="clients" />
            <div className="bg-gradient-to-r from-orange-900/30 to-purple-900/30 border border-gray-700/30 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-2">
                <span className="bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">Mail Manager</span>
              </h2>
              <p className="text-gray-400 text-sm">Add and remove mail domains, create email accounts, set passwords, and install SSL certificates on your HestiaCP server.</p>
            </div>
            <MailManager
              hestiaConfig={store.hestiaConfig}
              hestiaConnected={store.hestiaConnected}
              addLog={store.addLog}
              toast={toast}
              clients={store.clients}
              confirm={confirm.confirm}
            />
            <ActivityLog logs={store.logs} />
          </div>
        )}

        {/* Bulk IP Tab */}
        {activeTab === 'bulkip' && (
          <div className="space-y-6">
            <BackButton target="clients" />
            <BulkIpUpdate clients={store.clients} addLog={store.addLog} toast={toast} />
            <ActivityLog logs={store.logs} />
          </div>
        )}

        {/* Admin Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <BackButton target="settings" />
            <div className="bg-gradient-to-r from-fuchsia-900/30 to-purple-900/30 border border-gray-700/30 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-2">
                <span className="bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">Admin Account</span>
              </h2>
              <p className="text-gray-400 text-sm">Change the admin username and password used to access this application.</p>
            </div>
            <AdminAccountSection
              currentUser={store.currentUser}
              onUserUpdated={() => {
                window.location.reload();
              }}
              toast={toast}
              addLog={store.addLog}
            />
            <ActivityLog logs={store.logs} />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <BackButton target="clients" />
            {/* Save Button */}
            <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Save size={18} className="text-green-400" />
                  Save HestiaCP Configuration
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Save settings and auto-connect to HestiaCP
                </p>
              </div>
              <button
                onClick={store.saveHestiaConfigToBackend}
                disabled={store.configSaving || store.hestiaConnecting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                {store.configSaving || store.hestiaConnecting ? (
                  <LoadingSpinner size="sm" text={store.hestiaConnecting ? "Connecting..." : "Saving..."} />
                ) : (
                  <>
                    <Save size={16} />
                    Save & Connect
                  </>
                )}
              </button>
            </div>

            {/* HestiaCP Config */}
            <HestiaConfigPanel
              config={store.hestiaConfig}
              setConfig={store.setHestiaConfig}
              connected={store.hestiaConnected}
              setConnected={store.setHestiaConnected}
              setUsers={store.setHestiaUsers}
              addLog={store.addLog}
            />

            {/* Help Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">📖 How It Works</h3>
              <div className="space-y-4 text-sm text-gray-400">
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                  <p>Configure your HestiaCP server connection above and test it</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                  <p>Add clients in the Clients tab with their Cloudflare API Token and Zone ID</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                  <p>Click on a client to view their Cloudflare DNS and fetch HestiaCP mail domains</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">4</span>
                  <p>Select a mail domain from HestiaCP to load its DNS records (MX, TXT, DKIM, etc.)</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">5</span>
                  <p>Select the records you want to push and click "Push to Cloudflare"</p>
                </div>
              </div>
            </div>

            <ActivityLog logs={store.logs} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-600">
            CloudHestia Admin Panel • HestiaCP → Cloudflare DNS Manager
          </p>
        </div>
      </footer>
    </div>
  );
}
