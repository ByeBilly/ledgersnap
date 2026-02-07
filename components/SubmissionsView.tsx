
import React, { useState, useEffect } from 'react';
import { User, Submission, SubmissionStatus } from '../types';
import { storage } from '../services/storage';
import { Search, Filter, ChevronRight, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface SubmissionsViewProps {
  user: User;
  onRefresh?: () => Promise<void>;
}

const SubmissionsView: React.FC<SubmissionsViewProps> = ({ user, onRefresh }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const load = async () => {
      if (onRefresh) await onRefresh();
      const cached = await storage.getCachedSubmissions();
      setSubmissions(cached);
    };
    load();
  }, [onRefresh]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-800">My History</h2>
        <div className="bg-slate-100 p-2 rounded-xl text-slate-400">
          <Filter size={20} />
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search merchants, dates..."
          className="w-full bg-white border border-slate-200 py-3 pl-12 pr-4 rounded-2xl text-sm focus:outline-none focus:ring-2 ring-blue-500 transition shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">No submissions yet.</p>
            <p className="text-xs">Your ledger history will appear here.</p>
          </div>
        ) : (
          submissions.map((sub) => (
            <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:bg-slate-50 transition cursor-pointer">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
                {sub.image_url ? (
                  <img src={sub.image_url} alt="Receipt" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm truncate">
                    {Array.isArray(sub.data) ? 'Bank Statement' : (sub.data as any).merchant || 'Untitled Submission'}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400">{new Date(sub.submitted_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs font-medium text-slate-500">
                    {Array.isArray(sub.data)
                      ? `${sub.data.length} txns`
                      : `$${(sub.data as any).total?.toFixed(2) || '0.00'}`}
                  </p>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
  switch (status) {
    case SubmissionStatus.SUBMITTED:
      return <span className="text-[9px] font-black text-green-600 uppercase flex items-center gap-0.5"><CheckCircle2 size={10} /> OK</span>;
    case SubmissionStatus.REVIEW_REQUIRED:
      return <span className="text-[9px] font-black text-amber-600 uppercase flex items-center gap-0.5"><AlertCircle size={10} /> REVIEW</span>;
    default:
      return <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-0.5"><Clock size={10} /> {status}</span>;
  }
};

export default SubmissionsView;
