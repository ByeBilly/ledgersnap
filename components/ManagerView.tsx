
import React, { useEffect, useState } from 'react';
import { BarChart3, Download, Users, AlertCircle, CheckCircle, FileText, TrendingUp, Search, Plus } from 'lucide-react';
import { fetchUsers, inviteUser, updateUserStatus } from '../services/api';

const ManagerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'export' | 'team'>('overview');
  const [team, setTeam] = useState<Array<{ user_id: string; email: string; staff_code: string; role: string; status: string; name?: string }>>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'manager'>('staff');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadTeam = async () => {
    try {
      const response = await fetchUsers();
      setTeam(response.users);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTab === 'team') {
      loadTeam();
    }
  }, [activeTab]);

  const handleInvite = async () => {
    setInviteStatus(null);
    setInviteError(null);
    setInviteLink(null);
    try {
      const response = await inviteUser({
        email: inviteEmail,
        name: inviteName,
        role: inviteRole
      });
      setInviteStatus('Invite sent.');
      if (response.magicLink) {
        setInviteLink(response.magicLink);
        try {
          await navigator.clipboard.writeText(response.magicLink);
          setInviteStatus('Invite sent. Magic link copied.');
        } catch (err) {
          setInviteStatus('Invite sent. Magic link ready.');
        }
      }
      setInviteName('');
      setInviteEmail('');
      setInviteRole('staff');
      await loadTeam();
    } catch (err: any) {
      setInviteError(err.message);
    }
  };

  const handleToggleStatus = async (memberId: string, nextStatus: 'active' | 'disabled') => {
    setStatusError(null);
    try {
      await updateUserStatus(memberId, nextStatus);
      await loadTeam();
    } catch (err: any) {
      setStatusError(err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800">Manager</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`p-2 rounded-xl transition ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            <BarChart3 size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('review')}
            className={`p-2 rounded-xl transition ${activeTab === 'review' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            <AlertCircle size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('export')}
            className={`p-2 rounded-xl transition ${activeTab === 'export' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            <Download size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={`p-2 rounded-xl transition ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            <Users size={20} />
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<TrendingUp size={18} />} label="Month Total" value="$12,450" color="bg-blue-600" />
            <StatCard icon={<AlertCircle size={18} />} label="Pending" value="8" color="bg-amber-500" />
            <StatCard icon={<CheckCircle size={18} />} label="Verified" value="142" color="bg-green-500" />
            <StatCard icon={<Users size={18} />} label="Active Staff" value="12" color="bg-indigo-500" />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Business Activity</h3>
            <div className="space-y-4">
              <ActivityItem staff="LIAM" action="Approved Receipt" id="RC-TI-001" time="2m ago" />
              <ActivityItem staff="ROTU" action="Submitted Statement" id="TX-TI-082" time="15m ago" />
              <ActivityItem staff="TEMPA" action="Captured Receipt" id="RC-TI-442" time="1h ago" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0" size={20} />
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              The items below require manual verification due to low extraction confidence.
            </p>
          </div>
          
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">Merchant Unknown</p>
                  <p className="text-[10px] text-slate-400">ID: RC-BIZ-QUEUED-{i}</p>
                </div>
                <button className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg uppercase">Review</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="bg-white rounded-3xl p-8 text-center space-y-6 shadow-sm border border-slate-100">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Download size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Export Ledger Data</h3>
            <p className="text-slate-500 text-sm mt-1">Download historical records for accounting.</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              <Download size={18} /> CSV Format (Excel)
            </button>
            <button className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl">
              PDF Summary Report
            </button>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-800">Invite Staff</h3>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full name"
                className="w-full p-4 bg-slate-50 rounded-2xl border-0 focus:ring-2 ring-blue-500 outline-none text-sm font-medium"
              />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="w-full p-4 bg-slate-50 rounded-2xl border-0 focus:ring-2 ring-blue-500 outline-none text-sm font-medium"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'staff' | 'manager')}
                className="w-full p-4 bg-slate-50 rounded-2xl border-0 focus:ring-2 ring-blue-500 outline-none text-sm font-bold"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <button
              onClick={handleInvite}
              disabled={!inviteName || !inviteEmail}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 disabled:opacity-40 disabled:grayscale flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Send Invite
            </button>
            {inviteStatus && <p className="text-xs text-emerald-600 font-bold">{inviteStatus}</p>}
            {inviteError && <p className="text-xs text-rose-600 font-bold">{inviteError}</p>}
            {inviteLink && (
              <p className="text-[10px] text-blue-600 font-bold break-all">
                {inviteLink}
              </p>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Team Directory</h3>
              <button onClick={loadTeam} className="text-xs font-bold text-blue-600">Refresh</button>
            </div>
            {team.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Users size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">No staff yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {team.map((member) => (
                  <div key={member.user_id} className="bg-slate-50/60 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{member.name || member.email}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{member.staff_code} • {member.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase ${member.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {member.status}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(member.user_id, member.status === 'active' ? 'disabled' : 'active')}
                        className="text-[10px] font-black uppercase text-blue-600"
                      >
                        {member.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {statusError && <p className="text-xs text-rose-600 font-bold mt-3">{statusError}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-2">
    <div className={`w-8 h-8 ${color} text-white rounded-xl flex items-center justify-center`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-black text-slate-800">{value}</p>
    </div>
  </div>
);

const ActivityItem: React.FC<{ staff: string, action: string, id: string, time: string }> = ({ staff, action, id, time }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
      {staff[0]}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-800"><span className="font-bold">{staff}</span> {action}</p>
      <p className="text-[9px] text-slate-400 uppercase font-medium">{id} • {time}</p>
    </div>
  </div>
);

export default ManagerView;
