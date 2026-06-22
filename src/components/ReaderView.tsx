import { parseJsonList } from "../lib/packs";
import type { EpisodePack, ImageSlot } from "../types";

export function ReaderView({ pack }: { pack: EpisodePack }) {
  const episode = pack.content.episode;
  const hero = episode.imageSlots?.find((slot) => slot.displayMode === "hero") ?? episode.chapters.flatMap((chapter) => chapter.paragraphs.flatMap((paragraph) => paragraph.imageSlots ?? [])).find((slot) => slot.displayMode === "hero" || slot.displayMode === "chapter-header");

  return (
    <article className="mx-auto max-w-5xl">
      <header className="surface border-app overflow-hidden border">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid min-h-[24rem] content-end bg-black p-5 text-paper sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-signal">Season {episode.seasonNumber} / Episode {episode.episodeNumber}</p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-5xl">{episode.title}</h1>
            {episode.introTitle && <p className="mt-4 text-lg font-black text-signal">{episode.introTitle}</p>}
            <p className="mt-4 max-w-3xl text-base leading-7 text-paper/75">{episode.introNarrative || episode.synopsis}</p>
          </div>
          <ImageFrame slot={hero} className="min-h-[18rem] lg:min-h-full" />
        </div>
      </header>
      <section className="panel mt-4 grid gap-3 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Continuity bridge</p>
        <h2 className="text-xl font-black">{episode.mainConflict || "Main conflict pending"}</h2>
        <p className="text-muted text-sm leading-6">{episode.previousEpisodeBridge || episode.continuityPrep?.previousEpisodeConnection || "No previous connection recorded."}</p>
        <div className="flex flex-wrap gap-2">
          {(episode.continuityPrep?.activeCharacters ?? []).map((name) => <span key={name} className="status-badge border-signal text-signal">{name}</span>)}
        </div>
      </section>
      <nav className="sticky top-0 z-10 my-4 overflow-x-auto border-y border-white/10 bg-[var(--bg)] py-2">
        <div className="flex gap-2">
          {episode.chapters.map((chapter) => <a key={chapter.id} className="btn min-w-fit" href={`#chapter-${chapter.id}`}>{chapter.chapterNumber}. {chapter.title}</a>)}
        </div>
      </nav>
      <section className="border-b border-signal/50 pb-6">
        <div className="mt-5 grid gap-2 text-xs uppercase tracking-[0.12em] text-muted sm:grid-cols-2">
          {episode.storyDate && <span>Story date: {episode.storyDate}</span>}
          {episode.requiredLicencePlan && <span>Plan: {episode.requiredLicencePlan}</span>}
          {episode.previousEpisodeId && <span>Previous: {episode.previousEpisodeId}</span>}
          {episode.nextEpisodeId && <span>Next: {episode.nextEpisodeId}</span>}
        </div>
        {(episode.activeCharacters || episode.businessContinuityNotes || episode.culturalContinuityNotes) && (
          <details className="mt-5 border border-white/10 bg-black/20 text-sm text-paper/65">
            <summary className="min-h-11 cursor-pointer px-3 py-3 font-bold text-paper">Episode continuity</summary>
            <div className="grid gap-3 border-t border-white/10 p-3">
              {episode.activeCharacters && <p><span className="font-bold text-paper">Characters:</span> {episode.activeCharacters}</p>}
              {episode.businessContinuityNotes && <p><span className="font-bold text-paper">Business:</span> {episode.businessContinuityNotes}</p>}
              {episode.culturalContinuityNotes && <p><span className="font-bold text-paper">Cultural:</span> {episode.culturalContinuityNotes}</p>}
            </div>
          </details>
        )}
      </section>
      <div className="grid gap-10 py-6 sm:py-8">
        {episode.chapters.map((chapter) => (
          <section id={`chapter-${chapter.id}`} key={chapter.id} className="scroll-mt-20 grid gap-5" aria-label={`Chapter ${chapter.chapterNumber}: ${chapter.title}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Chapter {chapter.chapterNumber}</p>
              <h2 className="mt-2 text-2xl font-black">{chapter.title}</h2>
              {chapter.intro && <p className="mt-3 text-sm leading-6 text-paper/65">{chapter.intro}</p>}
              {chapter.previousSceneReview && <p className="mt-3 border-l-2 border-signal pl-3 text-sm leading-6 text-muted">{chapter.previousSceneReview}</p>}
            </div>
            {chapter.paragraphs.map((paragraph) => {
              const links = "interactiveLinks" in paragraph ? paragraph.interactiveLinks : parseJsonList((paragraph as { interactiveLinksJson?: string }).interactiveLinksJson ?? "[]");
              return (
                <section key={paragraph.id} className="border-l-2 border-white/15 pl-4" aria-label={`Paragraph ${paragraph.paragraphNumber}`}>
                  {(paragraph.imageSlots ?? []).filter((slot) => slot.displayMode === "chapter-header" || slot.displayMode === "background").map((slot) => <ImageFrame key={slot.id} slot={slot} className="mb-4 min-h-64" />)}
                  <p className="font-serif text-[1.08rem] leading-8 text-app sm:text-lg">{paragraph.narrativeText || paragraph.body}</p>
                  {(paragraph.dialogueCues?.length ? paragraph.dialogueCues : []).map((cue, index) => <blockquote key={`${paragraph.id}-cue-${index}`} className="mt-3 border-l-2 border-signal bg-black/20 p-3 font-serif text-sm leading-6 text-muted">{cue}</blockquote>)}
                  {(paragraph.imageSlots ?? []).filter((slot) => slot.displayMode === "inline" || slot.displayMode === "gallery").map((slot) => <ImageFrame key={slot.id} slot={slot} className="mt-4 min-h-56" />)}
                  {(paragraph.imagePrompt || paragraph.scenePrompt) && (
                    <details className="mt-4 border border-white/10 bg-black/20 text-sm text-paper/65">
                      <summary className="min-h-11 cursor-pointer px-3 py-3 font-bold text-paper">Image and scene prompts</summary>
                      <div className="border-t border-white/10 p-3">
                        {paragraph.imagePrompt && <p><span className="font-bold text-paper">Image:</span> {paragraph.imagePrompt}</p>}
                        {paragraph.scenePrompt && <p className="mt-2"><span className="font-bold text-paper">Scene:</span> {paragraph.scenePrompt}</p>}
                      </div>
                    </details>
                  )}
                  {links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {links.map((link, index) => (
                        <span key={`${paragraph.id}-${index}`} className="border border-signal px-2 py-1 text-xs font-bold text-signal">
                          {typeof link === "string" ? link : link.label ?? link.title ?? `Link ${index + 1}`}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </section>
        ))}
      </div>
      {(episode.endingHook || episode.nextEpisodeBridgeText) && (
        <footer className="panel border-signal p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Episode ending</p>
          {episode.endingHook && <h2 className="text-app mt-2 text-2xl font-black">{episode.endingHook}</h2>}
          {episode.nextEpisodeBridgeText && <p className="text-muted mt-3 text-sm leading-6">{episode.nextEpisodeBridgeText}</p>}
        </footer>
      )}
    </article>
  );
}

function ImageFrame({ slot, className = "" }: { slot?: ImageSlot; className?: string }) {
  if (!slot) return <div className={`surface-muted border-app grid place-items-center border p-4 text-muted ${className}`}>Image pending</div>;
  const src = slot.firebaseStoragePath || slot.fallbackImagePath || "";
  return (
    <figure className={`surface-muted border-app overflow-hidden border ${className}`}>
      {src ? <img className="h-full min-h-[inherit] w-full object-cover" src={src} alt={slot.altText} onError={(event) => { if (slot.fallbackImagePath) event.currentTarget.src = slot.fallbackImagePath; }} /> : <div className="grid h-full place-items-center p-4 text-muted">Image pending</div>}
      {(slot.imagePrompt || slot.characterName) && <figcaption className="border-app border-t p-3 text-xs leading-5 text-muted">{slot.characterName && <span className="font-bold text-app">{slot.characterName}: </span>}{slot.imagePrompt}</figcaption>}
    </figure>
  );
}
