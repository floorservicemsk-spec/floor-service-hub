import React from 'react';
import { cn } from "@/lib/utils";

const badgeVariants = {
  success: [
    "bg-gradient-to-r from-green-100/80 to-emerald-100/80",
    "text-emerald-800 border-emerald-200/60",
    "backdrop-blur-sm"
  ],
  neutral: [
    "bg-gradient-to-r from-gray-100/80 to-slate-100/80", 
    "text-slate-700 border-slate-200/60",
    "backdrop-blur-sm"
  ],
  danger: [
    "bg-gradient-to-r from-red-100/80 to-rose-100/80",
    "text-red-800 border-red-200/60", 
    "backdrop-blur-sm"
  ],
  accent: [
    "bg-gradient-to-r from-blue-100/80 to-indigo-100/80",
    "text-blue-800 border-blue-200/60",
    "backdrop-blur-sm"
  ]
};

function Badge({ className, variant = "neutral", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-0.5",
        "text-xs font-medium transition-colors",
        "shadow-[0_2px_8px_rgba(16,24,40,0.04)]",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };