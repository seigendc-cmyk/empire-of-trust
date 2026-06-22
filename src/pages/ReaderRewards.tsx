import { useEffect, useState } from "react";
import { BadgeCard } from "../components/BadgeCard";
import { PageHeader } from "../components/PageHeader";
import { PointsSummary } from "../components/PointsSummary";
import { LoadingState } from "../components/States";
import { getReaderRewardsSummary, type ReaderBadge, type ReaderChoice, type ReaderParticipation, type ReaderReward } from "../lib/offlineDb";

interface RewardsSummary {
  rewards: ReaderReward[];
  badges: ReaderBadge[];
  totalPoints: number;
  episodesCompleted: number;
  predictions: ReaderChoice[];
  participation: ReaderParticipation[];
}

export default function ReaderRewards() {
  const [summary, setSummary] = useState<RewardsSummary | null>(null);

  useEffect(() => {
    getReaderRewardsSummary().then(setSummary);
  }, []);

  if (!summary) return <LoadingState label="Loading rewards..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Reader rewards" title="Rewards" subtitle="Local points, badges, completed episodes, predictions, and participation history." actions={[{ label: "Profile", to: "/reader/profile" }]} />
      <PointsSummary totalPoints={summary.totalPoints} episodesCompleted={summary.episodesCompleted} predictionsSubmitted={summary.predictions.length} choicesMade={summary.participation.length} />
      <section className="panel p-4">
        <h2 className="text-xl font-black">Reward history</h2>
        {summary.rewards.length === 0 ? <p className="mt-3 text-sm text-paper/60">No rewards earned yet.</p> : (
          <div className="mt-4 grid gap-3">
            {summary.rewards.map((reward) => (
              <div key={reward.id} className="border border-white/10 bg-black/20 p-3">
                <p className="text-lg font-black text-signal">+{reward.points}</p>
                <h3 className="font-black">{reward.title}</h3>
                <p className="mt-1 text-sm text-paper/60">{reward.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Badges</h2>
        {summary.badges.length === 0 ? <p className="mt-3 text-sm text-paper/60">No badges yet.</p> : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {summary.badges.map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
          </div>
        )}
      </section>
    </section>
  );
}
