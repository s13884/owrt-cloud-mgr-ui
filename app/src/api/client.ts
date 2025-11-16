// client.ts
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export type ApiError = {
  status: number;
  message: string;
  details?: any;
};

async function handleResponse(res: Response) {
  const text = await res.text();
  let data: any = undefined;
  try { data = text ? JSON.parse(text) : undefined; } catch(e){ data = text; }

  if (!res.ok) {
    const message = data?.message || res.statusText || "API error";
    const err: ApiError = { status: res.status, message, details: data };
    throw err;
  }
  return data;
}

function defaultHeaders() {
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

// GET
export async function apiGet(path: string, opts: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include", // include cookies (change if using token-only)
    headers: defaultHeaders(),
    ...opts,
  });
  return handleResponse(res);
}

// POST (JSON)
export async function apiPost(path: string, body: any, opts: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: defaultHeaders(),
    body: JSON.stringify(body),
    ...opts,
  });
  return handleResponse(res);
}

// DELETE
export async function apiDelete(path: string, opts: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: defaultHeaders(),
    ...opts,
  });
  return handleResponse(res);
}
