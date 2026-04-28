import React from "react";
import { cn } from "../lib/cn";

export function Button({ className, variant = "primary", size = "md", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900"
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base"
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

