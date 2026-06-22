import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getStoryDashboard, searchStoryEngine, seedDefaultStoryRules, type StoryKind, type StoryRecord } from "../lib/storyEngineRepository";

const links = [
  ["/studio/story-engine/timeline", "Timeline", "Story dates, events, family and corporate consequences."],
  ["/studio/story-engine/arcs", "Character Arcs", "Goals, fears, emotional states, and episode arc stages."],
  ["/studio/story-engine/continuity", "Continuity", "Rule-based checks and writing warnings."],
  ["/studio/story-engine/episode-planner", "Episode Planner", "Plan conflict, cultural moment, assets, and bridge."],
  ["/studio/story-engine/prompt-builder", "Prompt Builder", "Build copyable AI-ready prompts without calling AI."],
  ["/studio/story-engine/conflict-map", "Conflict Map", "Family, succession, romance, betrayal, and corporate conflicts."],
  ["/studio/story-engine/business-timeline", "Business Timeline", "Deals, threats, acquisitions, growth, and pressure."],
  ["/studio/story-engine/rules", "Story Rules", "Editable cultural, business, image, and continuity rules."],
];

function titleOf(row: StoryRecord) {
  const record = row as unknown as Record<string, unknown>;
  return String(record.title ?? record.majorEvent ?? record.company ?? record.characterId ?? record.id);
}

export default function StoryEngineHome() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getStoryDashboard>> | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ kind: StoryKind; record: StoryRecord }>>([]);

  useEffect(() => {
    seedDefaultStoryRules().finally(() => getStoryDashboard().then(setDashboard));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    searchStoryEngine(search).then((rows) => setResults(rows.slice(0, 20)));
  }, [search]);

  if (!dashboard) return <LoadingState label="Loading story engine..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Story Intelligence" title="Story Engine" subtitle="Episode planning, continuity intelligence, character arcs, business timelines, and AI-ready prompts." actions={[{ label: "Planner", to: "/studio/story-engine/episode-planner", primary: true }, { label: "Prompt Builder", to: "/studio/story-engine/prompt-builder" }]} />
      <section className="grid gap-3 md:grid-cols-4">
        <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Plans</p><p className="mt-2 text-3xl font-black">{dashboard.counts.plans}</p></div>
        <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Arcs</p><p className="mt-2 text-3xl font-black">{dashboard.counts.arcs}</p></div>
        <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Conflicts</p><p className="mt-2 text-3xl font-black">{dashboard.counts.conflicts}</p></div>
        <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Continuity</p><p className="mt-2 text-3xl font-black">{dashboard.openContinuity.length}</p></div>
      </section>
      <input className="field" placeholder="Search story records" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      {results.length > 0 && (
        <section className="panel divide-y divide-white/10">
          {results.map(({ kind, record }) => <Link key={`${kind}-${record.id}`} className="block p-4 hover:bg-white/5" to={`/studio/story-engine/${kind === "episodePlans" ? "episode-planner" : kind}`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{kind}</p><h2 className="mt-1 text-lg font-black">{titleOf(record)}</h2></Link>)}
        </section>
      )}
      <section className="grid gap-3 md:grid-cols-4">
        {links.map(([to, label, text]) => <Link key={to} to={to} className="panel p-4 hover:bg-white/5"><h2 className="text-lg font-black">{label}</h2><p className="mt-2 text-sm leading-6 text-paper/60">{text}</p></Link>)}
      </section>
    </section>
  );
}
