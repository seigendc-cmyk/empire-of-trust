import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { listEpisodes } from "../lib/firestore";
import { getProductionDashboard, getProductionReadiness } from "../lib/productionRepository";
import { getReleaseCommandCenter } from "../lib/publishingRepository";
import { getStoryDashboard } from "../lib/storyEngineRepository";
import type { Episode, EpisodeStatus } from "../types";

type StoryDashboard = Awaited<ReturnType<typeof getStoryDashboard>>;
type ProductionDashboard = Awaited<ReturnType<typeof getProductionDashboard>>;
type ReadinessRows = Awaited<ReturnType<typeof getProductionReadiness>>;
type ReleaseRows = Awaited<ReturnType<typeof getReleaseCommandCenter>>;

interface StudioQueueData {
  episodes: Episode[];
  story: StoryDashboard | null;
  production: ProductionDashboard | null;
  readiness: ReadinessRows;
  releases: ReleaseRows;
}

interface WorkItem {
  id: string;
  lane: "Story" | "Production" | "Publishing" | "Licensing" | "Reader Ops";
  title: string;
  detail: string;
  status: "blocked" | "active" | "ready" | "empty";
  metric: string;
  to: string;
  action: string;
}

const emptyData: StudioQueueData = {
  episodes: [],
  story: null,
  production: null,
  readiness: [],
  releases: [],
};

const episodeStatusOrder: EpisodeStatus[] = ["draft", "review", "approved", "scheduled", "published", "archived"];

