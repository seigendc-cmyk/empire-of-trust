import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getProductionConfig, listProduction, summarizeProductionRecord, upsertProduction, type ProductionKind, type ProductionRecord } from "../lib/productionRepository";

const fieldMap = {
  actors: ["fullName", "stageName", "gender", "dateOfBirth", "nationality", "phone", "email", "address", "bio", "headshotUrl", "portfolioUrls", "socialLinks", "availabilityStatus", "status"],
  casting: ["characterId", "actorId", "status", "notes", "assignedDate", "approvedDate"],
  characters: ["name", "nickname", "age", "gender", "role", "occupation", "personality", "backstory", "relationships", "currentStoryStatus", "actorId", "imagePrompt"],
  scenes: ["episodeId", "chapterId", "sceneNumber", "title", "description", "locationId", "emotionalTone", "cameraDirection", "dialogueSummary", "imagePrompt", "videoPrompt", "continuityNotes", "estimatedDuration", "status"],
  locations: ["name", "locationType", "address", "city", "country", "description", "imageUrl", "availability", "notes"],
  properties: ["name", "type", "ownerCharacterIds", "description", "imageUrl", "status"],
  vehicles: ["name", "registration", "type", "ownerCharacterIds", "description", "imageUrl"],
  assets: ["assetType", "prompt", "relatedCharacterId", "relatedSceneId", "relatedEpisodeId", "generatedImageUrl", "generatedVideoUrl"],
  schedules: ["episodeId", "sceneId", "scheduledDate", "locationId", "assignedActors", "assignedAssets", "status", "notes"],
  continuity: ["episodeId", "sceneId", "continuityType", "title", "description", "severity", "status", "relatedCharacterId", "relatedAssetId"],
} satisfies Record<ProductionKind, string[]>;

const numberFields = new Set(["age", "sceneNumber"]);
const arrayFields = new Set(["portfolioUrls", "relationships", "ownerCharacterIds", "assignedActors", "assignedAssets"]);
const textareaFields = new Set(["address", "bio", "backstory", "cameraDirection", "continuityNotes", "description", "dialogueSummary", "imagePrompt", "notes", "personality", "prompt", "videoPrompt"]);

function displayValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

function parseValue(field: string, value: string) {
  if (numberFields.has(field)) return Number(value || 0);
  if (arrayFields.has(field)) return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (field === "socialLinks") {
    try {
      return value.trim() ? JSON.parse(value) : {};
    } catch {
      return value;
    }
  }
  return value;
}

function titleOf(row: ProductionRecord) {
  return summarizeProductionRecord(row).title;
}

export default function ProductionList({ kind }: { kind: ProductionKind }) {
  const config = getProductionConfig(kind);
  const fields = fieldMap[kind];
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState("");

  async function load() {
    const rows = await listProduction(kind);
    setRecords(rows);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    setForm({});
    setEditingId("");
    load();
  }, [kind]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((row) => `${titleOf(row)} ${JSON.stringify(row)}`.toLowerCase().includes(term));
  }, [records, search]);

  function editRecord(record: ProductionRecord) {
    const row = record as unknown as Record<string, unknown>;
    setEditingId(record.id);
    setForm(Object.fromEntries(fields.map((field) => [field, displayValue(row[field])])));
    setSaved("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <LoadingState label={`Loading ${config.title}...`} />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Production Studio" title={config.title} subtitle="Firestore source of truth with local cache for offline production planning." actions={[{ label: "Production", to: "/studio/production" }]} />
      <form className="panel grid gap-3 p-4" onSubmit={async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(fields.map((field) => [field, parseValue(field, form[field] ?? "")]));
        await upsertProduction(kind, editingId ? { id: editingId, ...payload } : payload);
        setForm({});
        setEditingId("");
        setSaved(`${config.singular} saved.`);
        await load();
      }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">{editingId ? `Edit ${config.singular}` : `Quick create ${config.singular}`}</h2>
          {editingId && <button className="btn" type="button" onClick={() => { setEditingId(""); setForm({}); }}>Cancel edit</button>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field}>
              <span className="label">{field}</span>
              {textareaFields.has(field) ? (
                <textarea className="field min-h-24" value={form[field] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.currentTarget.value }))} />
              ) : (
                <input className="field" value={form[field] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.currentTarget.value }))} />
              )}
            </label>
          ))}
        </div>
        <button className="btn btn-primary" type="submit">{editingId ? "Save changes" : "Save record"}</button>
        {saved && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{saved}</p>}
      </form>
      <input className="field" placeholder={`Search ${config.title}`} value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      {filtered.length === 0 ? <EmptyState title={`No ${config.title.toLowerCase()}`} message="Create records here or sync them from Firestore." /> : (
        <section className="panel divide-y divide-white/10">
          {filtered.map((row) => {
            const summary = summarizeProductionRecord(row);
            return (
              <div key={row.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{summary.subtitle}</p>
                    <h2 className="mt-1 text-xl font-black">{summary.title}</h2>
                    {summary.body && <p className="mt-2 text-sm leading-6 text-paper/60">{summary.body}</p>}
                  </div>
                  <button className="btn" type="button" onClick={() => editRecord(row)}>Edit</button>
                </div>
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-paper/55">{JSON.stringify(row, null, 2)}</pre>
              </div>
            );
          })}
        </section>
      )}
    </section>
  );
}
