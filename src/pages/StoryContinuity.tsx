import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { listEpisodes } from "../lib/firestore";
import { listStoryRecords, runContinuityChecks } from "../lib/storyEngineRepository";
import type { EotContinuityCheck, Episode } from "../types";

export default function StoryContinuity() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [checks, setChecks] = useState<EotContinuityCheck[]>([]);
  const [episodeId, setEpisodeId] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [episodeRows, checkRows] = await Promise.all([listEpisodes().catch(() => []), listStoryRecords<EotContinuityCheck>("continuity")]);
    setEpisodes(episodeRows);
    setChecks(checkRows);
    setEpisodeId(episodeRows[0]?.id ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Loading continuity intelligence..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Story Engine" title="Continuity Intelligence" subtitle="Run rule-based checks for episode order, bridges, paragraphs, emotional tone, business logic, culture, and visual reminders." actions={[{ label: "Planner", to: "/studio/story-engine/episode-planner" }]} />
      <section className="panel grid gap-3 p-4 md:grid-cols-[1fr_auto]">
        <label>
          <span className="label">Episode</span>
          <select className="field" value={episodeId} onChange={(event) => setEpisodeId(event.currentTarget.value)}>
            {episodes.map((episode) => <option key={episode.id} value={episode.id}>{episode.episodeIdentifier} / {episode.title}</option>)}
          </select>
        </label>
        <button className="btn btn-primary self-end" disabled={!episodeId} onClick={async () => {
          const episode = episodes.find((item) => item.id === episodeId);
          if (!episode) return;
          setChecks(await runContinuityChecks(episode));
        }} type="button">Run checks</button>
      </section>
      <section className="grid gap-3 md:grid-cols-4">
        {(["critical", "warning", "info", "pass"] as const).map((severity) => <div key={severity} className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{severity}</p><p className="mt-2 text-3xl font-black">{checks.filter((check) => check.severity === severity).length}</p></div>)}
      </section>
      <section className="panel divide-y divide-white/10">
        {checks.map((check) => <div key={check.id} className="p-4"><p className={`text-xs font-bold uppercase tracking-[0.16em] ${check.severity === "critical" ? "text-ember" : "text-signal"}`}>{check.severity} / {check.checkType}</p><h2 className="mt-1 text-xl font-black">{check.title}</h2><p className="mt-2 text-sm leading-6 text-paper/65">{check.description}</p></div>)}
      </section>
    </section>
  );
}
