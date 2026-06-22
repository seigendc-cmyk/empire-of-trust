import { useCallback, useEffect, useState } from "react";
import { getEpisode, listChapters, listParagraphs } from "../lib/firestore";
import type { Chapter, Episode, Paragraph } from "../types";

export function useEpisodeContent(episodeId?: string) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!episodeId) return;
    setLoading(true);
    setError("");
    try {
      const [episodeData, chapterData, paragraphData] = await Promise.all([
        getEpisode(episodeId),
        listChapters(episodeId),
        listParagraphs(episodeId),
      ]);
      setEpisode(episodeData);
      const sortedChapters = chapterData.slice().sort((a, b) => a.chapterNumber - b.chapterNumber);
      setChapters(sortedChapters);
      setParagraphs(
        paragraphData.slice().sort((a, b) => {
          const chapterA = sortedChapters.findIndex((chapter) => chapter.id === a.chapterId);
          const chapterB = sortedChapters.findIndex((chapter) => chapter.id === b.chapterId);
          if (chapterA !== chapterB) return chapterA - chapterB;
          return a.paragraphNumber - b.paragraphNumber;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load episode content.");
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { episode, chapters, paragraphs, loading, error, reload };
}
