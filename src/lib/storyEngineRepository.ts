import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import type { Table } from "dexie";
import { db } from "./firebase";
import { listChapters, listEpisodes, listParagraphs } from "./firestore";
import { readerDb } from "./offlineDb";
import type {
  EotBusinessTimeline,
  EotCharacterArc,
  EotConflictMap,
  EotContinuityCheck,
  EotEpisodePlan,
  EotRelationshipArc,
  EotStoryPrompt,
  EotStoryRule,
  EotStoryTimeline,
  Episode,
} from "../types";

export type StoryKind = "timeline" | "arcs" | "relationshipArcs" | "businessTimeline" | "conflictMap" | "continuity" | "episodePlans" | "prompts" | "rules";
export type StoryRecord = EotStoryTimeline | EotCharacterArc | EotRelationshipArc | EotBusinessTimeline | EotConflictMap | EotContinuityCheck | EotEpisodePlan | EotStoryPrompt | EotStoryRule;
export type PromptType = EotStoryPrompt["promptType"];

interface StoryConfig<T extends StoryRecord> {
  collectionName: string;
  orderField: string;
  table: Table<T, string>;
  title: string;
  searchFields: string[];
}

const config = {
  timeline: { collectionName: "eotStoryTimeline", orderField: "storyDate", table: readerDb.storyTimelineCache, title: "Story Timeline", searchFields: ["majorEvent", "characterInvolved", "businessInvolved", "culturalNote"] },
  arcs: { collectionName: "eotCharacterArcs", orderField: "seasonNumber", table: readerDb.characterArcCache, title: "Character Arcs", searchFields: ["characterId", "arcStage", "goal", "conflict"] },
  relationshipArcs: { collectionName: "eotRelationshipArcs", orderField: "relationshipType", table: readerDb.relationshipArcCache, title: "Relationship Arcs", searchFields: ["characterA", "characterB", "relationshipType", "currentStatus"] },
  businessTimeline: { collectionName: "eotBusinessTimeline", orderField: "company", table: readerDb.businessTimelineCache, title: "Business Timeline", searchFields: ["company", "eventType", "deal", "threat", "notes"] },
  conflictMap: { collectionName: "eotConflictMap", orderField: "intensity", table: readerDb.conflictMapCache, title: "Conflict Map", searchFields: ["title", "description", "conflictType", "status"] },
  continuity: { collectionName: "eotContinuityChecks", orderField: "severity", table: readerDb.continuityCheckCache, title: "Continuity Intelligence", searchFields: ["title", "description", "checkType", "severity"] },
  episodePlans: { collectionName: "eotEpisodePlans", orderField: "seasonNumber", table: readerDb.episodePlanCache, title: "Episode Planner", searchFields: ["title", "mainConflict", "activeCharacters", "cliffhangerQuestion"] },
  prompts: { collectionName: "eotStoryPrompts", orderField: "promptType", table: readerDb.storyPromptCache, title: "Prompt Builder", searchFields: ["title", "promptType", "output"] },
  rules: { collectionName: "eotStoryRules", orderField: "ruleType", table: readerDb.storyRuleCache, title: "Story Rules", searchFields: ["title", "body", "ruleType"] },
} satisfies Record<StoryKind, StoryConfig<StoryRecord>>;

export const defaultStoryRules = [
  { ruleType: "cultural", title: "Cultural grounding", body: "Every episode should include a specific cultural detail, greeting, food, setting, or social expectation.", status: "active" },
  { ruleType: "character", title: "Trust Ncube visual consistency", body: "Keep Trust Ncube visually consistent across scenes; note wardrobe, posture, age, and authority cues.", status: "active" },
  { ruleType: "business", title: "Business logic", body: "Every corporate move must have a credible financial, regulatory, or strategic reason.", status: "active" },
  { ruleType: "episode_ending", title: "Dramatic bridge", body: "Each episode needs a clear dramatic ending bridge into the next episode.", status: "active" },
  { ruleType: "image_prompt", title: "AI prompt specificity", body: "Image prompts must include character appearance, location, lighting, wardrobe, camera angle, and emotional tone.", status: "active" },
  { ruleType: "continuity", title: "Continuity check", body: "Check character age, relationships, business events, locations, vehicles, and episode order before publishing.", status: "active" },
] as const;

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function storyConfig(kind: StoryKind) {
  return config[kind];
}

function matches(record: StoryRecord, fields: string[], term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  const row = record as unknown as Record<string, unknown>;
  return fields.some((field) => String(row[field] ?? "").toLowerCase().includes(normalized));
}

