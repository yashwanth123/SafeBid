const steps = ["CREATED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "REVIEWED"] as const;

export function BookingTimeline({ status }: { status: string }) {
  const current = steps.indexOf(status as (typeof steps)[number]);
  const cancelled = status === "CANCELLED";
  return (
    <ol className="grid grid-cols-5 gap-1">
      {steps.map((step, i) => (
        <li key={step} className="text-center">
          <div
            className={`mx-auto h-1.5 rounded-full ${
              cancelled ? "bg-stone-300" : i <= current ? "bg-forest-500" : "bg-forest-100 dark:bg-forest-800"
            }`}
          />
          <div className="mt-1 text-[10px] uppercase tracking-wide text-forest-700/60">
            {step.replace("_", " ").toLowerCase()}
          </div>
        </li>
      ))}
    </ol>
  );
}