export default function StudioHome() {
  const [data, setData] = useState<StudioQueueData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [episodes, story, production, readiness, releases] = await Promise.all([
        listEpisodes().catch(() => []),
        getStoryDashboard().catch(() => null),
        getProductionDashboard().catch(() => null),
        getProductionReadiness().catch(() => []),
        getReleaseCommandCenter().catch(() => []),
      ]);

      if (cancelled) return;
      setData({ episodes, story, production, readiness, releases });
      setMessage(story || production || releases.length || episodes.length ? "" : "Studio data is empty or unavailable. Start by creating an episode plan or episode draft.");
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const queue = useMemo(() => buildQueue(data), [data]);
  const statusCounts = useMemo(() => countEpisodeStatuses(data.episodes), [data.episodes]);
  const blockedCount = queue.filter((item) => item.status === "blocked").length;
  const readyCount = queue.filter((item) => item.status === "ready").length;
  const activeCount = queue.filter((item) => item.status === "active").length;

  if (loading) return <LoadingState label="Loading studio work queue..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Studio"
        title="Work Queue"
        subtitle="Daily command surface for story, production, release, licensing, and reader operations."
        actions={[
          { label: "New Episode", to: "/studio/episodes/new", primary: true },
          { label: "Episode Planner", to: "/studio/story-engine/episode-planner" },
          { label: "Release", to: "/studio/release-command" },
        ]}
      />

      {message && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{message}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Open work" value={queue.length} detail={`${blockedCount} blocked / ${activeCount} active`} tone={blockedCount ? "warn" : "neutral"} />
        <Metric label="Release ready" value={readyCount} detail="Items clear for next action" tone={readyCount ? "good" : "neutral"} />
        <Metric label="Episodes" value={data.episodes.length} detail={formatStatusSummary(statusCounts)} />
        <Metric label="Production" value={`${data.production?.productionProgress ?? 0}%`} detail="Scene readiness progress" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-4">
          <section className="panel overflow-hidden">
            <div className="border-b border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black">Today Queue</h2>
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em]">
                  <span className="text-ember">{blockedCount} blocked</span>
                  <span className="text-signal">{activeCount} active</span>
                  <span className="text-ledger">{readyCount} ready</span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {queue.length === 0 ? (
                <div className="p-4 text-sm text-paper/60">No queue items yet. Create an episode or story plan to populate the studio flow.</div>
              ) : (
                queue.map((item) => <WorkCard key={item.id} item={item} />)
              )}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <LaneLink to="/studio/story-engine" title="Story Engine" count={data.story?.counts.plans ?? 0} detail={`${data.story?.openContinuity.length ?? 0} continuity`} />
            <LaneLink to="/studio/production" title="Production" count={data.production?.counts.scenes ?? 0} detail={`${data.production?.continuityWarnings.length ?? 0} warnings`} />
            <LaneLink to="/studio/release-command" title="Publishing" count={data.releases.length} detail={`${data.releases.filter((row) => row.blockers.length).length} blockers`} />
            <LaneLink to="/studio/licensing" title="Licensing" count={data.episodes.filter((episode) => episode.requiredLicencePlan !== "free").length} detail="Protected episodes" />
            <LaneLink to="/packs" title="Reader Ops" count={data.episodes.filter((episode) => episode.status === "published").length} detail="Published episodes" />
          </section>
        </div>

        <aside className="grid gap-4 content-start">
          <section className="panel p-4">
            <h2 className="text-base font-black">Episode Pipeline</h2>
            <div className="mt-3 grid gap-2">
              {episodeStatusOrder.map((status) => (
                <div key={status} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 p-3">
                  <span className="text-sm font-bold capitalize text-paper/70">{status}</span>
                  <span className="text-lg font-black text-signal">{statusCounts[status] ?? 0}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="text-base font-black">Fast Actions</h2>
            <div className="mt-3 grid gap-2">
              <Link className="btn justify-start" to="/studio/story-engine/prompt-builder">Build prompt</Link>
              <Link className="btn justify-start" to="/studio/production/handoff">Create handoff</Link>
              <Link className="btn justify-start" to="/studio/production/readiness">Check readiness</Link>
              <Link className="btn justify-start" to="/studio/books">Book library</Link>
              <Link className="btn justify-start" to="/studio/staff">Staff access</Link>
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}

function buildQueue(data: StudioQueueData): WorkItem[] {
  const items: WorkItem[] = [];
  const drafts = data.episodes.filter((episode) => episode.status === "draft");
  const review = data.episodes.filter((episode) => episode.status === "review");
  const approved = data.episodes.filter((episode) => episode.status === "approved");
  const scheduled = data.episodes.filter((episode) => episode.status === "scheduled");
  const releaseBlockers = data.releases.filter((row) => row.blockers.length > 0);
  const releaseReady = data.releases.filter((row) => row.canPublish || row.canSchedule);
  const openReadiness = data.readiness.filter((row) => !row.ready);

  if (data.story && data.story.openContinuity.length > 0) {
    items.push({
      id: "story-continuity",
      lane: "Story",
      title: "Resolve story continuity",
      detail: `${data.story.openContinuity.length} open continuity checks before story approval.`,
      status: "blocked",
      metric: `${data.story.openContinuity.length} open`,
      to: "/studio/story-engine/continuity",
      action: "Review checks",
    });
  }

  if (data.story && data.story.recentPlans.length > 0) {
    const plan = data.story.recentPlans[0];
    items.push({
      id: "latest-plan",
      lane: "Story",
      title: `Advance ${plan.title}`,
      detail: [plan.mainConflict, plan.nextEpisodeBridge].filter(Boolean).join(" / ") || "Convert the latest plan into production material.",
      status: "active",
      metric: `S${plan.seasonNumber}E${plan.episodeNumber}`,
      to: "/studio/production/handoff",
      action: "Create handoff",
    });
  } else {
    items.push({
      id: "new-plan",
      lane: "Story",
      title: "Plan the next episode",
      detail: "No episode plans found in the story engine cache.",
      status: "empty",
      metric: "0 plans",
      to: "/studio/story-engine/episode-planner",
      action: "Start plan",
    });
  }

  if (drafts.length > 0) {
    items.push({
      id: "draft-episodes",
      lane: "Story",
      title: "Finish draft episodes",
      detail: `${drafts.length} draft episode${drafts.length === 1 ? "" : "s"} need chapters, paragraphs, or review status.`,
      status: "active",
      metric: `${drafts.length} draft`,
      to: "/studio/episodes",
      action: "Edit drafts",
    });
  }

  if (review.length > 0) {
    items.push({
      id: "review-episodes",
      lane: "Publishing",
      title: "Approve review episodes",
      detail: `${review.length} episode${review.length === 1 ? "" : "s"} are waiting for approval before scheduling.`,
      status: "active",
      metric: `${review.length} review`,
      to: "/studio/release-command",
      action: "Open release",
    });
  }

  if (openReadiness.length > 0) {
    const average = Math.round(openReadiness.reduce((sum, row) => sum + row.readiness, 0) / openReadiness.length);
    items.push({
      id: "production-readiness",
      lane: "Production",
      title: "Clear production blockers",
      detail: `${openReadiness.length} production readiness row${openReadiness.length === 1 ? "" : "s"} still have missing scenes, casting, assets, or continuity.`,
      status: "blocked",
      metric: `${average}% avg`,
      to: "/studio/production/readiness",
      action: "Fix blockers",
    });
  }

  if (data.production && data.production.upcomingShoots.length > 0) {
    const shoot = data.production.upcomingShoots[0];
    items.push({
      id: "next-shoot",
      lane: "Production",
      title: "Prepare next shoot",
      detail: `${shoot.scheduledDate}: ${shoot.episodeId} / ${shoot.sceneId}`,
      status: "active",
      metric: shoot.status,
      to: "/studio/production/schedule-board",
      action: "Open schedule",
    });
  }

  if (releaseBlockers.length > 0) {
    items.push({
      id: "release-blockers",
      lane: "Publishing",
      title: "Resolve release blockers",
      detail: `${releaseBlockers.length} release row${releaseBlockers.length === 1 ? "" : "s"} have production, catalogue, or workflow blockers.`,
      status: "blocked",
      metric: `${releaseBlockers.length} blocked`,
      to: "/studio/release-command",
      action: "Open command",
    });
  }

  if (approved.length + scheduled.length + releaseReady.length > 0) {
    items.push({
      id: "release-ready",
      lane: "Publishing",
      title: "Schedule or publish cleared episodes",
      detail: `${approved.length} approved, ${scheduled.length} scheduled, ${releaseReady.length} release-command ready.`,
      status: "ready",
      metric: `${approved.length + scheduled.length} queued`,
      to: "/studio/release-command",
      action: "Publish",
    });
  }

  const licensed = data.episodes.filter((episode) => episode.requiredLicencePlan && episode.requiredLicencePlan !== "free");
  if (licensed.length > 0) {
    items.push({
      id: "licensing",
      lane: "Licensing",
      title: "Review protected content",
      detail: `${licensed.length} episode${licensed.length === 1 ? "" : "s"} require a licence plan.`,
      status: "active",
      metric: `${licensed.length} protected`,
      to: "/studio/licensing",
      action: "Open licensing",
    });
  }

  const published = data.episodes.filter((episode) => episode.status === "published");
  if (published.length > 0) {
    items.push({
      id: "reader-ops",
      lane: "Reader Ops",
      title: "Maintain reader packs",
      detail: `${published.length} published episode${published.length === 1 ? "" : "s"} should have current pack/catalogue metadata.`,
      status: "ready",
      metric: `${published.length} live`,
      to: "/packs",
      action: "Check packs",
    });
  }

  return items.sort((a, b) => statusRank(a.status) - statusRank(b.status));
}

function statusRank(status: WorkItem["status"]) {
  return { blocked: 0, active: 1, ready: 2, empty: 3 }[status];
}

function countEpisodeStatuses(episodes: Episode[]) {
  return episodes.reduce<Record<EpisodeStatus, number>>(
    (counts, episode) => ({ ...counts, [episode.status]: (counts[episode.status] ?? 0) + 1 }),
    { draft: 0, review: 0, approved: 0, scheduled: 0, published: 0, archived: 0 },
  );
}

function formatStatusSummary(counts: Record<EpisodeStatus, number>) {
  const active = counts.draft + counts.review + counts.approved + counts.scheduled;
  return `${active} in workflow / ${counts.published} published`;
}

function Metric({ label, value, detail, tone = "neutral" }: { label: string; value: string | number; detail: string; tone?: "neutral" | "good" | "warn" }) {
  const valueClass = tone === "good" ? "text-ledger" : tone === "warn" ? "text-signal" : "text-paper";
  return (
    <article className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{label}</p>
      <p className={`mt-3 text-3xl font-black leading-none ${valueClass}`}>{value}</p>
      <p className="mt-3 text-sm font-semibold text-paper/60">{detail}</p>
    </article>
  );
}

function WorkCard({ item }: { item: WorkItem }) {
  const statusClass = {
    blocked: "border-ember text-ember",
    active: "border-signal text-signal",
    ready: "border-ledger text-ledger",
    empty: "border-white/15 text-paper/50",
  }[item.status];

  return (
    <article className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`status-badge ${statusClass}`}>{item.status}</span>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{item.lane}</span>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{item.metric}</span>
        </div>
        <h3 className="text-lg font-black">{item.title}</h3>
        <p className="mt-1 text-sm leading-6 text-paper/60">{item.detail}</p>
      </div>
      <Link className={`btn ${item.status === "blocked" || item.status === "ready" ? "btn-primary" : ""} w-full sm:w-auto`} to={item.to}>
        {item.action}
      </Link>
    </article>
  );
}

function LaneLink({ title, count, detail, to }: { title: string; count: number; detail: string; to: string }) {
  return (
    <Link className="panel block p-4 hover:bg-white/5" to={to}>
      <p className="text-2xl font-black text-signal">{count}</p>
      <h3 className="mt-1 text-sm font-black">{title}</h3>
      <p className="mt-1 text-xs font-semibold text-paper/55">{detail}</p>
    </Link>
  );
}
