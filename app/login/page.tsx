"use client";

import { useState } from "react";
import Image from "next/image";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { MailIcon, LockIcon } from "@/components/icons";
import { cloudConfigured, messageOf, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const auth = supabase().auth;
      if (register) {
        const { data, error } = await auth.signUp({ email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin + "/login" } });
        if (error) throw error;
        if (!data.session) setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(messageOf(error));
    } finally {
      setBusy(false);
    }
  }
  return <MobileShell><div className="flex flex-col flex-1 justify-center gap-5">
    <Image src="/parksense-icon.svg" width={56} height={56} alt="ParkSense" className="object-contain" unoptimized />
    <h1 className="text-2xl font-bold">{register ? "Create an account" : "Sign in to ParkSense"}</h1>
    <form onSubmit={submit} className="space-y-3">
      <FormField icon={<MailIcon />} type="email" aria-label="Email" placeholder="Email" autoComplete="email"
        value={email} onChange={e => setEmail(e.target.value)} required />
      <FormField icon={<LockIcon />} type="password" aria-label="Password" placeholder="Password"
        autoComplete={register ? "new-password" : "current-password"} value={password}
        onChange={e => setPassword(e.target.value)} required />
      {!cloudConfigured && <p role="alert">Supabase is not configured. Add the project URL and publishable key and rebuild the app.</p>}
      {message && <p role="status">{message}</p>}
      <Button type="submit" disabled={busy || !cloudConfigured}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</Button>
    </form>
    <button className="text-[#007AFF]" onClick={() => { setRegister(!register); setMessage(""); }}>
      {register ? "Already registered? Sign in" : "Create an account"}
    </button>
  </div></MobileShell>;
}