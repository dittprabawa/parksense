import React from "react";
import Link from "next/link";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline";
  href?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  href,
  icon,
  fullWidth = true,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold text-base transition-all duration-150 active:scale-[0.98] select-none text-center";
  
  const widthClass = fullWidth ? "w-full" : "";

  let variantClasses = "";
  if (variant === "primary") {
    variantClasses = "bg-[#007AFF] text-white hover:bg-[#006CE2] shadow-sm py-3.5 px-6 rounded-full";
  } else if (variant === "secondary") {
    variantClasses = "bg-[#E8EDF5] text-[#0B1222] hover:bg-[#DDE4F0] py-3.5 px-6 rounded-full";
  } else if (variant === "danger") {
    variantClasses = "bg-transparent border border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5 py-3.5 px-6 rounded-full";
  } else if (variant === "outline") {
    variantClasses = "bg-white border border-[#E3E8EF] text-[#0B1222] hover:bg-gray-50 shadow-xs py-3.5 px-6 rounded-full";
  }

  const combined = `${baseClasses} ${widthClass} ${variantClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combined}>
        {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
        {children}
      </Link>
    );
  }

  return (
    <button className={combined} {...props}>
      {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
      {children}
    </button>
  );
}
