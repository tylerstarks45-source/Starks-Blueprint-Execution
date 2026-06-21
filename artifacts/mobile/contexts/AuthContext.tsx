import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { apiFetch, deleteToken, getToken, setToken } from "@/lib/api";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  subscriptionTier: string;
  credits: number;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

async function registerPushTokenSilently() {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenData.data;

    await apiFetch("/auth/push-token", {
      method: "POST",
      body: JSON.stringify({ expoPushToken }),
    });
  } catch {
    // Non-critical — push token registration failure should not break auth
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadUser() {
    const stored = await getToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: AuthUser }>("/auth/me");
      setUser(data.user);
    } catch {
      await deleteToken();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setToken(data.token);
    setUser(data.user);
    registerPushTokenSilently();
  }

  async function signup(name: string, email: string, password: string) {
    const data = await apiFetch<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    await setToken(data.token);
    setUser(data.user);
    registerPushTokenSilently();
  }

  async function logout() {
    await deleteToken();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/auth/me");
      setUser(data.user);
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
