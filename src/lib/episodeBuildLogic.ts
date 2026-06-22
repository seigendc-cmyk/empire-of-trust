import type { Chapter, ContinuityPrep, Episode, ImageSlot, Paragraph } from "../types";

function parseJsonList(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const baselineAges: Record<string, number> = {
  trust_ncube: 55,
  mamada: 52,
  marjo_ncube: 31,
  selion_ncube: 29,
  gerald_ncube: 27,
  tandi_ncube: 25,
  shalovy_ncube: 23,
  shannice_ncube: 21,
  tanatswa_gwara: 28,
  emma_zulu: 30,
  alex: 34,
  stanley: 46,
  james: 39,
};

const knownCharacterNames = [
  "Trust Ncube",
  "Mamada",
  "Marjo Ncube",
  "Selion Ncube",
  "Gerald Ncube",
  "Tandi Ncube",
  "Shalovy Ncube",
  "Shannice Ncube",
  "Tanatswa Gwara",
  "Emma Zulu",
  "Alex",
  "Stanley",
  "James",
];

export function normalizeCharacterKey(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function characterImagePath(name: string, variant: "main" | "portrait" = "main", emotionKey = "") {
  const key = normalizeCharacterKey(name);
  if (emotionKey) return `/eot/characters/${key}/emotion/${normalizeCharacterKey(emotionKey)}.webp`;
  return `/eot/characters/${key}/${variant}.webp`;
}

export function sceneImagePath(sceneKey: string) {
  return `/eot/scenes/${normalizeCharacterKey(sceneKey)}.webp`;
}

export function episodeAssetPath(episode: Episode, assetName: string) {
  return `/eot/episodes/season-${episode.seasonNumber}/episode-${episode.episodeNumber}/${normalizeCharacterKey(assetName)}.webp`;
}

export function splitNotes(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? "").split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
}

export function activeCharacterNames(episode: Episode) {
  const raw = splitNotes(episode.activeCharacters).join(" ");
  const found = knownCharacterNames.filter((name) => raw.toLowerCase().includes(name.toLowerCase()));
  const namedLines = splitNotes(episode.activeCharacters).map((line) => line.split(/[(:,-]/)[0]?.trim()).filter(Boolean);
  return Array.from(new Set([...found, ...namedLines])).filter(Boolean);
}

export function storyYear(storyDate: string) {
  const date = new Date(storyDate);
  return Number.isFinite(date.getTime()) ? date.getFullYear() : 2026;
}

export function characterAgeCheck(episode: Episode) {
  const yearOffset = storyYear(episode.settingDate || episode.storyDate) - 2026;
  return activeCharacterNames(episode).map((name) => {
    const characterKey = normalizeCharacterKey(name);
    const baselineAge = baselineAges[characterKey] ?? 0;
    const currentStoryAge = baselineAge ? baselineAge + yearOffset : 0;
    return {
      characterName: name,
      characterKey,
      baselineDate: "June 2026",
      baselineAge,
      currentStoryAge,
      ageProgression: baselineAge ? `${yearOffset >= 0 ? "+" : ""}${yearOffset} years from baseline` : "Baseline age not configured",
    };
  });
}

export function characterImageCheck(episode: Episode) {
  return activeCharacterNames(episode).map((name) => {
    const characterKey = normalizeCharacterKey(name);
    return {
      characterName: name,
      characterKey,
      mainImagePath: characterImagePath(name, "main"),
      portraitImagePath: characterImagePath(name, "portrait"),
      placeholderPath: "/eot/placeholders/character_placeholder.webp",
    };
  });
}

export function parseImageSlots(value: unknown): ImageSlot[] {
  if (Array.isArray(value)) return value as ImageSlot[];
  if (typeof value !== "string") return [];
  return parseJsonList(value) as ImageSlot[];
}

export function paragraphImageSlots(episode: Episode, chapter: Chapter, paragraph: Paragraph): ImageSlot[] {
  const savedSlots = parseImageSlots((paragraph as Paragraph & { imageSlotsJson?: string }).imageSlots ?? (paragraph as Paragraph & { imageSlotsJson?: string }).imageSlotsJson);
  if (savedSlots.length) return savedSlots;
  const slots: ImageSlot[] = [];
  const mentioned = paragraph.mentionedCharacterIds?.length ? paragraph.mentionedCharacterIds : activeCharacterNames(episode);
  if (mentioned[0]) {
    slots.push({
      id: `${paragraph.id || chapter.id}-character`,
      imageType: "character",
      characterName: mentioned[0],
      firebaseStoragePath: characterImagePath(mentioned[0], "main"),
      fallbackImagePath: "/eot/placeholders/character_placeholder.webp",
      imagePrompt: paragraph.imagePrompt || identityPrompt(mentioned[0], episode),
      altText: `${mentioned[0]} in ${episode.title}`,
      displayMode: "inline",
    });
  }
  if (paragraph.scenePrompt || paragraph.imagePrompt) {
    slots.push({
      id: `${paragraph.id || chapter.id}-scene`,
      imageType: "scene",
      firebaseStoragePath: sceneImagePath(`${episode.episodeIdentifier}-${chapter.chapterNumber}-${paragraph.paragraphNumber}`),
      fallbackImagePath: "/eot/placeholders/scene_placeholder.webp",
      imagePrompt: paragraph.scenePrompt || paragraph.imagePrompt,
      altText: `Scene illustration for ${chapter.title}`,
      displayMode: paragraph.paragraphNumber === 1 ? "chapter-header" : "inline",
    });
  }
  return slots;
}

export function identityPrompt(characterName: string, episode: Episode) {
  const age = characterAgeCheck(episode).find((item) => item.characterName === characterName);
  return [
    characterName,
    age?.currentStoryAge ? `current story age ${age.currentStoryAge}` : "",
    age?.baselineAge ? `baseline age ${age.baselineAge} in June 2026` : "",
    "preserve face shape, complexion, hair or baldness, eyes, clothing style, expression, body language, dramatic lighting, professional Zimbabwean corporate context",
  ].filter(Boolean).join("; ");
}

export function buildContinuityPrep(episode: Episode, chapters: Chapter[], paragraphs: Paragraph[]): ContinuityPrep {
  return {
    previousEpisodeConnection: episode.previousEpisodeBridge || episode.previousEpisodeId || "",
    activeCharacters: activeCharacterNames(episode),
    characterAgeCheck: characterAgeCheck(episode),
    characterImageCheck: characterImageCheck(episode),
    mainConflict: episode.mainConflict || episode.synopsis || "",
    businessContinuityNotes: splitNotes(episode.businessContinuityNotes),
    culturalContinuityNotes: splitNotes(episode.culturalContinuityNotes),
    chapterOutline: chapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber).map((chapter) => `${chapter.chapterNumber}. ${chapter.title}: ${chapter.intro}`),
    illustrationPlan: paragraphs.flatMap((paragraph) => splitNotes(paragraph.imagePrompt || paragraph.scenePrompt)).slice(0, 30),
  };
}

export function commerceRuleWarnings(episode: Episode, paragraphs: Paragraph[]) {
  const text = [episode.synopsis, episode.businessContinuityNotes, ...paragraphs.map((paragraph) => `${paragraph.body} ${paragraph.businessContinuityNote}`)].join(" ").toLowerCase();
  const warnings: string[] = [];
  if (text.includes("sci marketplace sells") || text.includes("digital commerce sells vendor") || text.includes("owns vendor inventory")) {
    warnings.push("SCI Marketplace rule risk: it must be discovery, verification, visibility, lead generation, business intelligence, and commerce connectivity. Digital Commerce must not own vendor inventory.");
  }
  return warnings;
}
