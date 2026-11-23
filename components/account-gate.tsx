"use client";

import { createContext, Fragment, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { cloudConfigured, supabase } from "@/lib/supabase";
import { MobileShell } from "./mobile-shell";

const Account = createContext<User | null>(null);

export function useAccount() {
  const user = useContext(Account);
  if (!user) throw new Error("Sign in to continue.");
  return user;
}

export function AccountGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);
  const isPublic = path === "/" || path === "/login";
  useEffect(() => {
    if (!cloudConfigured) return;
    const { data } = supabase().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (ready && !user && !isPublic) router.replace("/login");
    if (ready && user && path === "/login") router.replace("/home");
  }, [ready, user, isPublic, path, router]);
  if (!isPublic && (!ready || !user)) {
    return <MobileShell><p role="status">Checking your account…</p></MobileShell>;
  }
  return <Account.Provider value={user}><Fragment key={user?.id ?? "guest"}>{children}</Fragment></Account.Provider>;
}
