import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCard } from "../components/BadgeCard";
import { PageHeader } from "../components/PageHeader";
import { PointsSummary } from "../components/PointsSummary";
import { ReaderIdentityCard } from "../components/ReaderIdentityCard";
import { LoadingState } from "../components/States";
import { getReaderProfileSummary, resetLocalReaderData, updateReaderIdentity, type ReaderBadge, type ReaderIdentity } from "../lib/offlineDb";

interface Summary {
  identity: ReaderIdentity;
  totalPoints: number;
  badges: ReaderBadge[];
  episodesCompleted: number;
  predictionsSubmitted: number;
  choicesMade: number;
  participationScore: number;
  localSyncStatus: string;
}

export default function ReaderProfile() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const next = await getReaderProfileSummary();
    setSummary(next);
    setDisplayName(next.identity.displayName ?? "");
  }

  useEffect(() => {
    load();
  }, []);

  if (!summary) return <LoadingState label="Loading reader profile..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="ReaderID"
        title="Reader profile"
        subtitle="Local identity, rewards, badges, and participation profile for this installed PWA."
        actions={[
          { label: "Rewards", to: "/reader/rewards", primary: true },
          { label: "Participation", to: "/reader/participation" },
        ]}
      />
      <ReaderIdentityCard identity={summary.identity} />
      <PointsSummary totalPoints={summary.totalPoints} episodesCompleted={summary.episodesCompleted} predictionsSubmitted={summary.predictionsSubmitted} choicesMade={summary.choicesMade} />
      <section className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Participation score</h2>
          <span className="border border-signal px-3 py-2 text-lg font-black text-signal">{summary.participationScore}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-paper/60">Local sync status: {summary.localSyncStatus}. Future Firestore synchronization can use these local records.</p>
      </section>
      <form
        className="panel grid gap-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          await updateReaderIdentity({ displayName });
          await load();
          setSaving(false);
        }}
      >
        <h2 className="text-xl font-black">Display name</h2>
        <input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Optional reader name" />
        <button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
      </form>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Badges</h2>
        {summary.badges.length === 0 ? (
          <p className="mt-3 text-sm text-paper/60">No badges earned yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {summary.badges.map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
          </div>
        )}
      </section>
      <section className="panel border-signal p-4">
        <h2 className="text-xl font-black">Local privacy</h2>
        <p className="mt-3 text-sm leading-6 text-paper/65">
          Reader activity is stored locally first. When online, participation can sync to the Empire of Trust cloud. No login is required for reading.
        </p>
        <button
          className="btn mt-5 w-full border-ember bg-ember/20 hover:bg-ember hover:text-paper"
          onClick={async () => {
            if (!window.confirm("Reset all local reader data on this device? Imported packs, ReaderID, progress, rewards, and logs will be cleared.")) return;
            await resetLocalReaderData();
            navigate("/reader");
          }}
          type="button"
        >
          Reset local reader data
        </button>
      </section>
    </section>
  );
}
