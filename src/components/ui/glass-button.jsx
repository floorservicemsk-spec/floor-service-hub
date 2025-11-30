import React from 'react';
import { cn } from "@/lib/utils";

const buttonVariants = {
  primary: [
    "bg-gradient-to-r from-[#0A84FF] to-[#007AFF]", // Apple blue
    "text-white border-[#0A84FF]/30",
    "hover:from-[#0A84FF] hover:to-[#0a6cff]",
    "active:from-[#0a6cff] active:to-[#085ecf]",
    "shadow-[0_0_0_1px_rgba(10,132,255,0.3),0_8px_24px_rgba(16,24,40,0.08)]",
    "hover:shadow-[0_0_0_1px_rgba(10,132,255,0.4),0_12px_35px_rgba(16,24,40,0.12)]"
  ],
  secondary: [
    "bg-white/80",
    "text-slate-900 border-slate-200/60",
    "hover:bg-white/90",
    "active:bg-white/70",
    "shadow-[0_8px_24px_rgba(16,24,40,0.08)]"
  ],
  ghost: [
    "bg-transparent border-transparent",
    "text-slate-700 hover:bg-white/40",
    "active:bg-white/50"
  ],
  danger: [
    "bg-gradient-to-r from-[#C31E2E] to-[#940815]",
    "text-white border-red-400/30",
    "hover:from-[#b01b2a] hover:to-[#850713]",
    "active:from-[#850713] active:to-[#760611]",
    "shadow-[0_0_0_1px_rgba(195,30,46,0.3),0_8px_24px_rgba(16,24,40,0.08)]",
    "hover:shadow-[0_0_0_1px_rgba(195,30,46,0.4),0_12px_35px_rgba(16,24,40,0.12)]"
  ]
};

const Button = React.forwardRef(({ 
  className, 
  variant = "primary", 
  size = "default", 
  ...props 
}, ref) => {
  const Comp = "button";
  const sizeClasses = {
    default: "h-11 px-6 py-2.5",
    sm: "h-9 px-4 py-2",
    lg: "h-13 px-8 py-3",
    icon: "h-11 w-11"
  };
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap",
        "rounded-[14px] text-sm font-medium transition-all duration-200",
        "border backdrop-filter backdrop-blur-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]",
        "disabled:pointer-events-none disabled:opacity-50",
        "animate-scale-active",
        buttonVariants[variant],
        sizeClasses[size],
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };