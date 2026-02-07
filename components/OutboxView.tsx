
import React, { useState, useEffect } from 'react';
import { OutboxItem, SubmissionStatus } from '../types';
import { storage } from '../services/storage';
import { Clock, AlertCircle, RefreshCw, CheckCircle2, Trash2, FileText, FileSpreadsheet } from 'lucide-react';

interface OutboxViewProps {
  onUpdate: () => void;
}

const OutboxView: React.FC<OutboxViewProps> = ({ onUpdate }) => {
  const [items, setItems] = useState<OutboxItem[]>([]);

  useEffect(() => {
    storage.getOutbox().then(setItems);
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Discard this queued record?')) {
      await storage.removeFromOutbox(id);
      const updated = await storage.getOutbox();
      setItems(updated);
      onUpdate();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Outbox</h2>
        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
          {items.length} Pending
        </span>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-100" />
            <p className="text-slate-400 font-bold">Queue is clear.</p>
            <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">All snaps recorded</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100">
                {item.mime_type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(item.file)} className="w-full h-full object-cover" alt="Thumb" />
                ) : item.mime_type === 'application/pdf' ? (
                  <FileText className="text-rose-400" />
                ) : (
                  <FileSpreadsheet className="text-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-black text-xs text-slate-800 truncate">
                    {item.type === 'RECEIPT' ? (item.data as any).merchant || 'Snap Record' : 'Statement Upload'}
                  </p>
                  <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusPill status={item.status} />
                  {item.attempt_count > 0 && <span className="text-[9px] font-bold text-slate-400">Retry #{item.attempt_count}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const StatusPill = ({ status }: { status: SubmissionStatus }) => {
  switch (status) {
    case SubmissionStatus.UPLOADING:
      return <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-tighter"><RefreshCw size={8} className="animate-spin" /> Uploading</span>;
    case SubmissionStatus.FAILED:
      return <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-tighter"><AlertCircle size={8} /> Failed</span>;
    default:
      return <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-tighter"><Clock size={8} /> Queued</span>;
  }
};

export default OutboxView;
