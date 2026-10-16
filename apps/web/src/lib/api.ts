export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const TOKEN_KEY = "ne_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const t = getToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  if (!res.ok) {
    const text = await res.text();
    let err: unknown = text;
    try {
      err = JSON.parse(text) as unknown;
    } catch {
      /* plain text */
    }
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: err });
  }

  return (await res.json()) as T;
}

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  personnelType: string | null;
};
