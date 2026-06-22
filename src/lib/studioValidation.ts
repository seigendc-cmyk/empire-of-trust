import type { Chapter, EpisodeStatus, Paragraph } from "../types";
import { episodeIdentifier, numberValue, stringValue } from "./forms";

export interface EpisodeInput {
  seasonNumber: number;
  episodeNumber: number;
  releaseWeekNumber: number;
  episodeIdentifier: string;
  title: string;
  synopsis: string;
  storyDate: string;
  status: EpisodeStatus;
  requiredLicencePlan: string;
  previousEpisodeId: string;
  nextEpisodeId: string;
  activeCharacters: string;
  activeCharacterIds?: string[];
  activeProperties?: string[];
  activeVehicles?: string[];
  businessContinuityNotes: string;
  propertyContinuityNotes?: string;
  locationContinuityNotes?: string;
  vehicleContinuityNotes?: string;
  culturalContinuityNotes: string;
}

export function episodeInputFromForm(formData: FormData): EpisodeInput {
  const seasonNumber = numberValue(formData, "seasonNumber");
  const episodeNumber = numberValue(formData, "episodeNumber");
  return {
    seasonNumber,
    episodeNumber,
    releaseWeekNumber: numberValue(formData, "releaseWeekNumber"),
    episodeIdentifier: (stringValue(formData, "episodeIdentifier") || episodeIdentifier(seasonNumber, episodeNumber)).trim(),
    title: stringValue(formData, "title").trim(),
    synopsis: stringValue(formData, "synopsis").trim(),
    storyDate: stringValue(formData, "storyDate"),
    status: stringValue(formData, "status", "draft") as EpisodeStatus,
    requiredLicencePlan: stringValue(formData, "requiredLicencePlan", "reader").trim(),
    previousEpisodeId: stringValue(formData, "previousEpisodeId").trim(),
    nextEpisodeId: stringValue(formData, "nextEpisodeId").trim(),
    activeCharacters: stringValue(formData, "activeCharacters").trim(),
    activeCharacterIds: stringValue(formData, "activeCharacterIds").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
    activeProperties: stringValue(formData, "activeProperties").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
    activeVehicles: stringValue(formData, "activeVehicles").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
    businessContinuityNotes: stringValue(formData, "businessContinuityNotes").trim(),
    propertyContinuityNotes: stringValue(formData, "propertyContinuityNotes").trim(),
    locationContinuityNotes: stringValue(formData, "locationContinuityNotes").trim(),
    vehicleContinuityNotes: stringValue(formData, "vehicleContinuityNotes").trim(),
    culturalContinuityNotes: stringValue(formData, "culturalContinuityNotes").trim(),
  };
}

export function validateEpisodeInput(input: EpisodeInput) {
  const errors: string[] = [];
  if (input.seasonNumber < 1) errors.push("Season number must be 1 or higher.");
  if (input.episodeNumber < 1) errors.push("Episode number must be 1 or higher.");
  if (input.releaseWeekNumber < 1) errors.push("Release week number must be 1 or higher.");
  if (!input.episodeIdentifier) errors.push("Episode identifier is required.");
  if (!/^[A-Za-z0-9-]+$/.test(input.episodeIdentifier)) errors.push("Episode identifier can use letters, numbers, and hyphens only.");
  if (!input.title) errors.push("Title is required.");
  if (!input.requiredLicencePlan) errors.push("Required licence plan is required.");
  return errors;
}

export function validateChapterInput(input: Pick<Chapter, "chapterNumber" | "title">) {
  const errors: string[] = [];
  if (input.chapterNumber < 1) errors.push("Chapter number must be 1 or higher.");
  if (!input.title.trim()) errors.push("Chapter title is required.");
  return errors;
}

export function validateParagraphInput(input: Pick<Paragraph, "chapterId" | "paragraphNumber" | "body" | "dialogueJson" | "interactiveLinksJson">) {
  const errors: string[] = [];
  if (!input.chapterId) errors.push("Choose a chapter before saving a paragraph.");
  if (input.paragraphNumber < 1) errors.push("Paragraph number must be 1 or higher.");
  if (!input.body.trim()) errors.push("Paragraph body is required.");
  for (const [label, value] of [["Dialogue JSON", input.dialogueJson], ["Interactive links JSON", input.interactiveLinksJson]] as const) {
    try {
      JSON.parse(value || "[]");
    } catch {
      errors.push(`${label} must be valid JSON.`);
    }
  }
  return errors;
}
