"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, AppleIcon, GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("Raditya");
  const [password, setPassword] = useState("demo123");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/home");
  };

  const handleDemoAccess = () => {
    router.push("/home");
  };

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 justify-between py-2">
        <div>
          {/* Top Branding */}
          <div className="flex flex-col items-center pt-2 pb-3">
            <Image
              src="/parksense-mark.png"
              width={56}
              height={56}
              alt="ParkSense Logo"
              priority
              unoptimized
            />
            <h2 className="text-xl font-bold text-[#0B1222] mt-2 tracking-tight">ParkSense</h2>
          </div>

          {/* Demo Notice Banner */}
          <div className="mb-4 bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-2xl p-3 text-center">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#007AFF] text-white text-[10px] font-bold tracking-wide uppercase mb-1">
              Demo Access
            </div>
            <p className="text-xs text-[#0B1222] font-medium leading-snug">
              STACK 2026 Hackathon Mode
            </p>
            <p className="text-[11px] text-[#5E6E82] mt-0.5">
              No real credentials or database authentication required.
            </p>
          </div>

          {/* Heading */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-[#0B1222]">Welcome Back</h1>
            <p className="text-sm text-[#5E6E82] mt-0.5">Enter demo mode to test parking spot flows</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField
              icon={<MailIcon className="w-5 h-5" />}
              type="text"
              placeholder="Demo Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-label="Demo Username"
              required
            />

            <FormField
              icon={<LockIcon className="w-5 h-5" />}
              type={showPassword ? "text" : "password"}
              placeholder="Demo Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Demo Password"
              required
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#8E95A5] hover:text-[#5E6E82] focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              }
            />

            <div className="text-right pt-0.5">
              <button
                type="button"
                onClick={handleDemoAccess}
                className="text-xs font-semibold text-[#007AFF] hover:underline"
              >
                Quick Demo Access →
              </button>
            </div>

            <div className="pt-1 space-y-2">
              <Button type="submit" variant="primary">
                Enter Demo Mode
              </Button>
            </div>
          </form>

          {/* Social Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E3E8EF]" />
            </div>
            <span className="relative bg-[#F6F8FD] px-4 text-xs font-medium text-[#8E95A5]">
              or quick sign-in
            </span>
          </div>

          {/* Social Logins (Demo Shortcuts) */}
          <div className="space-y-2.5">
            <Button
              variant="outline"
              onClick={handleDemoAccess}
              icon={<AppleIcon className="w-5 h-5 text-[#0B1222]" />}
            >
              Continue as Demo (Apple)
            </Button>

            <Button
              variant="outline"
              onClick={handleDemoAccess}
              icon={<GoogleIcon className="w-5 h-5" />}
            >
              Continue as Demo (Google)
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-2 text-xs text-[#5E6E82]">
          STACK 2026 Hackathon Prototype ·{" "}
          <button
            type="button"
            onClick={handleDemoAccess}
            className="font-semibold text-[#007AFF] hover:underline"
          >
            Direct to Home
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
