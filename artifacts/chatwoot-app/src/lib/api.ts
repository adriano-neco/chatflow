const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('chatflow_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { ...init, headers });
}
