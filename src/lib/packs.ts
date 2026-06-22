import type { Chapter, Episode, EpisodePack, Paragraph } from "../types";
import { buildContinuityPrep, commerceRuleWarnings, episodeAssetPath, paragraphImageSlots, splitNotes } from "./episodeBuildLogic";

export interface PackValidationIssue {
  level: "error" | "warning";
  message: string;
}

export interface BuildPackOptions {
  version: string;
}

export function parseJsonList(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function validateEpisodePackSource(episode: Episode, chapters: Chapter[], paragraphs: Paragraph[]) {
  const issues: PackValidationIssue[] = [];
  if (!episode.title.trim()) issues.push({ level: "error", message: "Episode must have a title." });
  if (!episode.episodeIdentifier.trim()) issues.push({ level: "error", message: "Episode must have an episodeIdentifier." });
  if (!episode.introNarrative?.trim()) issues.push({ level: "warning", message: "Episode is missing dramatic intro narrative." });
  if (!episode.previousEpisodeBridge?.trim()) issues.push({ level: "warning", message: "Episode is missing previous episode continuity bridge." });
  if (!episode.endingHook?.trim()) issues.push({ level: "warning", message: "Episode should end with a forward momentum hook." });
  if (chapters.length === 0) issues.push({ level: "error", message: "Episode must have at least one chapter." });
  commerceRuleWarnings(episode, paragraphs).forEach((message) => issues.push({ level: "warning", message }));

  chapters.forEach((chapter) => {
    const chapterParagraphs = paragraphs.filter((paragraph) => paragraph.chapterId === chapter.id);
    if (!chapter.title.trim()) issues.push({ level: "error", message: `Chapter ${chapter.chapterNumber} must have a title.` });
    if (chapterParagraphs.length === 0) issues.push({ level: "error", message: `Chapter ${chapter.chapterNumber} must have at least one paragraph.` });
    chapterParagraphs.forEach((paragraph) => {
      if (!paragraph.body.trim()) issues.push({ level: "error", message: `Paragraph ${paragraph.paragraphNumber} in chapter ${chapter.chapterNumber} must have body text.` });
      if (!paragraph.imagePrompt.trim()) issues.push({ level: "warning", message: `Paragraph ${paragraph.paragraphNumber} in chapter ${chapter.chapterNumber} is missing imagePrompt.` });
      if (!paragraph.emotionalTone.trim()) issues.push({ level: "warning", message: `Paragraph ${paragraph.paragraphNumber} in chapter ${chapter.chapterNumber} is missing emotionalTone.` });
    });
  });

  return issues;
}

async function sha256(value: string) {
  if (!crypto.subtle) return "frontend-placeholder-checksum";
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildEpisodePack(episode: Episode, chapters: Chapter[], paragraphs: Paragraph[], options: BuildPackOptions = { version: "1.0.0" }): Promise<EpisodePack> {
  const fallbackIdentifier = `S${String(episode.seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`;
  const episodeIdentifier = episode.episodeIdentifier || fallbackIdentifier;
  const createdAt = new Date().toISOString();
  const continuityPrep = buildContinuityPrep(episode, chapters, paragraphs);

  const content: EpisodePack["content"] = {
    episode: {
      id: episode.id,
      title: episode.title,
      synopsis: episode.synopsis,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      releaseWeekNumber: episode.releaseWeekNumber,
      episodeIdentifier,
      episodeCode: episode.episodeCode || episodeIdentifier,
      storyDate: episode.storyDate,
      settingDate: episode.settingDate || episode.storyDate,
      introTitle: episode.introTitle || episode.title,
      introNarrative: episode.introNarrative || episode.synopsis,
      previousEpisodeBridge: episode.previousEpisodeBridge || episode.previousEpisodeId || "",
      mainConflict: episode.mainConflict || episode.synopsis,
      endingHook: episode.endingHook || "",
      nextEpisodeBridgeText: episode.nextEpisodeBridge || episode.nextEpisodeId || "",
      status: episode.status,
      requiredLicencePlan: episode.requiredLicencePlan || "reader",
      previousEpisodeId: episode.previousEpisodeId || "",
      nextEpisodeId: episode.nextEpisodeId || "",
      activeCharacters: episode.activeCharacters || "",
      activeCharacterIds: episode.activeCharacterIds || [],
      activeProperties: episode.activeProperties || [],
      activeVehicles: episode.activeVehicles || [],
      businessContinuityNotes: episode.businessContinuityNotes || "",
      businessNotes: splitNotes(episode.businessContinuityNotes),
      culturalContinuityNotes: episode.culturalContinuityNotes || "",
      culturalNotes: splitNotes(episode.culturalContinuityNotes),
      continuityPrep,
      imageSlots: [
        {
          id: `${episode.id}-hero`,
          imageType: "scene",
          firebaseStoragePath: episodeAssetPath(episode, "hero"),
          fallbackImagePath: "/eot/placeholders/scene_placeholder.webp",
          imagePrompt: episode.introNarrative || episode.synopsis,
          altText: `${episode.title} hero image`,
          displayMode: "hero",
        },
      ],
      propertyContinuityNotes: episode.propertyContinuityNotes || "",
      locationContinuityNotes: episode.locationContinuityNotes || "",
      vehicleContinuityNotes: episode.vehicleContinuityNotes || "",
      chapters: chapters
        .slice()
        .sort((a, b) => a.chapterNumber - b.chapterNumber)
        .map((chapter) => ({
          id: chapter.id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          intro: chapter.intro,
          previousEpisodeBridge: chapter.previousEpisodeBridge,
          previousSceneReview: chapter.previousSceneReview || chapter.previousEpisodeBridge,
          emotionalTone: chapter.emotionalTone,
          sceneLocation: chapter.sceneLocation,
          scenePropertyId: chapter.scenePropertyId || "",
          sceneLocationText: chapter.sceneLocationText || "",
          sceneVehicleIds: chapter.sceneVehicleIds || [],
          featuredCharacterIds: chapter.featuredCharacterIds || [],
          paragraphs: paragraphs
            .filter((paragraph) => paragraph.chapterId === chapter.id)
            .sort((a, b) => a.paragraphNumber - b.paragraphNumber)
            .map((paragraph) => ({
              id: paragraph.id,
              paragraphNumber: paragraph.paragraphNumber,
              body: paragraph.body,
              narrativeText: paragraph.narrativeText || paragraph.body,
              dialogue: parseJsonList(paragraph.dialogueJson),
              dialogueCues: paragraph.dialogueCues || parseJsonList(paragraph.dialogueJson).map((item) => typeof item === "string" ? item : JSON.stringify(item)),
              imagePrompt: paragraph.imagePrompt,
              scenePrompt: paragraph.scenePrompt,
              cameraDirection: paragraph.cameraDirection,
              cinematicDirection: paragraph.cinematicDirection || paragraph.cameraDirection,
              emotionalTone: paragraph.emotionalTone,
              culturalDetail: paragraph.culturalDetail,
              culturalContinuityNote: paragraph.culturalContinuityNote || paragraph.culturalDetail,
              businessContinuityNote: paragraph.businessContinuityNote,
              interactiveLinks: parseJsonList(paragraph.interactiveLinksJson),
              imageSlots: paragraphImageSlots(episode, chapter, paragraph),
              mentionedCharacterIds: paragraph.mentionedCharacterIds || [],
              mentionedProperties: paragraph.mentionedProperties || [],
              propertyInteractionPrompt: paragraph.propertyInteractionPrompt || "",
              mentionedVehicles: paragraph.mentionedVehicles || [],
              vehicleInteractionPrompt: paragraph.vehicleInteractionPrompt || "",
            })),
        })),
    },
  };

  const checksum = await sha256(JSON.stringify(content));

  return {
    manifest: {
      packId: `EOT-EP-${episodeIdentifier}`,
      packType: "episode",
      version: options.version || "1.0.0",
      title: episode.title,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      releaseWeekNumber: episode.releaseWeekNumber,
      episodeIdentifier,
      createdAt,
      storyDate: episode.storyDate,
      requiredLicencePlan: episode.requiredLicencePlan || "reader",
      checksumAlgorithm: "SHA-256",
      checksum,
      signature: "frontend-placeholder-signature",
    },
    content,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
