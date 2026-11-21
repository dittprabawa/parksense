import React from "react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function FormField({ icon, action, className = "", ...props }: FormFieldProps) {
  return (
    <div className="relative flex items-center bg-white rounded-2xl border border-[#E3E8EF] px-4 py-3.5 shadow-xs focus-within:border-[#007AFF] focus-within:ring-2 focus-within:ring-[#007AFF]/20 transition-all">
      {icon && <span className="text-[#8E95A5] mr-3 shrink-0">{icon}</span>}
      <input
        className={`w-full bg-transparent text-[#0B1222] text-base placeholder-[#8E95A5] focus:outline-none ${className}`}
        {...props}
      />
      {action && <span className="ml-2 shrink-0">{action}</span>}
    </div>
  );
}
