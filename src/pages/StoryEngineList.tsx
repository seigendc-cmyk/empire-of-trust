import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getStoryConfig, listStoryRecords, upsertStoryRecord, type StoryKind, type StoryRecord } from "../lib/storyEngineRepository";

const fieldMap: Partial<Record<StoryKind, string[]>> = {
  timeline: ["storyDate", "seasonNumber", "episodeNumber", "chapterNumber", "majorEvent", "characterInvolved", "businessInvolved", "familyConsequence", "corporateConsequence", "culturalNote"],
  arcs: ["characterId", "seasonNumber", "episodeId", "arcStage", "emotionalState", "goal", "fear", "conflict", "relationshipChanges", "businessImpact", "familyImpact", "notes"],
  relationshipArcs: ["characterA", "characterB", "relationshipType", "currentStatus", "tensionLevel", "trustLevel", "betrayalRisk", "romanceRisk", "successionImpact", "notes"],
  businessTimeline: ["company", "episodeId", "eventType", "deal", "threat", "acquisition", "marketplaceGrowth", "regulatoryIssue", "investorPressure", "familyBusinessConflict", "notes"],
  conflictMap: ["episodeId", "conflictType", "title", "description", "intensity", "status", "notes"],
  rules: ["ruleType", "title", "body", "status"],
};

function titleOf(row: StoryRecord) {
  const record = row as unknown as Record<string, unknown>;
  return String(record.title ?? record.majorEvent ?? record.company ?? record.characterId ?? record.relationshipType ?? record.id);
}

function subtitleOf(row: StoryRecord) {
  const record = row as unknown as Record<string, unknown>;
  return String(record.status ?? record.severity ?? record.arcStage ?? record.eventType ?? record.conflictType ?? record.ruleType ?? "Story record");
}

export default function StoryEngineList({ kind }: { kind: StoryKind }) {
  const config = getStoryConfig(kind);
  const fields = fieldMap[kind] ?? [];
  const [records, setRecords] = useState<StoryRecord[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState("");

  async function load() {
    const rows = await listStoryRecords(kind);
    setRecords(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [kind]);

  const filtered = useMemo(() => records.filter((row) => `${titleOf(row)} ${subtitleOf(row)} ${JSON.stringify(row)}`.toLowerCase().includes(search.toLowerCase())), [records, search]);

  if (loading) return <LoadingState label={`Loading ${config.title}...`} />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Story Engine" title={config.title} subtitle="Firestore source of truth with local cache for offline planning." actions={[{ label: "Story Engine", to: "/studio/story-engine" }]} />
      {fields.length > 0 && (
        <form className="panel grid gap-3 p-4" onSubmit={async (event) => {
          event.preventDefault();
          const payload: Record<string, unknown> = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ["seasonNumber", "episodeNumber", "chapterNumber", "intensity", "tensionLevel", "trustLevel", "betrayalRisk", "romanceRisk"].includes(key) ? Number(value || 0) : value]));
          if (kind === "conflictMap") {
            payload.characterIds = [];
            payload.businessIds = [];
          }
          await upsertStoryRecord(kind, payload);
          setForm({});
          setSaved("Saved to Firestore and cache.");
          await load();
        }}>
          <h2 className="text-xl font-black">Quick create</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field}>
                <span className="label">{field}</span>
                {["body", "description", "notes", "familyConsequence", "corporateConsequence"].includes(field) ? (
                  <textarea className="field min-h-24" value={form[field] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.currentTarget.value }))} />
                ) : (
                  <input className="field" value={form[field] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.currentTarget.value }))} />
                )}
              </label>
            ))}
          </div>
          <button className="btn btn-primary" type="submit">Save record</button>
          {saved && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{saved}</p>}
        </form>
      )}
      <input className="field" placeholder={`Search ${config.title}`} value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      {filtered.length === 0 ? <EmptyState title="No story records" message="Create records here or sync them from Firestore." /> : (
        <section className="panel divide-y divide-white/10">
          {filtered.map((row) => <div key={row.id} className="p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{subtitleOf(row)}</p><h2 className="mt-1 text-xl font-black">{titleOf(row)}</h2><pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-paper/55">{JSON.stringify(row, null, 2)}</pre></div>)}
        </section>
      )}
    </section>
  );
}
