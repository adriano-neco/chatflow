const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export async function apiFetch(path: string, init?: RequestInit & { formData?: FormData }): Promise<Response> {
  const token = localStorage.getItem('chatflow_token');
  const isFormData = init?.body instanceof FormData || init?.formData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const body = init?.formData ?? init?.body;
  return fetch(`${BASE}${path}`, { ...init, body, headers });
}

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}
