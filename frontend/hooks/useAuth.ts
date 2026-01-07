"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores";
import { api } from "@/lib/api";

export function useAuth(requireAuth = false) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, isLoading, setUser, setTokens, logout, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && requireAuth && !user) {
      const returnUrl = pathname ? `?returnUrl=${encodeURIComponent(pathname)}` : "";
      router.push(`/login${returnUrl}`);
    }
  }, [isLoading, requireAuth, user, router, pathname]);

  const login = async (email: string, password: string) => {
    const tokens = await api.login(email, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    const userData = await api.getCurrentUser();
    setUser(userData);
    return userData;
  };

  const register = async (data: { email: string; password: string; username: string; display_name?: string }) => {
    await api.register(data);
    return login(data.email, data.password);
  };

  const signOut = () => {
    logout();
    router.push("/");
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout: signOut,
  };
}
