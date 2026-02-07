
export enum UserRole {
  STAFF = 'staff',
  MANAGER = 'manager'
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  QUEUED = 'QUEUED',
  UPLOADING = 'UPLOADING',
  SUBMITTED = 'SUBMITTED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  REVISED = 'REVISED',
  FAILED = 'FAILED'
}

export interface Tenant {
  id: string;
  business_name: string;
  business_code: string;
  drive_root_folder_id: string;
  master_spreadsheet_id: string;
  created_at: string;
  status: 'PROVISIONING' | 'ACTIVE';
}

export interface User {
  id: string;
  tenant_id: string;
  business_code: string;
  email: string;
  staff_code: string;
  name: string;
  role: UserRole;
}

export interface ReceiptData {
  merchant: string | null;
  merchant_abn: string | null;
  receipt_date: string | null;
  receipt_time: string | null;
  total: number | null;
  gst_amount: number | null;
  currency: string | null;
  payment_method: string | null;
  category_guess: string | null;
  confidence: {
    overall: number;
    fields: {
      merchant: number;
      receipt_date: number;
      total: number;
      gst_amount: number;
    };
  };
  raw_text: string;
  notes?: string;
}

export interface TransactionData {
  txn_date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
  category_guess: string | null;
  confidence: number;
}

export interface Submission {
  id: string;
  idempotency_key: string;
  tenant_id: string;
  business_code: string;
  staff_code: string;
  submitted_at_utc: string;
  type: 'RECEIPT' | 'STATEMENT' | 'CSV_EXPORT';
  status: SubmissionStatus;
  data: ReceiptData | TransactionData[];
  image_url?: string;
  drive_file_id?: string;
  notes?: string;
  mime_type?: string;
}

export interface OutboxItem {
  id: string;
  client_request_id: string;
  idempotency_key: string;
  type: 'RECEIPT' | 'STATEMENT' | 'CSV_EXPORT';
  file: Blob; // Changed from 'image' to 'file' to support multi-format
  data: ReceiptData | TransactionData[];
  status: SubmissionStatus;
  created_at: number;
  last_attempt_at?: number;
  attempt_count: number;
  error?: string;
  mime_type: string;
}
