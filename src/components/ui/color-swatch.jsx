import React from 'react';
import { cn } from "@/lib/utils";

const ColorSwatch = ({ color, size = 24, className, ...props }) => {
  return (
    <div 
      className={cn(
        "rounded-lg border-2 border-white/60 shadow-[0_2px_8px_rgba(16,24,40,0.08)]",
        "backdrop-blur-sm ring-1 ring-slate-200/20",
        className
      )}
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: color 
      }}
      {...props}
    />
  );
};

export { ColorSwatch };