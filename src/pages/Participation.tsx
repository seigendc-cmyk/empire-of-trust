import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCard } from "../components/BadgeCard";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import {
  communityBadges,
  getParticipationDashboard,
  getParticipationRankings,
  recordCommunityAction,
  saveCommunityProfile,
  submitStoryVote,
  syncCommunityActivity,
} from "../lib/communityRepository";
import type { ReaderActivityLog, ReaderBadge, ReaderProfileRecord, ReaderReward, StoryVote } from "../lib/offlineDb";

type View = "home" | "profile" | "rewards" | "badges" | "rankings" | "history";
type Dashboard = Awaited<ReturnType<typeof getParticipationDashboard>>;

export default function Participation({ view = "home" }: { view?: View }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setData(await getParticipationDashboard());
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) return <LoadingState label="Loading participation engine..." />;

  const title = view === "home" ? "Participation" : view[0].toUpperCase() + view.slice(1);

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Reader Influence Engine"
        title={title}
        subtitle="Persistent ReaderID, reputation, rewards, community activity, and future storyline influence. Works offline and syncs when online."
        actions={[
          { label: "Profile", to: "/participation/profile", primary: view !== "profile" },
          { label: "Rankings", to: "/participation/rankings" },
          { label: "Sync", onClick: async () => {
            const result = await syncCommunityActivity();
            setMessage(result.skipped ? "Sync queued. Go online with Firebase configured to upload activity." : `${result.synced} queued items synced.`);
            await load();
          } },
        ]}
      />
      {message && <div className="border border-signal bg-signal/10 p-3 text-sm font-semibold text-signal">{message}</div>}
      {view === "home" && <ParticipationHome data={data} onRefresh={load} />}
      {view === "profile" && <ParticipationProfile profile={data.profile} onSaved={load} />}
      {view === "rewards" && <Rewards rewards={data.rewards} />}
      {view === "badges" && <Badges badges={data.badges} />}
      {view === "rankings" && <Rankings />}
      {view === "history" && <History history={data.history} storyVotes={data.storyVotes} />}
    </section>
  );
}

function ParticipationHome({ data, onRefresh }: { data: Dashboard; onRefresh: () => Promise<void> }) {
  return (
    <>
      <MetricGrid profile={data.profile} pendingQueue={data.pendingQueue} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link className="panel block p-4 hover:bg-white/5" to="/participation/profile"><h2 className="text-xl font-black">Reader Profile</h2><p className="mt-2 text-sm leading-6 text-paper/60">Country, city, avatar, rank, and ReaderID.</p></Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/participation/rewards"><h2 className="text-xl font-black">Rewards</h2><p className="mt-2 text-sm leading-6 text-paper/60">Points from reading, votes, quizzes, and invites.</p></Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/participation/badges"><h2 className="text-xl font-black">Badges</h2><p className="mt-2 text-sm leading-6 text-paper/60">Earn Early Reader, Investor Mind, Top Reader, and more.</p></Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/participation/history"><h2 className="text-xl font-black">History</h2><p className="mt-2 text-sm leading-6 text-paper/60">Offline activity queue and story influence actions.</p></Link>
      </section>
      <StoryVotePanel onSaved={onRefresh} />
      <section className="panel grid gap-3 p-4 sm:grid-cols-3">
        <button className="btn" type="button" onClick={async () => { await recordCommunityAction("community_participation"); await onRefresh(); }}>Community participation</button>
        <button className="btn" type="button" onClick={async () => { await recordCommunityAction("invite_accepted"); await onRefresh(); }}>Invite accepted</button>
        <button className="btn" type="button" onClick={async () => { await recordCommunityAction("content_reviewed"); await onRefresh(); }}>Review content</button>
      </section>
    </>
  );
}

function MetricGrid({ profile, pendingQueue }: { profile: ReaderProfileRecord; pendingQueue: number }) {
  const items = [
    ["Rank", profile.currentRank],
    ["Points", profile.rewardPoints],
    ["Reputation", profile.reputationScore],
    ["Pending sync", pendingQueue],
    ["Episodes", profile.episodeCount],
    ["Booklets", profile.bookletCount],
    ["Quizzes", profile.quizCount],
    ["Badges", profile.badges.length],
  ];
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <article key={label} className="panel p-4">
          <p className="break-words text-2xl font-black text-signal">{value}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p>
        </article>
      ))}
    </section>
  );
}

function ParticipationProfile({ profile, onSaved }: { profile: ReaderProfileRecord; onSaved: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [country, setCountry] = useState(profile.country);
  const [city, setCity] = useState(profile.city);
  return (
    <>
      <MetricGrid profile={profile} pendingQueue={0} />
      <form className="panel grid gap-3 p-4 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        await saveCommunityProfile({ displayName, avatar, country, city });
        await onSaved();
      }}>
        <label><span className="label">Display name</span><input className="field" value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} /></label>
        <label><span className="label">Avatar URL</span><input className="field" value={avatar} onChange={(event) => setAvatar(event.currentTarget.value)} /></label>
        <label><span className="label">Country</span><input className="field" value={country} onChange={(event) => setCountry(event.currentTarget.value)} /></label>
        <label><span className="label">City</span><input className="field" value={city} onChange={(event) => setCity(event.currentTarget.value)} /></label>
        <div className="md:col-span-2">
          <p className="mb-3 break-all text-xs font-semibold uppercase tracking-[0.12em] text-paper/45">ReaderID: {profile.readerId}</p>
          <button className="btn btn-primary" type="submit">Save community profile</button>
        </div>
      </form>
    </>
  );
}

