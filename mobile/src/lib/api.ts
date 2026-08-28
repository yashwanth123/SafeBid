import * as SecureStore from "expo-secure-store";

export const API = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

const TOKEN_KEY = "safebid_access";
const REFRESH_KEY = "safebid_refresh";

export async function getAccessToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setTokens(access: string, refresh?: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  if (!API) {
    throw new ApiError(0, "Set EXPO_PUBLIC_API_URL to your live SafeBid API");
  }
  const headers = new Headers(opts.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!opts.skipAuth) {
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(res.status, data.error || res.statusText);
  return data as T;
}
