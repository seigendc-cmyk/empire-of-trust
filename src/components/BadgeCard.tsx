import type { ReaderBadge } from "../lib/offlineDb";

export function BadgeCard({ badge }: { badge: ReaderBadge }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <div className="text-accent grid h-10 w-10 place-items-center border border-signal text-sm font-black">{badge.icon}</div>
      <h3 className="text-app mt-3 font-black">{badge.title}</h3>
      <p className="text-muted mt-1 text-sm leading-6">{badge.description}</p>
    </div>
  );
}