function Rewards({ rewards }: { rewards: ReaderReward[] }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">Point history</h2>
      <div className="mt-4 grid gap-3">
        {rewards.map((reward) => (
          <div key={reward.id} className="border border-white/10 bg-black/20 p-3">
            <p className="text-lg font-black text-signal">+{reward.points}</p>
            <h3 className="font-black">{reward.title}</h3>
            <p className="mt-1 text-sm text-paper/60">{reward.description}</p>
          </div>
        ))}
        {rewards.length === 0 && <p className="text-sm text-paper/60">No rewards yet.</p>}
      </div>
    </section>
  );
}

function Badges({ badges }: { badges: ReaderBadge[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {communityBadges.map((badge) => {
        const earned = badges.find((item) => item.badgeCode === badge.badgeCode);
        return earned ? <BadgeCard key={badge.badgeCode} badge={earned} /> : (
          <article key={badge.badgeCode} className="border border-white/10 bg-black/20 p-3 opacity-70">
            <div className="grid h-10 w-10 place-items-center border border-white/15 text-sm font-black text-paper/50">{badge.icon}</div>
            <h3 className="mt-3 font-black">{badge.title}</h3>
            <p className="mt-1 text-sm leading-6 text-paper/60">{badge.description}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-paper/40">Locked</p>
          </article>
        );
      })}
    </section>
  );
}

function Rankings() {
  const [scope, setScope] = useState<"global" | "country" | "city">("global");
  const [rows, setRows] = useState<ReaderProfileRecord[]>([]);

  useEffect(() => {
    getParticipationRankings(scope).then(setRows);
  }, [scope]);

  return (
    <section className="grid gap-4">
      <div className="panel flex gap-2 overflow-x-auto p-3">
        {(["global", "country", "city"] as const).map((item) => <button key={item} className={`btn shrink-0 ${scope === item ? "btn-primary" : ""}`} onClick={() => setScope(item)} type="button">{item}</button>)}
      </div>
      <section className="panel divide-y divide-white/10">
        {rows.map((reader, index) => (
          <article key={reader.readerId} className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <p className="text-2xl font-black text-signal">#{index + 1}</p>
            <div>
              <h2 className="font-black">{reader.displayName}</h2>
              <p className="text-sm text-paper/60">{reader.currentRank} / {reader.country || "Unknown"} / {reader.city || "Unknown"}</p>
            </div>
            <p className="text-sm font-bold text-paper/70">{reader.rewardPoints} points / {reader.badges.length} badges</p>
          </article>
        ))}
        {rows.length === 0 && <p className="p-4 text-sm text-paper/60">No rankings yet. Save your profile or sync online activity.</p>}
      </section>
    </section>
  );
}

function History({ history, storyVotes }: { history: ReaderActivityLog[]; storyVotes: StoryVote[] }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <section className="panel p-4">
        <h2 className="text-xl font-black">Participation history</h2>
        <div className="mt-4 grid gap-3">
          {history.map((item) => (
            <div key={item.id} className="border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{item.eventType}</p>
              <p className="mt-2 text-sm text-paper/60">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Story influence votes</h2>
        <div className="mt-4 grid gap-3">
          {storyVotes.map((vote) => (
            <div key={vote.id} className="border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{vote.voteType}</p>
              <h3 className="mt-2 font-black">{vote.voteValue}</h3>
              <p className="mt-2 text-sm text-paper/60">{vote.episodeId} / {new Date(vote.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {storyVotes.length === 0 && <p className="text-sm text-paper/60">No story votes yet.</p>}
        </div>
      </section>
    </section>
  );
}

function StoryVotePanel({ onSaved }: { onSaved: () => Promise<void> }) {
  const [episodeId, setEpisodeId] = useState("");
  const [voteType, setVoteType] = useState("story_direction");
  const [voteValue, setVoteValue] = useState("");
  return (
    <form className="panel grid gap-3 p-4 md:grid-cols-3" onSubmit={async (event) => {
      event.preventDefault();
      await submitStoryVote({ episodeId, voteType, voteValue });
      setVoteValue("");
      await onSaved();
    }}>
      <div className="md:col-span-3">
        <h2 className="text-xl font-black">Future story influence</h2>
        <p className="mt-2 text-sm leading-6 text-paper/60">Vote on business decisions, future story directions, character decisions, and investment options. Votes are stored offline and synced later.</p>
      </div>
      <label><span className="label">Episode ID</span><input className="field" value={episodeId} onChange={(event) => setEpisodeId(event.currentTarget.value)} placeholder="future or episode id" /></label>
      <label><span className="label">Vote type</span><select className="field" value={voteType} onChange={(event) => setVoteType(event.currentTarget.value)}><option value="business_decision">Business decision</option><option value="story_direction">Story direction</option><option value="character_decision">Character decision</option><option value="investment_option">Investment option</option></select></label>
      <label><span className="label">Vote value</span><input className="field" required value={voteValue} onChange={(event) => setVoteValue(event.currentTarget.value)} placeholder="What should happen next?" /></label>
      <button className="btn btn-primary md:col-span-3" type="submit">Submit influence vote</button>
    </form>
  );
}
