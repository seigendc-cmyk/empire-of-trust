export function SponsoredBadge({ label = "Sponsored" }: { label?: "Featured" | "Sponsored" | "Verified" | "Premium Partner" | string }) {
  return (
    <span className="inline-flex w-fit border border-signal bg-signal/10 px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-signal">
      {label}
    </span>
  );
}
