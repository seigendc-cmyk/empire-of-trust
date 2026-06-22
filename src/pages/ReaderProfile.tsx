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
  bookletsCompleted: number;
  quizzesCompleted: number;
  whatsappInteractions: number;
  predictionsSubmitted: number;
  choicesMade: number;
  participationScore: number;
  syncSummary: { pending: number; synced: number; failed: number };
  localSyncStatus: string;
}

export default function ReaderProfile() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const next = await getReaderProfileSummary();
    setSummary(next);
    setDisplayName(next.identity.displayName ?? "");
    setPhone(next.identity.phone ?? "");
    setCity(next.identity.city ?? "");
    setCountry(next.identity.country ?? "");
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
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Booklets", summary.bookletsCompleted],
          ["Quizzes", summary.quizzesCompleted],
          ["WhatsApp", summary.whatsappInteractions],
          ["Sync pending", summary.syncSummary.pending],
        ].map(([label, value]) => (
          <div key={label} className="panel p-4">
            <p className="text-accent text-2xl font-black">{value}</p>
            <p className="text-muted mt-1 text-xs font-bold uppercase tracking-[0.12em]">{label}</p>
          </div>
        ))}
      </section>
      <section className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Participation score</h2>
          <span className="text-success border border-current px-3 py-2 text-lg font-black">{summary.participationScore}</span>
        </div>
        <p className="text-muted mt-3 text-sm leading-6">Sync status: {summary.localSyncStatus}. Activity writes locally first, then syncs to Firestore when Firebase and network are available.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em]">
          <span className="border-app surface-muted border px-3 py-2">Synced {summary.syncSummary.synced}</span>
          <span className="border-app surface-muted border px-3 py-2">Pending {summary.syncSummary.pending}</span>
          <span className={`border px-3 py-2 ${summary.syncSummary.failed ? "border-ember bg-ember/10 text-ember" : "border-app surface-muted"}`}>Failed {summary.syncSummary.failed}</span>
        </div>
      </section>
      <form
        className="panel grid gap-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          await updateReaderIdentity({ displayName, phone, city, country });
          await load();
          setSaving(false);
        }}
      >
        <h2 className="text-xl font-black">Reader details</h2>
        <label>
          <span className="label">Display name</span>
          <input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Optional reader name" />
        </label>
        <label>
          <span className="label">Phone</span>
          <input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional phone number" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">City</span>
            <input className="field" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Optional city" />
          </label>
          <label>
            <span className="label">Country</span>
            <input className="field" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Optional country" />
          </label>
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
      </form>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Badges</h2>
        {summary.badges.length === 0 ? (
          <p className="text-muted mt-3 text-sm">No badges earned yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {summary.badges.map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
          </div>
        )}
      </section>
      <section className="panel border-signal p-4">
        <h2 className="text-xl font-black">Local privacy</h2>
        <p className="text-muted mt-3 text-sm leading-6">
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
