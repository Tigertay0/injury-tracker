// Loading state shaped like the dashboard; the pulse is transitions.dev
// "Skeleton loader" (14), stopped under reduced motion.
export function AppSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10" role="status" aria-label="Loading your data">
      <div className="t-skel-skeleton is-pulsing relative! flex flex-col gap-4">
        <div className="h-9 w-48 rounded-[var(--radius-control)] bg-sunken" />
        <div className="h-48 rounded-[var(--radius-panel)] bg-sunken" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[var(--radius-panel)] bg-sunken" />
          ))}
        </div>
        <div className="h-64 rounded-[var(--radius-panel)] bg-sunken" />
      </div>
    </div>
  );
}
