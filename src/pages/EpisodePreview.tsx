import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { MediaReferencePanel } from "../components/MediaReferencePanel";
import { ReaderView } from "../components/ReaderView";
import { ErrorState, LoadingState } from "../components/States";
import { useEpisodeContent } from "../hooks/useEpisodeContent";
import { buildEpisodePack } from "../lib/packs";
import { sceneFromChapter, upsertScene } from "../lib/sceneRepository";
import type { EpisodePack } from "../types";

export default function EpisodePreview() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
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
      <PageHeader eyebrow={episode.episodeIdentifier} title="Reader preview" subtitle={episode.title} actions={[{ label: "Edit", to: `/studio/episodes/${episode.id}/edit` }, { label: "Scenes", to: "/studio/scenes" }]} />
      <section className="mb-4 panel p-4">
        <h2 className="text-xl font-black">Create scene from chapter</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              className="btn"
              type="button"
              onClick={async () => {
                const id = await upsertScene(sceneFromChapter(episode, chapter));
                navigate(`/studio/scenes/${id}`);
              }}
            >
              {chapter.chapterNumber}. {chapter.title}
            </button>
          ))}
        </div>
      </section>
      <div className="mb-4">
        <MediaReferencePanel entityType="episode" entityId={episode.id} title="Poster, cover image, marketing assets, and trailer prompts" />
      </div>
      <ReaderView pack={pack} />
    </section>
  );
}