export function getStoryConfig(kind: StoryKind) {
  const item = storyConfig(kind);
  return { title: item.title, searchFields: item.searchFields };
}

export async function listStoryRecords<T extends StoryRecord>(kind: StoryKind): Promise<T[]> {
  const item = storyConfig(kind) as StoryConfig<T>;
  try {
    const snapshots = await getDocs(query(collection(db, item.collectionName), orderBy(item.orderField)));
    const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
    await item.table.bulkPut(rows);
    return rows;
  } catch {
    return item.table.toArray();
  }
}

export async function upsertStoryRecord(kind: StoryKind, input: Record<string, unknown> & { id?: string }) {
  const item = storyConfig(kind);
  const payload = { ...input, updatedAt: serverTimestamp() };
  if (input.id) {
    await updateDoc(doc(db, item.collectionName, input.id), payload);
    return input.id;
  }
  const snapshot = await addDoc(collection(db, item.collectionName), { ...payload, createdAt: serverTimestamp() });
  return snapshot.id;
}

export async function searchStoryEngine(term: string) {
  const rows = await Promise.all((Object.keys(config) as StoryKind[]).map(async (kind) => {
    const records = await listStoryRecords(kind);
    const item = storyConfig(kind);
    return records.filter((record) => matches(record, item.searchFields, term)).map((record) => ({ kind, record }));
  }));
  return rows.flat();
}

export async function getStoryDashboard() {
  const [timeline, arcs, relationshipArcs, businessTimeline, conflicts, checks, plans, prompts, rules] = await Promise.all([
    listStoryRecords<EotStoryTimeline>("timeline"),
    listStoryRecords<EotCharacterArc>("arcs"),
    listStoryRecords<EotRelationshipArc>("relationshipArcs"),
    listStoryRecords<EotBusinessTimeline>("businessTimeline"),
    listStoryRecords<EotConflictMap>("conflictMap"),
    listStoryRecords<EotContinuityCheck>("continuity"),
    listStoryRecords<EotEpisodePlan>("episodePlans"),
    listStoryRecords<EotStoryPrompt>("prompts"),
    listStoryRecords<EotStoryRule>("rules"),
  ]);
  return {
    counts: { timeline: timeline.length, arcs: arcs.length, relationshipArcs: relationshipArcs.length, businessTimeline: businessTimeline.length, conflicts: conflicts.length, checks: checks.length, plans: plans.length, prompts: prompts.length, rules: rules.length },
    openContinuity: checks.filter((item) => item.status === "open" && item.severity !== "pass"),
    highConflict: conflicts.filter((item) => item.status !== "resolved").sort((a, b) => b.intensity - a.intensity).slice(0, 8),
    activeRules: rules.filter((item) => item.status === "active"),
    recentPlans: plans.slice(-6).reverse(),
  };
}

function makeCheck(episodeId: string, checkType: string, title: string, description: string, severity: EotContinuityCheck["severity"]): EotContinuityCheck {
  const timestamp = new Date().toISOString();
  return { id: `${episodeId}_${checkType}`, episodeId, checkType, title, description, severity, status: severity === "pass" ? "resolved" : "open", createdAt: timestamp, updatedAt: timestamp };
}

