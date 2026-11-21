import React from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "./icons";

interface TopHeaderProps {
  title: string;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export function TopHeader({ title, backHref, rightAction }: TopHeaderProps) {
  return (
    <header className="relative flex items-center justify-between h-11 mb-3 shrink-0">
      <div className="w-10 flex items-center">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center justify-center -ml-2 p-2 text-[#007AFF] active:opacity-60 transition-opacity"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </Link>
        )}
      </div>
      <h1 className="text-lg font-bold text-[#0B1222] text-center tracking-tight truncate flex-1">
        {title}
      </h1>
      <div className="w-10 flex items-center justify-end">
        {rightAction}
      </div>
    </header>
  );
}
