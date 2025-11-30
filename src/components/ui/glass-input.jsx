import React from 'react';
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[14px] border px-4 py-2.5 text-sm",
        "bg-white/60 border-white/60 backdrop-blur-sm",
        "placeholder:text-slate-500",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-200",
        "shadow-[0_2px_8px_rgba(16,24,40,0.04)]",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-[14px] border px-4 py-3 text-sm",
        "bg-white/60 border-white/60 backdrop-blur-sm",
        "placeholder:text-slate-500",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent", 
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-none transition-all duration-200",
        "shadow-[0_2px_8px_rgba(16,24,40,0.04)]",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Input, Textarea };