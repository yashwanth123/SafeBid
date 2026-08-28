import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-2xl border border-forest-200 bg-white/80 px-4 py-3 text-sm outline-none ring-forest-400 placeholder:text-forest-700/40 focus:ring-2 dark:border-forest-700 dark:bg-forest-800/70",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
