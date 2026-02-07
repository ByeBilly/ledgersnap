
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Submission, SubmissionStatus, TransactionData } from './types';
import { storage } from './services/storage';
import { Camera, ClipboardList, Settings as SettingsIcon, Briefcase, RefreshCw, Wifi, WifiOff, Inbox, Rocket, Building2 } from 'lucide-react';
import CaptureView from './components/CaptureView';
import SubmissionsView from './components/SubmissionsView';
import SettingsView from './components/SettingsView';
import ManagerView from './components/ManagerView';
import OutboxView from './components/OutboxView';
import OnboardingView from './components/OnboardingView';
import { requestMagicLink, verifyMagicLink, submitToQueue, fetchSubmissions, setAuthToken, getAuthToken, clearAuthToken } from './services/api';
import { blobToBase64 } from './services/image';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capture' | 'submissions' | 'settings' | 'manager' | 'outbox' | 'onboarding'>('capture');
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const initApp = async () => {
      await storage.init();
      const savedUser = localStorage.getItem('ls_session');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      const params = new URLSearchParams(window.location.search);
      const magicToken = params.get('token');
      if (magicToken) {
        try {
          const response = await verifyMagicLink(magicToken);
          setAuthToken(response.token);
          const verifiedUser: User = {
            id: response.user.userId,
            tenant_id: response.user.tenantId,
            business_code: response.user.businessCode || '---',
            email: response.user.email,
            staff_code: response.user.staffCode,
            name: response.user.name || response.user.businessName || response.user.email,
            role: response.user.role
          };
          setUser(verifiedUser);
          localStorage.setItem('ls_session', JSON.stringify(verifiedUser));
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err: any) {
          setLoginError(err.message);
        }
      }
      const outbox = await storage.getOutbox();
      setOutboxCount(outbox.filter(i => i.status !== SubmissionStatus.SUBMITTED).length);
      setIsBootstrapping(false);
    };
    initApp();
  }, []);

  const syncOutbox = useCallback(async () => {
    if (isSyncing || !isOnline || !user || !getAuthToken()) return;
    const outbox = await storage.getOutbox();
    const pending = outbox.filter(i => 
      i.status === SubmissionStatus.QUEUED || 
      i.status === SubmissionStatus.FAILED
    );
    
    if (pending.length === 0) return;

    setIsSyncing(true);
    for (const item of pending) {
      try {
        await storage.updateOutboxStatus(item.id, SubmissionStatus.UPLOADING);
        const fileBase64 = await blobToBase64(item.file);
        const submissionType = item.type === 'RECEIPT' ? 'receipt' : 'statement';
        const payload =
          item.type === 'RECEIPT'
            ? {
                imageBase64: fileBase64,
                merchant: (item.data as any).merchant,
                total: (item.data as any).total,
                date: (item.data as any).receipt_date,
              }
            : {
                fileBase64,
                mimeType: item.mime_type,
                statementDate: new Date().toISOString().slice(0, 10),
                transactions: item.data as TransactionData[],
              };

        const response = await submitToQueue({
          type: submissionType,
          payload,
          idempotencyKey: item.idempotency_key
        });

        await storage.removeFromOutbox(item.id);

        const currentCache = await storage.getCachedSubmissions();
        const newSubmission: Submission = {
          id: response.queueId || item.id,
          idempotency_key: item.idempotency_key,
          tenant_id: user.tenant_id,
          business_code: user.business_code,
          staff_code: user.staff_code,
          submitted_at_utc: new Date().toISOString(),
          type: item.type,
          status: SubmissionStatus.QUEUED,
          data: item.data,
          notes: (item.data as any).notes,
          mime_type: item.mime_type
        };
        await storage.cacheSubmissions([newSubmission, ...currentCache]);

      } catch (err: any) {
        await storage.updateOutboxStatus(item.id, SubmissionStatus.FAILED, err.message);
      }
    }
    const updated = await storage.getOutbox();
    setOutboxCount(updated.filter(i => i.status !== SubmissionStatus.SUBMITTED).length);
    setIsSyncing(false);
  }, [isSyncing, isOnline, user]);

  useEffect(() => {
    if (isOnline) syncOutbox();
  }, [isOnline, syncOutbox]);

  useEffect(() => {
    if (activeTab === 'submissions') {
      refreshSubmissions();
    }
  }, [activeTab, refreshSubmissions]);

  useEffect(() => {
    if (user && isOnline) {
      refreshSubmissions();
    }
  }, [user, isOnline, refreshSubmissions]);

  const refreshSubmissions = useCallback(async () => {
    if (!user || !getAuthToken()) return;
    try {
      const response = await fetchSubmissions();
      const mapped: Submission[] = response.submissions.map((row: any) => {
        const status =
          row.status === 'completed'
            ? SubmissionStatus.SUBMITTED
            : row.status === 'processing'
              ? SubmissionStatus.UPLOADING
              : row.status === 'failed'
                ? SubmissionStatus.FAILED
                : SubmissionStatus.QUEUED;
        const data = row.result_json ? JSON.parse(row.result_json) : JSON.parse(row.payload_json);
        return {
          id: row.id,
          idempotency_key: row.idempotency_key,
          tenant_id: row.tenant_id,
          business_code: user.business_code,
          staff_code: user.staff_code,
          submitted_at_utc: row.created_at,
          type: row.type === 'receipt' ? 'RECEIPT' : 'STATEMENT',
          status,
            data
        };
      });
      await storage.cacheSubmissions(mapped);
    } catch (err) {
      // Silent refresh
    }
  }, [user]);

  const handleOnboarded = (newUser: User, token?: string) => {
    setUser(newUser);
    localStorage.setItem('ls_session', JSON.stringify(newUser));
    if (token) {
      setAuthToken(token);
    }
    setActiveTab('capture');
  };

  const handleSignIn = async () => {
    setLoginStatus(null);
    setLoginError(null);
    try {
      const response = await requestMagicLink(loginEmail);
      if (response.token) {
        const verified = await verifyMagicLink(response.token);
        setAuthToken(verified.token);
        const verifiedUser: User = {
          id: verified.user.userId,
          tenant_id: verified.user.tenantId,
          business_code: verified.user.businessCode || '---',
          email: verified.user.email,
          staff_code: verified.user.staffCode,
          name: verified.user.name || verified.user.businessName || verified.user.email,
          role: verified.user.role
        };
        setUser(verifiedUser);
        localStorage.setItem('ls_session', JSON.stringify(verifiedUser));
        setLoginStatus('Signed in.');
      } else {
        setLoginStatus(response.message);
      }
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleSignOut = () => {
    clearAuthToken();
    localStorage.removeItem('ls_session');
    setUser(null);
  };

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!user) {
    return activeTab === 'onboarding' ? (
      <OnboardingView onComplete={handleOnboarded} onCancel={() => setActiveTab('capture')} />
    ) : (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-blue-600 rounded-[30px] flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-200">
          <Rocket size={40} className="fill-current" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">LedgerSnap</h1>
        <p className="text-slate-500 text-center mb-10 font-medium leading-relaxed max-w-[260px]">
          The zero-config immutable ledger for your business.
        </p>
        
        <div className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Work Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full p-5 bg-slate-50 border-0 rounded-3xl outline-none focus:ring-2 ring-blue-500 transition-all text-lg font-medium"
            />
            <button
              onClick={handleSignIn}
              disabled={!loginEmail}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all text-lg disabled:opacity-40 disabled:grayscale"
            >
              Send Magic Link
            </button>
          </div>
          {loginStatus && <p className="text-xs text-emerald-600 font-bold">{loginStatus}</p>}
          {loginError && <p className="text-xs text-rose-600 font-bold">{loginError}</p>}
          
          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-slate-300 uppercase tracking-widest">New Company?</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>
          
          <button 
            onClick={() => setActiveTab('onboarding')}
            className="w-full bg-white border-2 border-slate-100 text-slate-800 font-bold py-5 rounded-3xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
          >
            <Building2 size={20} className="text-blue-600" />
            Create Business Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white max-w-md mx-auto border-x border-slate-100 shadow-sm font-sans selection:bg-blue-100">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-6 py-5 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-black text-xl tracking-tight text-slate-900 leading-none">LedgerSnap</h1>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{user.business_code} • {user.role}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <div className="bg-rose-50 text-rose-600 p-2 rounded-xl" title="Offline">
              <WifiOff size={16} />
            </div>
          ) : isSyncing ? (
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl animate-spin">
              <RefreshCw size={16} />
            </div>
          ) : (
             <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
              <Wifi size={16} />
            </div>
          )}
          <button 
            onClick={() => setActiveTab('outbox')}
            className={`relative p-2 rounded-xl transition ${activeTab === 'outbox' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            <Inbox size={18} />
            {outboxCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center">
                {outboxCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {activeTab === 'capture' && <CaptureView user={user} onQueued={() => storage.getOutbox().then(o => setOutboxCount(o.length))} />}
        {activeTab === 'submissions' && <SubmissionsView user={user} onRefresh={refreshSubmissions} />}
        {activeTab === 'settings' && <SettingsView user={user} onSignOut={handleSignOut} />}
        {activeTab === 'manager' && user.role === UserRole.MANAGER && <ManagerView />}
        {activeTab === 'outbox' && <OutboxView onUpdate={() => storage.getOutbox().then(o => setOutboxCount(o.length))} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t safe-bottom max-w-md mx-auto">
        <div className="flex justify-around items-center h-16 px-2">
          <TabItem active={activeTab === 'capture'} onClick={() => setActiveTab('capture')} icon={<Camera size={22} />} label="Snap" />
          <TabItem active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')} icon={<ClipboardList size={22} />} label="History" />
          {user.role === UserRole.MANAGER && (
            <TabItem active={activeTab === 'manager'} onClick={() => setActiveTab('manager')} icon={<Briefcase size={22} />} label="Manage" />
          )}
          <TabItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={22} />} label="Account" />
        </div>
      </nav>
    </div>
  );
};

const TabItem: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full transition-all ${active ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[10px] mt-1 font-bold tracking-tight">{label}</span>
  </button>
);

export default App;
