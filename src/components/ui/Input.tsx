"use client";

import React from "react";
import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "border border-slate-300 rounded-lg px-3 py-2 text-sm",
            "focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none",
            "disabled:bg-slate-50 disabled:text-slate-500",
            "placeholder:text-slate-400",
            "transition-colors",
            error && "border-red-500 focus:border-red-500 focus:ring-red-100",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {helper && !error && (
          <p className="text-xs text-slate-500">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
