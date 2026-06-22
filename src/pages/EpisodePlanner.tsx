import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { createProductionHandoff } from "../lib/productionRepository";
import { listStoryRecords, upsertStoryRecord } from "../lib/storyEngineRepository";
import type { EotEpisodePlan } from "../types";

const fields = ["seasonNumber", "episodeNumber", "title", "storyDate", "mainConflict", "emotionalTurn", "businessConsequence", "familyConsequence", "culturalMoment", "activeCharacters", "requiredAssets", "requiredLocations", "cliffhangerQuestion", "nextEpisodeBridge"];

export default function EpisodePlanner() {
  const [plans, setPlans] = useState<EotEpisodePlan[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState("");
  const [handoffMessage, setHandoffMessage] = useState<{ planId: string; text: string } | null>(null);
  const [handoffPlanId, setHandoffPlanId] = useState("");

  async function load() {
    const rows = await listStoryRecords<EotEpisodePlan>("episodePlans");
    setPlans(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Loading episode planner..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Story Engine" title="Episode Planner" subtitle="Define the episode spine before writing chapters, paragraphs, and production records." actions={[{ label: "Prompt Builder", to: "/studio/story-engine/prompt-builder", primary: true }, { label: "Production", to: "/studio/production" }]} />
      <form className="panel grid gap-3 p-4" onSubmit={async (event) => {
        event.preventDefault();
        await upsertStoryRecord("episodePlans", {
          ...form,
          seasonNumber: Number(form.seasonNumber || 1),
          episodeNumber: Number(form.episodeNumber || 1),
        });
        setForm({});
        setSaved("Episode plan saved.");
        await load();
      }}>
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field}>
              <span className="label">{field}</span>
              {field.includes("Consequence") || field.includes("Characters") || field.includes("Assets") || field.includes("Locations") || field.includes("Question") || field.includes("Bridge") ? (
                <textarea className="field min-h-24" value={form[field] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.currentTarget.value }))} />
              ) : (
                <input className="field" value={form[field] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.currentTarget.value }))} />
              )}
            </label>
          ))}
        </div>
        <button className="btn btn-primary" type="submit">Save episode plan</button>
        {saved && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{saved}</p>}
      </form>
      <section className="panel divide-y divide-white/10">
        {plans.map((plan) => (
          <div key={plan.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">S{plan.seasonNumber}E{plan.episodeNumber} / {plan.storyDate}</p>
                <h2 className="mt-1 text-xl font-black">{plan.title}</h2>
                <p className="mt-2 text-sm text-paper/60">{plan.mainConflict}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={handoffPlanId === plan.id}
                  onClick={async () => {
                    setHandoffPlanId(plan.id);
                    setHandoffMessage(null);
                    try {
                      const result = await createProductionHandoff(plan);
                      setHandoffMessage({ planId: plan.id, text: `Production handoff created for ${result.episodeId}.` });
                    } catch (error) {
                      setHandoffMessage({ planId: plan.id, text: error instanceof Error ? error.message : "Production handoff failed." });
                    } finally {
                      setHandoffPlanId("");
                    }
                  }}
                >
                  {handoffPlanId === plan.id ? "Creating..." : "Create production handoff"}
                </button>
                <Link className="btn" to="/studio/production/scenes">Scenes</Link>
              </div>
            </div>
            {handoffMessage?.planId === plan.id && <p className="mt-3 border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{handoffMessage.text}</p>}
          </div>
        ))}
      </section>
    </section>
  );
}
