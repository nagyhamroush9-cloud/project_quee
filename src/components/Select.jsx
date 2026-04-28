import React from "react";
import { cn } from "../lib/cn";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

