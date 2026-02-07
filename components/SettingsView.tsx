
import React from 'react';
import { User, UserRole } from '../types';
import { User as UserIcon, Shield, LogOut, Info, ExternalLink, Moon, Building } from 'lucide-react';

interface SettingsViewProps {
  user: User;
  onSignOut?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onSignOut }) => {
  const handleLogout = () => {
    if (confirm('Are you sure you want to log out? This will clear your local session.')) {
      if (onSignOut) onSignOut();
      else {
        localStorage.removeItem('ls_session');
        window.location.reload();
      }
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800">Account</h2>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[32px] text-white shadow-xl shadow-blue-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center text-white font-black text-xl">
            {user.name[0]}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{user.name}</h3>
            <p className="text-xs opacity-70 truncate font-medium">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">{user.role}</span>
          <span className="px-3 py-1 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">{user.business_code}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-300 uppercase px-2 mb-2 tracking-widest">User Settings</p>
        <SettingItem icon={<UserIcon size={18}/>} label="Personal Profile" />
        <SettingItem icon={<Shield size={18}/>} label="Security & Privacy" />
        <SettingItem icon={<Moon size={18}/>} label="Appearance" secondary="Light" />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-300 uppercase px-2 mb-2 tracking-widest">Workspace</p>
        <SettingItem icon={<Building size={18}/>} label="Business Profile" />
        <SettingItem icon={<Info size={18}/>} label="Ledger Documentation" />
        <SettingItem icon={<ExternalLink size={18}/>} label="Drive Archive" />
      </div>

      <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-5 text-rose-600 font-black bg-rose-50 rounded-[32px] mt-12 transition-all hover:bg-rose-100 active:scale-95"
      >
        <LogOut size={20} />
        Log Out Securely
      </button>

      <div className="text-center">
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">v1.3.0-enterprise</p>
      </div>
    </div>
  );
};

const SettingItem: React.FC<{ icon: React.ReactNode, label: string, secondary?: string }> = ({ icon, label, secondary }) => (
  <div className="bg-white p-5 rounded-[28px] border border-slate-50 shadow-sm flex items-center justify-between active:bg-slate-50 transition-all cursor-pointer">
    <div className="flex items-center gap-4">
      <div className="text-slate-400">{icon}</div>
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
    <span className="text-xs text-slate-400 font-bold">{secondary}</span>
  </div>
);

export default SettingsView;
