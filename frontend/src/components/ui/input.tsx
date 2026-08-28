import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-forest-200 bg-white/80 px-4 text-sm outline-none ring-forest-400 placeholder:text-forest-700/40 focus:ring-2 dark:border-forest-700 dark:bg-forest-800/70 dark:text-paper",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
