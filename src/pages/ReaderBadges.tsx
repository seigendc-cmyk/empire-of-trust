import { useEffect, useState } from "react";
import { BadgeCard } from "../components/BadgeCard";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getReaderBadges, type ReaderBadge } from "../lib/offlineDb";

export default function ReaderBadges() {
  const [badges, setBadges] = useState<ReaderBadge[] | null>(null);

  useEffect(() => {
    getReaderBadges().then(setBadges);
  }, []);

  if (!badges) return <LoadingState label="Loading badges..." />;

  return (
    <section className="page">
      <PageHeader eyebrow="Reader rewards" title="Badges" subtitle="Local achievement badges earned through reading and participation." actions={[{ label: "Rewards", to: "/reader/rewards" }]} />
      {badges.length === 0 ? <div className="panel p-4 text-sm text-paper/60">No badges earned yet.</div> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {badges.map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
        </div>
      )}
    </section>
  );
}
