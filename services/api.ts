const DEFAULT_API_URL = 'http://localhost:3001';
const TOKEN_KEY = 'ls_token';

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  return envUrl || DEFAULT_API_URL;
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export function requestMagicLink(email: string) {
  return request<{ message: string; magicLink?: string; token?: string }>('/auth/request-link', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export function verifyMagicLink(token: string) {
  return request<{ token: string; user: any }>(`/auth/verify?token=${encodeURIComponent(token)}`);
}

export function submitToQueue(payload: any) {
  return request<{ status: string; queueId?: string; result?: any }>('/submissions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchSubmissions() {
  return request<{ submissions: any[] }>('/submissions');
}

export function provisionTenant(payload: {
  businessName: string;
  adminName: string;
  adminEmail: string;
}) {
  return request<{
    tenant: { tenantId: string; businessCode: string; businessName: string };
    user: { userId: string; tenantId: string; email: string; staffCode: string; role: string; name: string };
    magicLink?: string;
    token?: string;
  }>('/tenants/provision', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchUsers() {
  return request<{ users: Array<{ user_id: string; tenant_id: string; email: string; staff_code: string; role: string; status: string; name?: string }> }>('/tenants/users');
}

export function inviteUser(payload: { email: string; name: string; role?: 'staff' | 'manager' }) {
  return request<{
    user: { userId: string; tenantId: string; email: string; staffCode: string; role: string; name: string };
    magicLink?: string;
    token?: string;
  }>('/tenants/invite', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateUserStatus(userId: string, status: 'active' | 'disabled') {
  return request<{ status: string }>(`/tenants/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}
