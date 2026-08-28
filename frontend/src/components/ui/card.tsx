import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-forest-100 bg-white/80 p-5 shadow-lift backdrop-blur dark:border-forest-800 dark:bg-forest-800/50",
        className,
      )}
    >
      {children}
    </div>
  );
}