export async function runContinuityChecks(episode: Episode): Promise<EotContinuityCheck[]> {
  const [chapters, paragraphs, timeline, arcs, businessEvents] = await Promise.all([
    listChapters(episode.id).catch(() => []),
    listParagraphs(episode.id).catch(() => []),
    listStoryRecords<EotStoryTimeline>("timeline"),
    listStoryRecords<EotCharacterArc>("arcs"),
    listStoryRecords<EotBusinessTimeline>("businessTimeline"),
  ]);
  const checks: EotContinuityCheck[] = [];
  checks.push(makeCheck(episode.id, "episode_order", "Episode order", `Season ${episode.seasonNumber}, episode ${episode.episodeNumber} is recorded.`, "pass"));
  checks.push(makeCheck(episode.id, "previous_bridge", "Previous episode bridge", episode.previousEpisodeId ? "Previous episode bridge exists." : "No previous episode bridge is set.", episode.previousEpisodeId ? "pass" : "warning"));
  checks.push(makeCheck(episode.id, "chapter_paragraphs", "Chapters have paragraphs", chapters.every((chapter) => paragraphs.some((paragraph) => paragraph.chapterId === chapter.id)) ? "All chapters have paragraphs." : "One or more chapters have no paragraphs.", chapters.length && chapters.every((chapter) => paragraphs.some((paragraph) => paragraph.chapterId === chapter.id)) ? "pass" : "critical"));
  checks.push(makeCheck(episode.id, "emotional_tone", "Paragraph emotional tone", paragraphs.every((paragraph) => paragraph.emotionalTone?.trim()) ? "Paragraph emotional tones are present." : "Some paragraphs are missing emotional tone.", paragraphs.length && paragraphs.every((paragraph) => paragraph.emotionalTone?.trim()) ? "pass" : "warning"));
  checks.push(makeCheck(episode.id, "cultural_notes", "Cultural continuity", episode.culturalContinuityNotes?.trim() ? "Episode has cultural continuity notes." : "Episode is missing cultural continuity notes.", episode.culturalContinuityNotes?.trim() ? "pass" : "warning"));
  checks.push(makeCheck(episode.id, "dramatic_bridge", "Dramatic ending bridge", episode.nextEpisodeId || episode.synopsis.toLowerCase().includes("cliffhanger") ? "Ending bridge is present or implied." : "Add a stronger dramatic ending bridge.", episode.nextEpisodeId || episode.synopsis.toLowerCase().includes("cliffhanger") ? "pass" : "warning"));
  checks.push(makeCheck(episode.id, "character_intro", "Character introduction order", timeline.some((item) => item.episodeNumber <= episode.episodeNumber && item.characterInvolved) || arcs.some((item) => item.episodeId === episode.id) ? "Character activity is represented in timeline or arcs." : "No character timeline or arc record found for this episode.", "info"));
  checks.push(makeCheck(episode.id, "business_logic", "Business logic", businessEvents.some((item) => item.episodeId === episode.id) || episode.businessContinuityNotes?.trim() ? "Business continuity is represented." : "No business continuity notes or timeline record found.", businessEvents.some((item) => item.episodeId === episode.id) || episode.businessContinuityNotes?.trim() ? "pass" : "warning"));
  checks.push(makeCheck(episode.id, "trust_visual", "Trust Ncube visual reminder", "Confirm Trust Ncube appearance, wardrobe, age, posture, and authority cues before generating images.", "info"));
  await readerDb.continuityCheckCache.bulkPut(checks);
  return checks;
}

export async function seedDefaultStoryRules() {
  const existing = await listStoryRecords<EotStoryRule>("rules");
  if (existing.length) return existing;
  const created: EotStoryRule[] = [];
  for (const rule of defaultStoryRules) {
    const id = await upsertStoryRecord("rules", rule as unknown as Record<string, unknown>);
    created.push({ id, ...rule, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as EotStoryRule);
  }
  return created;
}

export function buildStoryPrompt(input: { plan: EotEpisodePlan; rules: EotStoryRule[]; checks: EotContinuityCheck[]; promptType: PromptType }) {
  const { plan, rules, checks, promptType } = input;
  return [
    `Empire of Trust ${promptType} prompt`,
    `Episode: S${String(plan.seasonNumber).padStart(2, "0")}E${String(plan.episodeNumber).padStart(2, "0")} - ${plan.title}`,
    `Story date: ${plan.storyDate}`,
    `Active characters: ${plan.activeCharacters}`,
    `Main conflict: ${plan.mainConflict}`,
    `Emotional turn: ${plan.emotionalTurn}`,
    `Business consequence: ${plan.businessConsequence}`,
    `Family consequence: ${plan.familyConsequence}`,
    `Cultural moment: ${plan.culturalMoment}`,
    `Required assets: ${plan.requiredAssets}`,
    `Required locations: ${plan.requiredLocations}`,
    `Cliffhanger question: ${plan.cliffhangerQuestion}`,
    `Next episode bridge: ${plan.nextEpisodeBridge}`,
    "",
    "Continuity notes:",
    ...checks.filter((check) => check.severity !== "pass").map((check) => `- ${check.title}: ${check.description}`),
    "",
    "Story rules:",
    ...rules.filter((rule) => rule.status === "active").map((rule) => `- ${rule.title}: ${rule.body}`),
    "",
    "Style instructions:",
    "- Maintain character appearance reminders and relationship logic.",
    "- Preserve business logic, investor pressure, succession stakes, and cultural tone.",
    "- Write with cinematic business-drama pacing.",
    "- For paragraph work, include emotional tone, scene goal, and continuity-sensitive details.",
    "- For visual prompts, include location, camera direction, lighting, wardrobe, and mood.",
  ].join("\n");
}

export async function saveBuiltPrompt(plan: EotEpisodePlan, promptType: PromptType, output: string) {
  return upsertStoryRecord("prompts", {
    episodePlanId: plan.id,
    promptType,
    title: `${plan.title} / ${promptType}`,
    output,
  });
}
