import type { ReaderBadge } from "../lib/offlineDb";

export function BadgeCard({ badge }: { badge: ReaderBadge }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <div className="grid h-10 w-10 place-items-center border border-signal text-sm font-black text-signal">{badge.icon}</div>
      <h3 className="mt-3 font-black">{badge.title}</h3>
      <p className="mt-1 text-sm leading-6 text-paper/60">{badge.description}</p>
    </div>
  );
}
