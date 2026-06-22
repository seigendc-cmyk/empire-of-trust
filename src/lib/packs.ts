import type { Chapter, Episode, EpisodePack, Paragraph } from "../types";

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
  if (chapters.length === 0) issues.push({ level: "error", message: "Episode must have at least one chapter." });

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

  const content: EpisodePack["content"] = {
    episode: {
      id: episode.id,
      title: episode.title,
      synopsis: episode.synopsis,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      releaseWeekNumber: episode.releaseWeekNumber,
      episodeIdentifier,
      storyDate: episode.storyDate,
      status: episode.status,
      requiredLicencePlan: episode.requiredLicencePlan || "reader",
      previousEpisodeId: episode.previousEpisodeId || "",
      nextEpisodeId: episode.nextEpisodeId || "",
      activeCharacters: episode.activeCharacters || "",
      businessContinuityNotes: episode.businessContinuityNotes || "",
      culturalContinuityNotes: episode.culturalContinuityNotes || "",
      chapters: chapters
        .slice()
        .sort((a, b) => a.chapterNumber - b.chapterNumber)
        .map((chapter) => ({
          id: chapter.id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          intro: chapter.intro,
          previousEpisodeBridge: chapter.previousEpisodeBridge,
          emotionalTone: chapter.emotionalTone,
          sceneLocation: chapter.sceneLocation,
          paragraphs: paragraphs
            .filter((paragraph) => paragraph.chapterId === chapter.id)
            .sort((a, b) => a.paragraphNumber - b.paragraphNumber)
            .map((paragraph) => ({
              id: paragraph.id,
              paragraphNumber: paragraph.paragraphNumber,
              body: paragraph.body,
              dialogue: parseJsonList(paragraph.dialogueJson),
              imagePrompt: paragraph.imagePrompt,
              scenePrompt: paragraph.scenePrompt,
              cameraDirection: paragraph.cameraDirection,
              emotionalTone: paragraph.emotionalTone,
              culturalDetail: paragraph.culturalDetail,
              businessContinuityNote: paragraph.businessContinuityNote,
              interactiveLinks: parseJsonList(paragraph.interactiveLinksJson),
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
