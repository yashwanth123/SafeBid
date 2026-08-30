"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Newspaper, Briefcase, Store, UserRound, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

const tabs = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/services", label: "Hire", icon: Store },
  { href: "/profile", label: "You", icon: UserRound },
  { href: "/more", label: "More", icon: Menu },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const publicRoutes = ["/", "/login", "/register"];
  const isPublic = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace("/login");
    }
  }, [loading, user, isPublic, router]);

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-[#0c1611] dark:text-paper">
      <header className="sticky top-0 z-30 border-b border-forest-100/80 bg-paper/80 backdrop-blur dark:border-forest-800 dark:bg-[#0c1611]/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {user &&
              tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm",
                    pathname.startsWith(tab.href)
                      ? "bg-forest-600 text-white"
                      : "text-forest-700 hover:bg-forest-100 dark:text-forest-100 dark:hover:bg-forest-800",
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm",
                  pathname.startsWith("/admin")
                    ? "bg-clay text-white"
                    : "text-clay hover:bg-orange-50",
                )}
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!user && (
              <Link href="/login" className="text-sm font-medium text-forest-700 dark:text-forest-100">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:pb-12">{children}</main>
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-forest-100 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-forest-800 dark:bg-[#0c1611]/95">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 text-[11px]",
                    active ? "text-forest-600 dark:text-forest-200" : "text-forest-700/50",
                  )}
                >
                  <Icon size={20} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
