import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { ChapterForm } from "../components/ChapterForm";
import { EpisodeForm } from "../components/EpisodeForm";
import { PageHeader } from "../components/PageHeader";
import { ParagraphForm } from "../components/ParagraphForm";
import { ErrorState, LoadingState } from "../components/States";
import { useEpisodeContent } from "../hooks/useEpisodeContent";
import { findEpisodeByIdentifier, updateEpisode } from "../lib/firestore";
import { episodeInputFromForm, validateEpisodeInput } from "../lib/studioValidation";

export default function EpisodeEdit() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const { episode, chapters, paragraphs, loading, error, reload } = useEpisodeContent(episodeId);
  const [episodeSaved, setEpisodeSaved] = useState(false);
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [episodeError, setEpisodeError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");

  if (loading) return <LoadingState label="Loading episode editor..." />;
  if (error) return <ErrorState title="Could not load episode" message={error} />;
  if (!episode || !episodeId) return <ErrorState title="Episode not found" message="The requested episode is not available in Firestore." />;

  return (
    <section className="page grid gap-6">
      <PageHeader
        eyebrow={episode.episodeIdentifier}
        title="Edit episode"
        subtitle={episode.title}
        actions={[
          { label: "Preview", to: `/studio/episodes/${episodeId}/preview` },
          { label: "Build Pack", to: `/studio/episodes/${episodeId}/build-pack`, primary: true },
        ]}
      />

      <EpisodeForm
        episode={episode}
        submitLabel={savingEpisode ? "Saving..." : "Save episode"}
        onSubmit={async (formData) => {
          const input = episodeInputFromForm(formData);
          const errors = validateEpisodeInput(input);
          if (errors.length > 0) {
            setEpisodeError(errors.join(" "));
            return;
          }
          setSavingEpisode(true);
          setEpisodeError("");
          setDuplicateWarning("");
          setEpisodeSaved(false);
          try {
            const duplicates = await findEpisodeByIdentifier(input.episodeIdentifier);
            const otherDuplicate = duplicates.find((item) => item.id !== episodeId);
            if (otherDuplicate) {
              setDuplicateWarning(`Duplicate episodeIdentifier warning: ${input.episodeIdentifier} is already used by "${otherDuplicate.title}".`);
            }
            await updateEpisode(episodeId, input);
            setEpisodeSaved(true);
            navigate(`/studio/episodes/${episodeId}/edit`);
            reload();
          } catch (err) {
            setEpisodeError(err instanceof Error ? err.message : "Could not save episode.");
          } finally {
            setSavingEpisode(false);
          }
        }}
      />
      {duplicateWarning && <div className="border border-signal bg-signal/10 p-3 text-sm font-semibold text-signal">{duplicateWarning}</div>}
      {episodeError && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{episodeError}</div>}
      {episodeSaved && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">Episode saved.</div>}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-4 text-xl font-black">Add Chapter</h2>
          <ChapterForm episodeId={episodeId} onSaved={reload} />
        </div>
        <div className="panel p-4">
          <h2 className="mb-4 text-xl font-black">Add Paragraph</h2>
          <ParagraphForm episodeId={episodeId} chapters={chapters} onSaved={reload} />
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-4 text-xl font-black">Chapter order</h2>
        <div className="grid gap-3">
          {chapters.length === 0 && <p className="text-sm leading-6 text-paper/60">No chapters yet. Add the first chapter above.</p>}
          {chapters.map((chapter) => (
            <details key={chapter.id} className="border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer font-bold">{chapter.chapterNumber}. {chapter.title}</summary>
              <div className="mt-3">
                <ChapterForm episodeId={episodeId} chapter={chapter} onSaved={reload} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-4 text-xl font-black">Paragraph order</h2>
        <div className="grid gap-3">
          {paragraphs.length === 0 && <p className="text-sm leading-6 text-paper/60">No paragraphs yet. Add a chapter first, then add paragraphs.</p>}
          {chapters.map((chapter) => {
            const chapterParagraphs = paragraphs.filter((paragraph) => paragraph.chapterId === chapter.id);
            if (chapterParagraphs.length === 0) return null;
            return (
              <section key={chapter.id} className="grid gap-2">
                <h3 className="border-l-2 border-signal pl-3 text-sm font-black uppercase tracking-[0.14em] text-paper/70">
                  {chapter.chapterNumber}. {chapter.title}
                </h3>
                {chapterParagraphs.map((paragraph) => (
                  <details key={paragraph.id} className="border border-white/10 bg-black/20 p-3">
                    <summary className="cursor-pointer font-bold">
                      {paragraph.paragraphNumber}. {paragraph.body.slice(0, 96)}
                    </summary>
                    <div className="mt-3">
                      <ParagraphForm episodeId={episodeId} chapters={chapters} paragraph={paragraph} canDeleteDraft={episode.status === "draft"} onSaved={reload} />
                    </div>
                  </details>
                ))}
              </section>
            );
          })}
        </div>
      </section>
    </section>
  );
}
