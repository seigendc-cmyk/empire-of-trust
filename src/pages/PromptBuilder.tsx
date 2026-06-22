import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { buildStoryPrompt, listStoryRecords, saveBuiltPrompt, type PromptType } from "../lib/storyEngineRepository";
import type { EotContinuityCheck, EotEpisodePlan, EotStoryRule } from "../types";

const promptTypes: PromptType[] = ["episode", "chapter", "paragraph", "image", "scene", "character", "trailer", "recap"];

export default function PromptBuilder() {
  const [plans, setPlans] = useState<EotEpisodePlan[]>([]);
  const [rules, setRules] = useState<EotStoryRule[]>([]);
  const [checks, setChecks] = useState<EotContinuityCheck[]>([]);
  const [planId, setPlanId] = useState("");
  const [promptType, setPromptType] = useState<PromptType>("episode");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listStoryRecords<EotEpisodePlan>("episodePlans"),
      listStoryRecords<EotStoryRule>("rules"),
      listStoryRecords<EotContinuityCheck>("continuity"),
    ]).then(([planRows, ruleRows, checkRows]) => {
      setPlans(planRows);
      setRules(ruleRows);
      setChecks(checkRows);
      setPlanId(planRows[0]?.id ?? "");
      setLoading(false);
    });
  }, []);

  const plan = plans.find((item) => item.id === planId);
  const output = useMemo(() => (plan ? buildStoryPrompt({ plan, rules, checks: checks.filter((check) => check.episodeId === plan.id || !check.episodeId), promptType }) : ""), [checks, plan, promptType, rules]);

  if (loading) return <LoadingState label="Loading prompt builder..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Story Engine" title="Prompt Builder" subtitle="Build copyable AI-ready prompts from episode plans, continuity data, and story rules. No AI API calls are made." actions={[{ label: "Planner", to: "/studio/story-engine/episode-planner" }]} />
      <section className="panel grid gap-3 p-4 md:grid-cols-2">
        <label>
          <span className="label">Episode plan</span>
          <select className="field" value={planId} onChange={(event) => setPlanId(event.currentTarget.value)}>
            {plans.map((item) => <option key={item.id} value={item.id}>S{item.seasonNumber}E{item.episodeNumber} / {item.title}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Prompt type</span>
          <select className="field" value={promptType} onChange={(event) => setPromptType(event.currentTarget.value as PromptType)}>
            {promptTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </section>
      <section className="panel sticky-actions grid gap-3 p-4 md:grid-cols-2">
        <button className="btn btn-primary" disabled={!output} onClick={() => navigator.clipboard.writeText(output)} type="button">Copy Prompt</button>
        <button className="btn" disabled={!plan || !output} onClick={async () => {
          if (!plan) return;
          await saveBuiltPrompt(plan, promptType, output);
          setSaved("Prompt saved to Firestore.");
        }} type="button">Save Prompt</button>
        {saved && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal md:col-span-2">{saved}</p>}
      </section>
      <pre className="panel min-h-[420px] overflow-auto whitespace-pre-wrap p-4 text-sm leading-6 text-paper/80">{output || "Create an episode plan first."}</pre>
    </section>
  );
}
