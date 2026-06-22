import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getStudioCommunityAnalytics } from "../lib/communityRepository";

type Analytics = Awaited<ReturnType<typeof getStudioCommunityAnalytics>>;

export default function StudioCommunity() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    getStudioCommunityAnalytics().then(setData);
  }, []);

  if (!data) return <LoadingState label="Loading community analytics..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Studio Community"
        title="Reader influence analytics"
        subtitle="Offline-first view of active readers, participation trends, story votes, popular episodes, and independent Library booklets."
        actions={[{ label: "Participation", to: "/participation", primary: true }, { label: "Rankings", to: "/participation/rankings" }]}
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Active readers" value={data.activeReaders} />
        <Metric label="Daily readers" value={data.dailyReaders} />
        <Metric label="Weekly readers" value={data.weeklyReaders} />
        <Metric label="Story votes" value={data.storyVotes} />
        <Metric label="Episode packs" value={data.importedEpisodes} />
        <Metric label="Booklet packs" value={data.importedBooklets} />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <PanelList title="Top readers" rows={data.topReaders.map((reader) => [reader.displayName, `${reader.currentRank} / ${reader.rewardPoints} points / ${reader.badges.length} badges`])} />
        <PanelList title="Country distribution" rows={data.countryDistribution.map(([country, count]) => [country, `${count} readers`])} />
        <PanelList title="Participation trends" rows={data.participationTrends.map(([event, count]) => [event, `${count} actions`])} />
        <PanelList title="Popular episodes" rows={data.popularEpisodes.map(([episodeId, count]) => [episodeId, `${count} actions`])} />
        <PanelList title="Popular booklets" rows={data.popularBooklets.map(([bookletId, count]) => [bookletId, `${count} actions`])} />
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="panel p-4">
      <p className="text-2xl font-black text-signal">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p>
    </article>
  );
}

function PanelList({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 p-3">
            <span className="min-w-0 break-words text-sm font-bold text-paper/75">{label || "Unknown"}</span>
            <span className="shrink-0 text-sm font-black text-signal">{value}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-paper/60">No data yet.</p>}
      </div>
    </section>
  );
}
