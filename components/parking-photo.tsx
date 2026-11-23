"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props { path?: string; preview?: string; alt: string; className?: string }

export function ParkingPhoto({ path, preview, alt, className }: Props) {
  const [result, setResult] = useState({ path: "", url: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!path || preview) return;
    let current = true;
    let url = "";
    async function load() {
      try {
        const { data, error } = await supabase().storage.from("parking-photos").download(path!);
        if (error) throw error;
        if (!current) return;
        url = URL.createObjectURL(data);
        setResult({ path: path!, url });
      } catch {
        if (current) setResult({ path: path!, url: "" });
      }
    }
    void load();
    return () => { current = false; if (url) URL.revokeObjectURL(url); };
  }, [path, preview, attempt]);
  const src = preview || (result.path === path ? result.url : "");
  if (src) return <Image src={src} fill alt={alt} className={className} unoptimized />;
  const failed = Boolean(path && path === result.path);
  return <span className="absolute inset-0 grid place-items-center text-center text-xs text-gray-500">
    {failed ? <span>Photo unavailable</span> : path ? "Loading photo…" : "No photo"}
    {failed && <button type="button" className="text-[#007AFF]" onClick={e => {
      e.preventDefault(); setResult({ path: "", url: "" }); setAttempt(n => n + 1);
    }}>Retry photo</button>}
  </span>;
}
