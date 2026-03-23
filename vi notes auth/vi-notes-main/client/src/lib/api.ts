const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export type ApiError = { error: string };

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers || {}),
    },
  });

  const body = await readJson(res);

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as any).error)
        : `http_${res.status}`;
    throw new Error(message);
  }

  return body as T;
}

export type AuthResponse = { token: string; user: { id: string; name: string; email: string } };

export function register(name: string, email: string, password: string) {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export type CreateSessionResponse = { sessionId: string };

export function createSession(token: string, title: string) {
  return apiFetch<CreateSessionResponse>('/api/sessions', {
    method: 'POST',
    token,
    body: JSON.stringify({ title }),
  });
}

export type KeystrokeEvent = {
  t: number;
  type: 'keydown' | 'input' | 'paste' | 'cut';
  keyType?: string;
  key?: string;
  meta?: Record<string, unknown>;
};

export function addEvents(token: string, sessionId: string, events: KeystrokeEvent[]) {
  return apiFetch<{ ok: true; ingested: number }>(`/api/sessions/${sessionId}/events`, {
    method: 'POST',
    token,
    body: JSON.stringify({ events }),
  });
}

export function updateSession(
  token: string,
  sessionId: string,
  payload: { title?: string; content?: string; endedAt?: string }
) {
  return apiFetch<{ session: any }>(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export function getReport(token: string, sessionId: string) {
  return apiFetch<{ report: any }>(`/api/sessions/${sessionId}/report`, {
    method: 'GET',
    token,
  });
}
