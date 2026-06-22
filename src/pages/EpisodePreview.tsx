import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ReaderView } from "../components/ReaderView";
import { ErrorState, LoadingState } from "../components/States";
import { useEpisodeContent } from "../hooks/useEpisodeContent";
import { buildEpisodePack } from "../lib/packs";
import type { EpisodePack } from "../types";

export default function EpisodePreview() {
  const { episodeId } = useParams();
  const { episode, chapters, paragraphs, loading, error } = useEpisodeContent(episodeId);
  const [pack, setPack] = useState<EpisodePack | null>(null);

  useEffect(() => {
    if (!episode) return;
    buildEpisodePack(episode, chapters, paragraphs).then(setPack);
  }, [chapters, episode, paragraphs]);

  if (loading) return <LoadingState label="Loading reader preview..." />;
  if (error) return <ErrorState title="Could not load preview" message={error} />;
  if (!episode) return <ErrorState title="Episode not found" />;
  if (!pack) return <LoadingState label="Preparing reader preview..." />;

  return (
    <section className="page">
      <PageHeader eyebrow={episode.episodeIdentifier} title="Reader preview" subtitle={episode.title} actions={[{ label: "Edit", to: `/studio/episodes/${episode.id}/edit` }]} />
      <ReaderView pack={pack} />
    </section>
  );
}
