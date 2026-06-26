import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_KEY = "sbep_auth_token";

function getBaseUrl(): string {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (domain) return `https://${domain}`;
  return "";
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem(AUTH_KEY)
      : null;
  }
  return SecureStore.getItemAsync(AUTH_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(AUTH_KEY, token);
    return;
  }
  return SecureStore.setItemAsync(AUTH_KEY, token);
}

export async function deleteToken(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.removeItem(AUTH_KEY);
    return;
  }
  return SecureStore.deleteItemAsync(AUTH_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const url = `${getBaseUrl()}/api${path}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error((err as { message?: string }).message ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
