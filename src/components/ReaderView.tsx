import { parseJsonList } from "../lib/packs";
import type { EpisodePack } from "../types";

export function ReaderView({ pack }: { pack: EpisodePack }) {
  const episode = pack.content.episode;

  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-signal/50 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-signal">{pack.manifest.episodeIdentifier}</p>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-paper sm:text-4xl">{episode.title}</h1>
        <p className="mt-4 text-base leading-7 text-paper/70">{episode.synopsis}</p>
        <div className="mt-5 grid gap-2 text-xs uppercase tracking-[0.12em] text-paper/45 sm:grid-cols-2">
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
      </header>
      <div className="grid gap-10 py-6 sm:py-8">
        {episode.chapters.map((chapter) => (
          <section key={chapter.id} className="grid gap-5" aria-label={`Chapter ${chapter.chapterNumber}: ${chapter.title}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Chapter {chapter.chapterNumber}</p>
              <h2 className="mt-2 text-2xl font-black">{chapter.title}</h2>
              {chapter.intro && <p className="mt-3 text-sm leading-6 text-paper/65">{chapter.intro}</p>}
            </div>
            {chapter.paragraphs.map((paragraph) => {
              const links = "interactiveLinks" in paragraph ? paragraph.interactiveLinks : parseJsonList((paragraph as { interactiveLinksJson?: string }).interactiveLinksJson ?? "[]");
              return (
                <section key={paragraph.id} className="border-l-2 border-white/15 pl-4" aria-label={`Paragraph ${paragraph.paragraphNumber}`}>
                  <p className="font-serif text-[1.08rem] leading-8 text-paper/90 sm:text-lg">{paragraph.body}</p>
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
    </article>
  );
}
