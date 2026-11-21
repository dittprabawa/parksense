import React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "../icons";

interface CardProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  label?: string;
  value?: string;
  title?: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function Card({
  children,
  icon,
  label,
  value,
  title,
  subtitle,
  trailing,
  href,
  onClick,
  className = "",
}: CardProps) {
  const content = (
    <div
      className={`bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs flex items-center justify-between gap-3.5 transition-colors ${
        href || onClick ? "hover:border-[#D0DBEA] active:bg-[#F9FAFC] cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && <div className="text-[#007AFF] shrink-0">{icon}</div>}
        <div className="min-w-0 flex-1">
          {label && <p className="text-xs text-[#5E6E82] font-normal leading-tight">{label}</p>}
          {value && <p className="text-[15px] font-semibold text-[#0B1222] mt-0.5 truncate">{value}</p>}
          {title && <h3 className="text-base font-semibold text-[#0B1222] leading-snug">{title}</h3>}
          {subtitle && <p className="text-xs text-[#5E6E82] mt-0.5 leading-normal">{subtitle}</p>}
          {children}
        </div>
      </div>
      {(trailing !== undefined) ? (
        <div className="shrink-0 text-[#8E95A5]">{trailing}</div>
      ) : (href || onClick) ? (
        <div className="shrink-0 text-[#8E95A5]">
          <ChevronRightIcon className="w-5 h-5" />
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
