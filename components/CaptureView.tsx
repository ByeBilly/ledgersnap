
import React, { useState, useRef } from 'react';
import { User, ReceiptData, TransactionData, SubmissionStatus } from '../types';
import { Camera, FileText, X, Check, Loader2, Sparkles, Upload, FileSpreadsheet, FileCode } from 'lucide-react';
import { compressImage, blobToBase64 } from '../services/image';
import { extractReceipt, mapBankData } from '../services/gemini';
import { storage } from '../services/storage';
import { parseCsv, formatCsvPreview } from '../services/csv';

interface CaptureViewProps {
  user: User;
  onQueued: () => void;
}

const CaptureView: React.FC<CaptureViewProps> = ({ user, onQueued }) => {
  const [file, setFile] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ReceiptData | TransactionData[] | null>(null);
  const [fileType, setFileType] = useState<'RECEIPT' | 'STATEMENT' | 'CSV_EXPORT' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'CAMERA' | 'UPLOAD') => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsProcessing(true);
    try {
      if (rawFile.type.startsWith('image/')) {
        const compressed = await compressImage(rawFile);
        setFile(compressed);
        setPreviewUrl(URL.createObjectURL(compressed));
        setFileType('RECEIPT');
        
        if (navigator.onLine) {
          const base64 = await blobToBase64(compressed);
          const data = await extractReceipt(base64);
          setExtractedData(data);
        }
      } else if (rawFile.name.endsWith('.csv')) {
        setFile(rawFile);
        setFileType('CSV_EXPORT');
        setPreviewUrl('CSV_PLACEHOLDER');
        
        const csvRows = await parseCsv(rawFile);
        // Process a larger chunk of CSV for Gemini as it's just text
        const previewText = formatCsvPreview(csvRows, 100);
        
        if (navigator.onLine) {
          const data = await mapBankData(previewText);
          setExtractedData(data);
        }
      } else if (rawFile.type === 'application/pdf') {
        setFile(rawFile);
        setFileType('STATEMENT');
        setPreviewUrl('PDF_PLACEHOLDER');
        // PDF processing would typically happen server-side or via a PDF worker
        setExtractedData([]); 
      }
    } catch (err) {
      console.error(err);
      alert('File processing failed. Please check the file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !extractedData || !fileType) return;
    if ((fileType === 'STATEMENT' || fileType === 'CSV_EXPORT') && Array.isArray(extractedData) && extractedData.length === 0) {
      alert('Statement data is empty. Please upload a CSV export or wait for parsing.');
      return;
    }

    const timestamp = Date.now();
    const requestId = crypto.randomUUID();
    const prefix = fileType === 'RECEIPT' ? 'RC' : 'TX';
    const id = `${prefix}-${user.business_code}-${user.staff_code}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${requestId.split('-')[0].toUpperCase()}`;

    const dataWithNotes = Array.isArray(extractedData)
      ? extractedData
      : { ...extractedData, notes };

    await storage.addToOutbox({
      id,
      client_request_id: requestId,
      idempotency_key: requestId,
      type: fileType,
      file: file,
      data: dataWithNotes,
      status: SubmissionStatus.QUEUED,
      created_at: timestamp,
      attempt_count: 0,
      mime_type: file.type || 'text/csv'
    });

    onQueued();
    reset();
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setFileType(null);
    setNotes('');
  };

  return (
    <div className="p-6 space-y-6">
      {!previewUrl ? (
        <div className="space-y-4">
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-10 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-200 mb-6">
              <Camera size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Snap Receipt</h2>
            <p className="text-slate-400 text-sm mt-2 mb-8 px-4">AI extraction for physical receipts.</p>
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-transform"
            >
              Launch Camera
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-slate-100 rounded-[28px] p-5 flex flex-col items-center text-center gap-3 hover:bg-slate-50 transition"
            >
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <FileSpreadsheet size={24} />
              </div>
              <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">Bank CSV</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-slate-100 rounded-[28px] p-5 flex flex-col items-center text-center gap-3 hover:bg-slate-50 transition"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">PDF Statement</span>
            </button>
          </div>

          <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Zero-Config Multi-Tenant Ledger</p>
          
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={(e) => handleFile(e, 'CAMERA')} />
          <input type="file" accept=".csv,application/pdf,image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFile(e, 'UPLOAD')} />
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
           <div className="relative rounded-[40px] overflow-hidden shadow-2xl bg-slate-900 aspect-[4/5] flex items-center justify-center">
            {previewUrl === 'CSV_PLACEHOLDER' ? (
              <div className="text-center p-8">
                <FileSpreadsheet size={80} className="text-emerald-400 mx-auto mb-4" />
                <p className="text-white font-black text-lg">Bank Statement Parsed</p>
                <p className="text-emerald-400/60 text-[10px] font-bold uppercase tracking-widest truncate max-w-[200px]">{file?.name}</p>
              </div>
            ) : previewUrl === 'PDF_PLACEHOLDER' ? (
              <div className="text-center p-8">
                <FileText size={80} className="text-rose-400 mx-auto mb-4" />
                <p className="text-white font-black text-lg">PDF Statement</p>
                <p className="text-rose-400/60 text-xs font-bold uppercase tracking-widest">{file?.name}</p>
              </div>
            ) : (
              <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
            )}
            
            <button onClick={reset} className="absolute top-6 right-6 bg-white/10 backdrop-blur-xl text-white p-3 rounded-2xl hover:bg-white/20">
              <X size={20} />
            </button>
            
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="font-black text-lg tracking-tight">Syncing Ledger Logic...</p>
              </div>
            )}
          </div>

          {extractedData && (
            <div className="bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-600" />
                  <span className="font-black text-xs uppercase tracking-tighter text-blue-600">
                    {Array.isArray(extractedData) ? `${extractedData.length} Transactions` : 'Verified Receipt'}
                  </span>
                </div>
              </div>

              <div className="max-h-[30vh] overflow-y-auto no-scrollbar space-y-3 px-1">
                {Array.isArray(extractedData) ? (
                  extractedData.map((txn, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="text-[10px] font-black text-slate-800 truncate leading-tight">{txn.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{txn.txn_date}</p>
                           <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-tighter">{txn.category_guess}</span>
                        </div>
                      </div>
                      <p className={`font-black text-xs shrink-0 ${txn.debit ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {txn.debit ? `-$${Math.abs(txn.debit).toFixed(2)}` : txn.credit ? `+$${txn.credit.toFixed(2)}` : '0.00'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <DisplayField label="Merchant" value={(extractedData as ReceiptData).merchant} />
                    <DisplayField label="Date" value={(extractedData as ReceiptData).receipt_date} />
                    <DisplayField label="Total" value={`$${(extractedData as ReceiptData).total?.toFixed(2)}`} highlight />
                    <DisplayField label="GST" value={`$${(extractedData as ReceiptData).gst_amount?.toFixed(2)}`} />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ledger Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reference, project, or department..."
                  className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-0 focus:ring-2 ring-blue-500 outline-none transition-all"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                 <button onClick={reset} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl active:scale-95 transition">
                  Discard
                </button>
                <button 
                  onClick={handleSubmit}
                  className="flex-[2] bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Check size={20} />
                  Record to Ledger
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DisplayField = ({ label, value, highlight }: { label: string, value: any, highlight?: boolean }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{label}</p>
    <p className={`font-black truncate ${highlight ? 'text-blue-600 text-2xl tracking-tighter' : 'text-slate-800 text-base'}`}>
      {value || '---'}
    </p>
  </div>
);

export default CaptureView;
