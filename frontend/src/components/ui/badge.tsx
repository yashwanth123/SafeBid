import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "sage",
  className,
}: {
  children: React.ReactNode;
  tone?: "sage" | "clay" | "muted" | "verified";
  className?: string;
}) {
  const tones = {
    sage: "bg-forest-100 text-forest-700 dark:bg-forest-800 dark:text-forest-100",
    clay: "bg-orange-100 text-clay",
    muted: "bg-stone-100 text-stone-600 dark:bg-forest-900 dark:text-forest-200",
    verified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
