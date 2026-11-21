"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, AppleIcon, GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("Raditya");
  const [password, setPassword] = useState("password123");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/home");
  };

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 justify-between py-2">
        <div>
          {/* Top Branding */}
          <div className="flex flex-col items-center pt-2 pb-4">
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

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#0B1222]">Welcome Back</h1>
            <p className="text-sm text-[#5E6E82] mt-1">Log in to your ParkSense account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <FormField
              icon={<MailIcon className="w-5 h-5" />}
              type="text"
              placeholder="Email or Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <FormField
              icon={<LockIcon className="w-5 h-5" />}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              <Link
                href="/home"
                className="text-sm font-semibold text-[#007AFF] hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary">
                Log In
              </Button>
            </div>
          </form>

          {/* Social Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E3E8EF]" />
            </div>
            <span className="relative bg-[#F6F8FD] px-4 text-xs font-medium text-[#8E95A5]">
              or
            </span>
          </div>

          {/* Social Logins */}
          <div className="space-y-3">
            <Button
              variant="outline"
              href="/home"
              icon={<AppleIcon className="w-5 h-5 text-[#0B1222]" />}
            >
              Continue with Apple
            </Button>

            <Button
              variant="outline"
              href="/home"
              icon={<GoogleIcon className="w-5 h-5" />}
            >
              Continue with Google
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 pb-2 text-sm text-[#5E6E82]">
          Don&apos;t have an account?{" "}
          <Link href="/home" className="font-semibold text-[#0B1222] hover:text-[#007AFF]">
            Sign Up
          </Link>
        </div>
      </div>
    </MobileShell>
  );
}
