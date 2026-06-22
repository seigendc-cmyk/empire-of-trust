import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { OfflineStatusBadge } from "../components/OfflineStatusBadge";
import { DramaPollCard } from "../components/DramaPollCard";
import { ChapterBusinessSpotlight } from "../components/ChapterBusinessSpotlight";
import { PredictionCard } from "../components/PredictionCard";
import { RewardToast } from "../components/RewardToast";
import { ErrorState, LoadingState } from "../components/States";
import { parseJsonList } from "../lib/packs";
import { getImportedPack, getReaderSettings, getReadingProgress, logActivity, saveReadingProgress, saveReaderSettings, type ReaderSettings, type ReadingProgress } from "../lib/offlineDb";
import type { EpisodePack, ImageSlot } from "../types";

type PackParagraph = EpisodePack["content"]["episode"]["chapters"][number]["paragraphs"][number];

function paragraphKey(chapterId: string, paragraph: PackParagraph) {
  return paragraph.id || `${chapterId}-${paragraph.paragraphNumber}`;
}

export default function ReaderChapter() {
  const { episodeId, chapterId } = useParams();
  const navigate = useNavigate();
  const [pack, setPack] = useState<EpisodePack | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [settings, setSettings] = useState<ReaderSettings>({ id: "reader", fontSize: "medium", showImagePrompts: true, showMetadata: true });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!episodeId) return;
    Promise.all([getImportedPack(episodeId), getReadingProgress(episodeId), getReaderSettings()])
      .then(([data, savedProgress, savedSettings]) => {
        setPack(data ?? null);
        setProgress(savedProgress ?? null);
        setSettings(savedSettings);
        if (data && chapterId) logActivity("chapter_opened", { episodeId, chapterId, targetType: "chapter", targetId: chapterId }).catch(() => undefined);
      })
      .finally(() => setLoading(false));
  }, [episodeId]);

  const chapters = useMemo(() => pack?.content.episode.chapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber) ?? [], [pack]);
  const chapter = chapters.find((item) => item.id === chapterId);
  const paragraphs = useMemo(() => chapter?.paragraphs.slice().sort((a, b) => a.paragraphNumber - b.paragraphNumber) ?? [], [chapter]);
  const chapterIndex = chapters.findIndex((item) => item.id === chapterId);
  const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

  if (loading) return <LoadingState label="Opening offline chapter..." />;
  if (!pack || !episodeId || !chapterId || !chapter) return <ErrorState title="Chapter not found offline" message="Return to the episode and choose a stored chapter." />;
  const shouldAvoidChapterSpotlight = ["dialogue", "emotional", "romance", "cliffhanger"].some((term) =>
    [chapter.emotionalTone, pack.content.episode.endingHook].join(" ").toLowerCase().includes(term),
  );

  async function markProgress(paragraph: PackParagraph) {
    const nextProgress = {
      episodeId: episodeId!,
      chapterId: chapterId!,
      paragraphId: paragraphKey(chapterId!, paragraph),
      updatedAt: new Date().toISOString(),
    };
    setProgress(nextProgress);
    await saveReadingProgress(nextProgress);
    await logActivity("paragraph_viewed", { episodeId: episodeId!, chapterId: chapterId!, paragraphId: nextProgress.paragraphId });
    setToast("Progress saved locally");
    window.setTimeout(() => setToast(""), 2500);
  }

  async function completeEpisode() {
    await logActivity("episode_completed", { episodeId: episodeId!, chapterId: chapterId!, targetType: "episode", targetId: episodeId! });
    setToast("+25 points / Episode completed");
    window.setTimeout(() => setToast(""), 2500);
  }

  function universeLinkTarget(link: unknown) {
    if (typeof link !== "object" || link === null) return "";
    const record = link as { type?: string; targetType?: string; id?: string; targetId?: string; episodeId?: string };
    const type = record.type ?? record.targetType;
    const targetId = record.id ?? record.targetId;
    if (!type || !targetId) return "";
    if (type === "character") return `/characters/${targetId}`;
    if (type === "actor") return `/actors/${targetId}`;
    if (type === "business") return `/businesses/${targetId}`;
    if (type === "property") return `/properties/${targetId}`;
    if (type === "vehicle") return `/vehicles/${targetId}`;
    if (type === "asset") return `/assets/${targetId}`;
    if (type === "vendor") return `/mall/vendors/${targetId}`;
    if (type === "product") return `/mall/products/${targetId}`;
    if (type === "category") return `/mall/categories/${targetId}`;
    if (type === "episode") return `/reader/${record.episodeId ?? targetId}`;
    return "";
  }

  return (
    <section className="reader-screen">
      <RewardToast message={toast} />
      <header className="reader-toolbar">
        <Link className="btn min-h-10 px-3 py-2" to={`/reader/${episodeId}`}>Chapters</Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-signal">{pack.manifest.episodeIdentifier}</p>
          <h1 className="truncate text-sm font-black">{chapter.chapterNumber}. {chapter.title}</h1>
        </div>
        <OfflineStatusBadge />
      </header>

      <article className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-5 sm:px-6">
        <header className="border-b border-signal/50 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Chapter {chapter.chapterNumber}</p>
          <h2 className="mt-2 font-serif text-3xl font-bold leading-tight">{chapter.title}</h2>
          {chapter.intro && <p className="mt-4 text-base leading-7 text-paper/70">{chapter.intro}</p>}
          {chapter.previousSceneReview && <p className="mt-4 border-l-2 border-signal pl-3 text-sm leading-6 text-muted">{chapter.previousSceneReview}</p>}
          <div className="mt-5 grid gap-2 border border-white/10 bg-black/20 p-3 text-sm font-semibold">
            <label>
              <span className="label">Font size</span>
              <select
                className="field"
                value={settings.fontSize}
                onChange={async (event) => {
                  const nextSettings = { ...settings, fontSize: event.currentTarget.value as ReaderSettings["fontSize"] };
                  setSettings(nextSettings);
                  await saveReaderSettings(nextSettings);
                }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3">
              Show image prompts
              <input
                type="checkbox"
                checked={settings.showImagePrompts}
                onChange={async (event) => {
                  const nextSettings = { ...settings, showImagePrompts: event.currentTarget.checked };
                  setSettings(nextSettings);
                  await saveReaderSettings(nextSettings);
                }}
              />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3">
              Show scene metadata
              <input
                type="checkbox"
                checked={settings.showMetadata}
                onChange={async (event) => {
                  const nextSettings = { ...settings, showMetadata: event.currentTarget.checked };
                  setSettings(nextSettings);
                  await saveReaderSettings(nextSettings);
                }}
              />
            </label>
          </div>
        </header>

        {paragraphs.map((paragraph) => {
          const links = "interactiveLinks" in paragraph ? paragraph.interactiveLinks : parseJsonList((paragraph as { interactiveLinksJson?: string }).interactiveLinksJson ?? "[]");
          const key = paragraphKey(chapter.id, paragraph);
          const isCurrent = progress?.paragraphId === key;
          return (
            <section key={key} className={`reader-paragraph ${isCurrent ? "border-l-signal" : "border-l-white/15"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/35">Paragraph {paragraph.paragraphNumber}</p>
                <button className="border border-white/10 px-2 py-1 text-xs font-bold text-paper/60" onClick={() => markProgress(paragraph)}>
                  Mark
                </button>
              </div>
              {(paragraph.imageSlots ?? []).filter((slot) => slot.displayMode === "chapter-header" || slot.displayMode === "background").map((slot) => <ImageFrame key={slot.id} slot={slot} className="mt-4 min-h-64" />)}
              <p className={`mt-3 font-serif leading-8 text-paper/90 ${settings.fontSize === "small" ? "text-base" : settings.fontSize === "large" ? "text-xl" : "text-[1.12rem]"}`}>{paragraph.narrativeText || paragraph.body}</p>
              {(paragraph.dialogueCues ?? []).map((cue, index) => (
                <blockquote key={`${key}-cue-${index}`} className="mt-3 border-l-2 border-signal bg-black/20 p-3 font-serif text-sm leading-6 text-muted">
                  {cue}
                </blockquote>
              ))}
              {(paragraph.imageSlots ?? []).filter((slot) => slot.displayMode === "inline" || slot.displayMode === "gallery").map((slot) => <ImageFrame key={slot.id} slot={slot} className="mt-4 min-h-56" />)}
              {settings.showMetadata && (
                <div className="mt-4 grid gap-2 text-xs uppercase tracking-[0.12em] text-paper/45 sm:grid-cols-3">
                  {paragraph.scenePrompt && <span>Scene available</span>}
                  {paragraph.cameraDirection && <span>Camera: {paragraph.cameraDirection}</span>}
                  {paragraph.cinematicDirection && <span>Direction: {paragraph.cinematicDirection}</span>}
                  {paragraph.emotionalTone && <span>Tone: {paragraph.emotionalTone}</span>}
                  {paragraph.culturalDetail && <span>Culture: {paragraph.culturalDetail}</span>}
                  {paragraph.culturalContinuityNote && <span>Cultural continuity: {paragraph.culturalContinuityNote}</span>}
                </div>
              )}
              {settings.showImagePrompts && (paragraph.imagePrompt || paragraph.scenePrompt) && (
                <details className="mt-4 border border-white/10 bg-black/20 text-sm text-paper/65">
                  <summary className="min-h-11 cursor-pointer px-3 py-3 font-bold text-paper">Image and scene prompts</summary>
                  <div className="grid gap-3 border-t border-white/10 p-3">
                    {paragraph.imagePrompt && <p><span className="font-bold text-paper">Image:</span> {paragraph.imagePrompt}</p>}
                    {paragraph.scenePrompt && <p><span className="font-bold text-paper">Scene:</span> {paragraph.scenePrompt}</p>}
                    {paragraph.businessContinuityNote && <p><span className="font-bold text-paper">Continuity:</span> {paragraph.businessContinuityNote}</p>}
                    {paragraph.culturalContinuityNote && <p><span className="font-bold text-paper">Culture:</span> {paragraph.culturalContinuityNote}</p>}
                  </div>
                </details>
              )}
              {links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {links.map((link, index) => (
                    <button
                      key={`${key}-${index}`}
                      className="border border-signal px-2 py-1 text-xs font-bold text-signal"
                      type="button"
                      onClick={() => {
                        const target = universeLinkTarget(link);
                        logActivity("interactive_link_clicked", {
                          episodeId,
                          chapterId,
                          paragraphId: key,
                          targetType: "interactiveLink",
                          targetId: typeof link === "string" ? link : link.id ?? link.label ?? `link-${index}`,
                          metadata: { link },
                        }).catch(() => undefined);
                        setToast("+2 points / Link opened");
                        window.setTimeout(() => setToast(""), 2500);
                        if (target) navigate(target);
                      }}
                    >
                      {typeof link === "string" ? link : link.label ?? link.title ?? `Link ${index + 1}`}
                    </button>
                  ))}
                </div>
              )}
              {links.map((link, index) => {
                if (typeof link === "string" || !link.prompt || !Array.isArray(link.options)) return null;
                const options = link.options.map((option: unknown) => String(option));
                if (link.type === "poll") {
                  return <DramaPollCard key={`${key}-poll-${index}`} episodeId={episodeId} prompt={String(link.prompt)} options={options} onSaved={() => setToast("Poll saved locally")} />;
                }
                if (link.type === "prediction" || link.choiceType === "prediction") {
                  return <PredictionCard key={`${key}-prediction-${index}`} episodeId={episodeId} chapterId={chapterId} paragraphId={key} prompt={String(link.prompt)} options={options} onSaved={() => setToast("+10 points / Prediction saved")} />;
                }
                return null;
              })}
            </section>
          );
        })}

        {!nextChapter && (pack.content.episode.endingHook || pack.content.episode.nextEpisodeBridgeText) && (
          <section className="panel border-signal p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Episode ending</p>
            {pack.content.episode.endingHook && <h2 className="mt-2 text-xl font-black text-app">{pack.content.episode.endingHook}</h2>}
            {pack.content.episode.nextEpisodeBridgeText && <p className="mt-3 text-sm leading-6 text-muted">{pack.content.episode.nextEpisodeBridgeText}</p>}
          </section>
        )}

        {nextChapter && <ChapterBusinessSpotlight disabled={shouldAvoidChapterSpotlight} />}

        <nav className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
          {previousChapter ? <Link className="btn" to={`/reader/${episodeId}/chapter/${previousChapter.id}`}>Previous chapter</Link> : <span />}
          {nextChapter ? <Link className="btn btn-primary" to={`/reader/${episodeId}/chapter/${nextChapter.id}`}>Next chapter</Link> : <Link className="btn btn-primary" to={`/reader/${episodeId}`} onClick={completeEpisode}>Episode complete</Link>}
        </nav>
      </article>
    </section>
  );
}

function ImageFrame({ slot, className = "" }: { slot: ImageSlot; className?: string }) {
  const src = slot.firebaseStoragePath || slot.fallbackImagePath || "";
  return (
    <figure className={`surface-muted border-app overflow-hidden border ${className}`}>
      {src ? (
        <img
          className="h-full min-h-[inherit] w-full object-cover"
          src={src}
          alt={slot.altText || slot.characterName || "Episode illustration"}
          onError={(event) => {
            if (slot.fallbackImagePath && event.currentTarget.src !== slot.fallbackImagePath) event.currentTarget.src = slot.fallbackImagePath;
          }}
        />
      ) : (
        <div className="grid h-full place-items-center p-4 text-muted">Image pending</div>
      )}
      {(slot.characterName || slot.imagePrompt) && (
        <figcaption className="border-app border-t p-3 text-xs leading-5 text-muted">
          {slot.characterName && <span className="font-bold text-app">{slot.characterName}: </span>}
          {slot.imagePrompt}
        </figcaption>
      )}
    </figure>
  );
}
