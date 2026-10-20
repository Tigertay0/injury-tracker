// Typed client for the Worker API. Every call carries the Clerk session token.
import { useMemo } from 'react';
import { useAppAuth } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const OFFLINE_MESSAGE = 'Connection failed. Check your signal and try again.';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(getToken: () => Promise<string | null>, method: Method, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  if (!token) throw new ApiError('Your session ended. Sign in again.', 401);

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Lets a save sent as the page closes (the tile order) finish; these bodies are tiny
      keepalive: method === 'PUT',
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as { error?: string; field?: string } | null;
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status}). Try again.`, res.status, data?.field);
  }
  if (data === null) throw new ApiError('Unexpected response from the server. Try again.', res.status);
  return data as T;
}

export function useApi() {
  const { getToken } = useAppAuth();
  return useMemo(
    () => ({
      get: <T,>(path: string) => request<T>(getToken, 'GET', path),
      post: <T,>(path: string, body: unknown) => request<T>(getToken, 'POST', path, body),
      put: <T,>(path: string, body: unknown) => request<T>(getToken, 'PUT', path, body),
      patch: <T,>(path: string, body: unknown) => request<T>(getToken, 'PATCH', path, body),
      del: (path: string) => request<void>(getToken, 'DELETE', path),
      /** Downloads a file from the API using the auth header (a plain link can't send it). */
      async download(path: string, fallbackName: string) {
        const token = await getToken();
        if (!token) throw new ApiError('Your session ended. Sign in again.', 401);
        let res: Response;
        try {
          res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
        } catch {
          throw new ApiError(OFFLINE_MESSAGE, 0);
        }
        if (!res.ok) throw new ApiError(`Download failed (${res.status}). Try again.`, res.status);
        const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    }),
    [getToken],
  );
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Try again.';
}
