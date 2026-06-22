import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChapterForm } from "../components/ChapterForm";
import { EpisodeForm } from "../components/EpisodeForm";
import { PageHeader } from "../components/PageHeader";
import { ParagraphForm } from "../components/ParagraphForm";
import { ErrorState, LoadingState } from "../components/States";
import { useEpisodeContent } from "../hooks/useEpisodeContent";
import { findEpisodeByIdentifier, updateEpisode } from "../lib/firestore";
import { listActors, listCastingAssignments } from "../lib/actorRepository";
import { listContinuityWarnings, runEpisodeContinuityChecks } from "../lib/continuityRepository";
import { sceneFromChapter, sceneFromParagraphs, upsertScene } from "../lib/sceneRepository";
import { episodeInputFromForm, validateEpisodeInput } from "../lib/studioValidation";
import type { Episode, EotActor, EotCastingAssignment, EotContinuityWarning, EotEpisodeContinuitySummary } from "../types";

export default function EpisodeEdit() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const { episode, chapters, paragraphs, loading, error, reload } = useEpisodeContent(episodeId);
  const [episodeSaved, setEpisodeSaved] = useState(false);
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [episodeError, setEpisodeError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [actors, setActors] = useState<EotActor[]>([]);
  const [casting, setCasting] = useState<EotCastingAssignment[]>([]);
  const [continuitySummary, setContinuitySummary] = useState<EotEpisodeContinuitySummary | null>(null);
  const [continuityWarnings, setContinuityWarnings] = useState<EotContinuityWarning[]>([]);
  const [checkingContinuity, setCheckingContinuity] = useState(false);

  useEffect(() => {
    Promise.all([listActors(), listCastingAssignments(), listContinuityWarnings()])
      .then(([actorRows, castingRows, warningRows]) => {
        setActors(actorRows);
        setCasting(castingRows);
        setContinuityWarnings(warningRows.filter((warning) => warning.targetType === "episode" && warning.targetId === episodeId && warning.status === "open"));
      })
      .catch(() => undefined);
  }, [episodeId]);

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
      <ContinuityPanel
        episode={episode}
        summary={continuitySummary}
        warnings={continuityWarnings}
        checking={checkingContinuity}
        onRun={async () => {
          setCheckingContinuity(true);
          try {
            const result = await runEpisodeContinuityChecks(episode);
            setContinuitySummary(result.summary);
            setContinuityWarnings(result.warnings.filter((warning) => warning.status === "open"));
          } finally {
            setCheckingContinuity(false);
          }
        }}
      />
      <CastPanel activeCharacterIds={episode.activeCharacterIds ?? []} casting={casting} actors={actors} />

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
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    className="btn"
                    type="button"
                    onClick={async () => {
                      const id = await upsertScene(sceneFromChapter(episode, chapter));
                      navigate(`/studio/scenes/${id}`);
                    }}
                  >
                    Create Scene from Chapter
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={async () => {
                      const chapterParagraphs = paragraphs.filter((paragraph) => paragraph.chapterId === chapter.id);
                      if (chapterParagraphs.length === 0) return;
                      const id = await upsertScene(sceneFromParagraphs(episode, chapter, chapterParagraphs));
                      navigate(`/studio/scenes/${id}`);
                    }}
                  >
                    Create Scene from Selected Paragraphs
                  </button>
                </div>
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

function ContinuityPanel({ episode, summary, warnings, checking, onRun }: { episode: Episode; summary: EotEpisodeContinuitySummary | null; warnings: EotContinuityWarning[]; checking: boolean; onRun: () => Promise<void> }) {
  const activeCharacterCount = episode.activeCharacterIds?.length ?? 0;
  const activeBusinessCount = episode.activeBusinesses?.length ?? 0;
  const activePropertyCount = episode.activeProperties?.length ?? 0;
  const activeVehicleCount = episode.activeVehicles?.length ?? 0;
  const status = summary?.continuityStatus ?? (warnings.some((warning) => warning.severity === "critical") ? "critical" : warnings.length ? "warnings" : "unchecked");
  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">Continuity panel</p>
          <h2 className="mt-1 text-xl font-black">Episode continuity status: {status}</h2>
          <p className="mt-1 text-sm text-paper/60">Previous bridge {episode.previousEpisodeId || "missing"} / Ending bridge {episode.nextEpisodeId || "missing"}</p>
        </div>
        <button className="btn btn-primary" type="button" disabled={checking} onClick={onRun}>{checking ? "Checking..." : "Run checks"}</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Characters" value={activeCharacterCount} />
        <Metric label="Businesses" value={activeBusinessCount} />
        <Metric label="Properties" value={activePropertyCount} />
        <Metric label="Vehicles" value={activeVehicleCount} />
        <Metric label="Warnings" value={warnings.length} />
      </div>
      {warnings.length > 0 && <p className="mt-3 text-sm font-semibold text-ember">{warnings.length} unresolved continuity warning(s). Open `/studio/continuity/episode/{episode.id}` for details.</p>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-white/10 bg-black/20 p-3"><p className="text-xl font-black text-signal">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p></div>;
}

function CastPanel({ activeCharacterIds, casting, actors }: { activeCharacterIds: string[]; casting: EotCastingAssignment[]; actors: EotActor[] }) {
  const activeAssignments = casting.filter((row) => activeCharacterIds.includes(row.characterId));
  const missing = activeCharacterIds.filter((characterId) => !activeAssignments.some((row) => row.characterId === characterId && ["approved", "confirmed"].includes(row.status)));
  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Cast list</h2>
          <p className="mt-1 text-sm text-paper/60">Active actors and casting warnings for this episode's active characters.</p>
        </div>
        {missing.length > 0 && <span className="status-badge border-ember text-ember">{missing.length} missing</span>}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {activeAssignments.map((assignment) => {
          const actor = actors.find((item) => item.id === assignment.actorId);
          return (
            <div key={assignment.id} className="border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{assignment.status} / {assignment.roleType}</p>
              <h3 className="mt-1 font-black">{actor?.fullName || actor?.name || assignment.actorId}</h3>
              <p className="mt-1 text-sm text-paper/60">Character {assignment.characterId}</p>
            </div>
          );
        })}
        {activeAssignments.length === 0 && <p className="text-sm text-paper/60">No active actor assignments cached for this episode yet.</p>}
      </div>
      {missing.length > 0 && <p className="mt-3 text-sm font-semibold text-ember">Missing approved/confirmed casting for: {missing.join(", ")}</p>}
    </section>
  );
}
