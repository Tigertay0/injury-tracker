// transitions.dev "Success check" (10). Mounted when a save succeeds.
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <span className={`t-success-check ${className ?? ''}`} data-state="in" aria-hidden>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4.5 10.5 8.25 14 15.5 6.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
