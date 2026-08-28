import Link from "next/link";

export function Logo({ large = false }: { large?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-2xl bg-forest-600 text-white ${large ? "h-12 w-12" : "h-9 w-9"}`}
      >
        <svg viewBox="0 0 24 24" className={large ? "h-7 w-7" : "h-5 w-5"} fill="none">
          <path
            d="M12 3 4.5 6.5V11c0 5 3.2 8.6 7.5 10 4.3-1.4 7.5-5 7.5-10V6.5L12 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M8.5 12.2 11 14.6l4.6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`font-serif tracking-tight ${large ? "text-3xl" : "text-xl"}`}>
        SafeBid
      </span>
    </Link>
  );
}
