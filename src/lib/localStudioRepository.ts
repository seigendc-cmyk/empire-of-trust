import type { Chapter, Episode, EpisodePack, Paragraph } from "../types";
import type { EpisodeInput } from "./studioValidation";

const EPISODES_KEY = "eot.localStudio.episodes";
const CHAPTERS_KEY = "eot.localStudio.chapters";
const PARAGRAPHS_KEY = "eot.localStudio.paragraphs";
const PACKS_KEY = "eot.localStudio.packMetadata";

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function listLocalEpisodes() {
  return read<Episode[]>(EPISODES_KEY, []).sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
}

export function getLocalEpisode(episodeId: string) {
  return listLocalEpisodes().find((episode) => episode.id === episodeId) ?? null;
}

export function findLocalEpisodeByIdentifier(episodeIdentifier: string) {
  return listLocalEpisodes().filter((episode) => episode.episodeIdentifier === episodeIdentifier);
}

export function createLocalEpisode(input: EpisodeInput) {
  const episodes = listLocalEpisodes();
  const episode: Episode = {
    id: id("episode"),
    ...input,
    createdAt: now(),
    updatedAt: now(),
  };
  write(EPISODES_KEY, [...episodes, episode]);
  return episode.id;
}

export function updateLocalEpisode(episodeId: string, input: Partial<EpisodeInput>) {
  const episodes = listLocalEpisodes();
  write(EPISODES_KEY, episodes.map((episode) => episode.id === episodeId ? { ...episode, ...input, updatedAt: now() } : episode));
}

export function listLocalChapters(episodeId: string) {
  return read<Chapter[]>(CHAPTERS_KEY, []).filter((chapter) => chapter.episodeId === episodeId).sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export function upsertLocalChapter(input: Omit<Chapter, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const chapters = read<Chapter[]>(CHAPTERS_KEY, []);
  if (input.id) {
    write(CHAPTERS_KEY, chapters.map((chapter) => chapter.id === input.id ? { ...chapter, ...input, id: input.id, updatedAt: now() } : chapter));
    return input.id;
  }
  const chapter: Chapter = { ...input, id: id("chapter"), createdAt: now(), updatedAt: now() };
  write(CHAPTERS_KEY, [...chapters, chapter]);
  return chapter.id;
}

export function listLocalParagraphs(episodeId: string) {
  return read<Paragraph[]>(PARAGRAPHS_KEY, []).filter((paragraph) => paragraph.episodeId === episodeId).sort((a, b) => a.paragraphNumber - b.paragraphNumber);
}

export function upsertLocalParagraph(input: Omit<Paragraph, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const paragraphs = read<Paragraph[]>(PARAGRAPHS_KEY, []);
  if (input.id) {
    write(PARAGRAPHS_KEY, paragraphs.map((paragraph) => paragraph.id === input.id ? { ...paragraph, ...input, id: input.id, updatedAt: now() } : paragraph));
    return input.id;
  }
  const paragraph: Paragraph = { ...input, id: id("paragraph"), createdAt: now(), updatedAt: now() };
  write(PARAGRAPHS_KEY, [...paragraphs, paragraph]);
  return paragraph.id;
}

export function deleteLocalParagraph(paragraphId: string) {
  write(PARAGRAPHS_KEY, read<Paragraph[]>(PARAGRAPHS_KEY, []).filter((paragraph) => paragraph.id !== paragraphId));
}

export function saveLocalPackMetadata(episodeId: string, pack: EpisodePack) {
  const rows = read<Array<Record<string, unknown>>>(PACKS_KEY, []);
  const key = `${pack.manifest.packId}_${pack.manifest.version}`;
  const next = rows.filter((row) => row.id !== key);
  write(PACKS_KEY, [...next, { id: key, episodeId, packId: pack.manifest.packId, version: pack.manifest.version, title: pack.manifest.title, createdAt: now() }]);
}
