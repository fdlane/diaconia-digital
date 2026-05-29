export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiSuccess<T> = { ok: true; data: T; error: null };
type ApiError = { ok: false; data: null; error: string };
export type ApiResult<T> = ApiSuccess<T> | ApiError;

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    ...(options?.body ? { "content-type": "application/json" } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  try {
    const res = await fetch(`${apiUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, data: null, error: payload?.error ?? `Error ${res.status}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data, error: null };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : "Error" };
  }
}
