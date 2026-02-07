
import React, { useState } from 'react';
import { Building2, ArrowRight, CheckCircle2, Loader2, ShieldCheck, Mail, Sparkles, X } from 'lucide-react';
import { User, UserRole } from '../types';
import { provisionTenant, verifyMagicLink, setAuthToken } from '../services/api';

interface OnboardingViewProps {
  onComplete: (user: User, token?: string) => void;
  onCancel: () => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [bizName, setBizName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStartProvisioning = async () => {
    setIsProvisioning(true);
    setError(null);
    
    const steps = [
      'Creating encrypted storage vault...',
      'Provisioning Google Sheets Ledger...',
      'Setting up Multi-tenant partitions...',
      'Initializing staff codes...',
      'Securing Drive Archive folder...'
    ];

    try {
      for (let i = 0; i < steps.length; i++) {
        setProgress(steps[i]);
        await new Promise(r => setTimeout(r, 900));
      }

      const response = await provisionTenant({
        businessName: bizName,
        adminName,
        adminEmail
      });

      let token = response.token;
      if (token) {
        const verified = await verifyMagicLink(token);
        setAuthToken(verified.token);
        token = verified.token;
      }

      const newUser: User = {
        id: response.user.userId,
        tenant_id: response.user.tenantId,
        business_code: response.tenant.businessCode,
        email: response.user.email,
        staff_code: response.user.staffCode,
        name: response.user.name,
        role: UserRole.MANAGER
      };

      setIsProvisioning(false);
      onComplete(newUser, token);
    } catch (err: any) {
      setIsProvisioning(false);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 flex flex-col max-w-md mx-auto animate-in slide-in-from-right duration-500">
      <header className="flex justify-between items-center mb-12">
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
          <Building2 size={24} />
        </div>
        <button onClick={onCancel} className="text-slate-400 p-2"><X size={24} /></button>
      </header>

      {step === 1 && (
        <div className="flex-1 space-y-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Create Workspace</h2>
            <p className="text-slate-500 font-medium">We'll automatically provision your immutable ledger on Google Cloud.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Business Name</label>
              <input 
                type="text" 
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g. Acme Industries" 
                className="w-full p-5 bg-slate-50 rounded-3xl border-0 focus:ring-2 ring-blue-500 outline-none text-lg font-bold transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Admin Name</label>
              <input 
                type="text" 
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="w-full p-5 bg-slate-50 rounded-3xl border-0 focus:ring-2 ring-blue-500 outline-none text-lg font-bold transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Admin Email</label>
              <input 
                type="email" 
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full p-5 bg-slate-50 rounded-3xl border-0 focus:ring-2 ring-blue-500 outline-none text-lg font-bold transition-all"
              />
            </div>
            
            <div className="bg-blue-50/50 p-6 rounded-[32px] space-y-4">
              <h4 className="font-bold text-blue-700 text-sm flex items-center gap-2">
                <Sparkles size={16} /> Auto-Provisioning Includes:
              </h4>
              <ul className="space-y-3">
                <OnboardingFeature icon={<CheckCircle2 size={14} />} text="Private Google Drive Folder" />
                <OnboardingFeature icon={<CheckCircle2 size={14} />} text="Immutable Master Spreadsheet" />
                <OnboardingFeature icon={<CheckCircle2 size={14} />} text="Encrypted Extraction Pipeline" />
              </ul>
            </div>
          </div>

          <button 
            disabled={!bizName || !adminName || !adminEmail}
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={20} />
          </button>
          {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
        </div>
      )}

      {step === 2 && !isProvisioning && (
        <div className="flex-1 space-y-8 animate-in fade-in duration-300">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Security Rules</h2>
            <p className="text-slate-500 font-medium">LedgerSnap enforces an immutable append-only record system.</p>
          </div>

          <div className="space-y-6">
            <SecurityRule 
              icon={<ShieldCheck className="text-blue-600" />} 
              title="Immutable Ledger" 
              desc="Once a record is submitted, it can never be deleted or overwritten. Only managers can issue correction revisions." 
            />
            <SecurityRule 
              icon={<Mail className="text-indigo-600" />} 
              title="Zero Password Auth" 
              desc="Staff join via secure single-use magic links. No credentials to manage or lose." 
            />
          </div>

          <div className="pt-8">
            <button 
              onClick={handleStartProvisioning}
              disabled={!bizName || !adminName || !adminEmail}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all"
            >
              Finish & Provision Now
            </button>
            {error && <p className="text-xs text-rose-600 font-bold mt-3">{error}</p>}
          </div>
        </div>
      )}

      {isProvisioning && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in duration-500">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-50 rounded-full flex items-center justify-center">
              <Loader2 size={40} className="animate-spin text-blue-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Provisioning Workspace</h3>
            <p className="text-slate-500 font-medium h-6">{progress}</p>
          </div>
          <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-1/2 animate-pulse"></div>
          </div>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-8">
            Please wait. We are configuring your enterprise-grade Google environment.
          </p>
        </div>
      )}
    </div>
  );
};

const OnboardingFeature = ({ icon, text }: { icon: any, text: string }) => (
  <li className="flex items-center gap-3 text-xs font-bold text-blue-800/70">
    <span className="text-blue-600">{icon}</span>
    {text}
  </li>
);

const SecurityRule = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="flex gap-5">
    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="space-y-1">
      <h4 className="font-black text-slate-800 leading-none">{title}</h4>
      <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
    </div>
  </div>
);

export default OnboardingView;
