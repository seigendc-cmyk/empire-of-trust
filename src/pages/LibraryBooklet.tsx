import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LibraryWhatsappButton } from "../components/LibraryWhatsappButton";
import { OfflineStatusBadge } from "../components/OfflineStatusBadge";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { canOpenPack } from "../lib/licenceRepository";
import { deleteImportedLibraryPack, getImportedLibraryPack, getLibraryReadingProgress } from "../lib/libraryRepository";
import { logActivity, type LibraryReadingProgress } from "../lib/offlineDb";
import type { LibraryBookletPack } from "../types";

export default function LibraryBooklet() {
  const { bookletId } = useParams();
  const navigate = useNavigate();
  const [pack, setPack] = useState<LibraryBookletPack | null>(null);
  const [progress, setProgress] = useState<LibraryReadingProgress | null>(null);
  const [licenceCheck, setLicenceCheck] = useState<{ allowed: boolean; reason: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!bookletId) return;
    Promise.all([getImportedLibraryPack(bookletId), getLibraryReadingProgress(bookletId)])
      .then(async ([data, savedProgress]) => {
        setPack(data ?? null);
        setProgress(savedProgress ?? null);
        if (data) {
          const check = await canOpenPack(data.manifest.requiredLicencePlan || "free");
          setLicenceCheck({ allowed: check.allowed, reason: check.reason });
          if (check.allowed) logActivity("booklet_opened", { targetType: "libraryBooklet", targetId: bookletId, metadata: { title: data.manifest.title } }).catch(() => undefined);
        }
      })
      .finally(() => setLoading(false));
  }, [bookletId]);

  const chapters = useMemo(() => pack?.content.booklet.chapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber) ?? [], [pack]);
  const continueTarget = useMemo(() => {
    const chapter = chapters.find((item) => item.id === progress?.chapterId) ?? chapters[0];
    const section = chapter?.sections.find((item) => item.id === progress?.sectionId) ?? chapter?.sections[0];
    return chapter && section ? `/library/${bookletId}/chapter/${chapter.id}/section/${section.id}` : "";
  }, [bookletId, chapters, progress]);

  if (loading) return <LoadingState label="Loading offline booklet..." />;
  if (!pack || !bookletId) return <ErrorState title="Booklet not found offline" message="Import the independent library booklet pack to store it on this device." />;
  if (licenceCheck && !licenceCheck.allowed) {
    return (
      <section className="page grid gap-4">
        <PageHeader eyebrow="Independent Library" title="Licence required" subtitle={licenceCheck.reason} actions={[{ label: "Activate", to: "/licence/activate", primary: true }, { label: "Status", to: "/licence/status" }]} />
      </section>
    );
  }

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={pack.manifest.bookletCode}
        title={pack.manifest.title}
        subtitle={pack.content.booklet.description}
        actions={[
          ...(continueTarget ? [{ label: progress ? "Continue" : "Start", to: continueTarget, primary: true }] : []),
          { label: "Import", to: "/library/import" },
          { label: "Progress", to: `/library/${bookletId}/progress` },
        ]}
      />
      <section className="panel grid gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <OfflineStatusBadge />
          <span className="status-badge border-signal text-signal">Independent Library</span>
          <span className="status-badge border-app text-muted">Not part of EOT story</span>
          <span className="status-badge border-ledger text-ledger">Available Offline</span>
        </div>
        <p className="text-muted text-sm leading-6">{pack.content.booklet.author} / {pack.manifest.category} / version {pack.manifest.version}</p>
        <p className="text-muted text-sm leading-6">
          {pack.content.quizzes?.length ?? 0} quizzes / {pack.content.whatsappPrompts?.length ?? 0} WhatsApp prompts / estimated {pack.content.readingSettings?.estimatedMinutes ?? "n/a"} minutes
        </p>
        {progress && <p className="text-muted border-l-2 border-signal pl-3 text-sm leading-6">Saved {new Date(progress.updatedAt).toLocaleString()}.</p>}
      </section>
      <section className="panel divide-y divide-white/10">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Chapter {chapter.chapterNumber}</p>
            <h2 className="mt-1 text-xl font-black">{chapter.title}</h2>
            <p className="text-muted mt-2 text-sm leading-6">{chapter.intro}</p>
            <div className="mt-3 grid gap-2">
              <Link className="border border-signal bg-signal/10 p-3 font-bold text-signal hover:bg-signal/20" to={`/library/${bookletId}/chapter/${chapter.id}`}>
                Open chapter
              </Link>
              {chapter.sections.map((section) => (
                <Link key={section.id} className="surface-muted border-app border p-3 hover:border-signal" to={`/library/${bookletId}/chapter/${chapter.id}/section/${section.id}`}>
                  <span className="text-soft text-xs font-bold uppercase tracking-[0.14em]">Section {section.sectionNumber}</span>
                  <span className="text-app ml-2 font-bold">{section.heading || "Untitled section"}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
      {Boolean(pack.content.quizzes?.length || pack.content.whatsappPrompts?.length) && (
        <section className="panel grid gap-3 p-4">
          <h2 className="text-app text-xl font-black">Participation</h2>
          {pack.content.quizzes?.map((quiz) => (
            <Link key={quiz.id} className="surface-muted border-app block border p-3 hover:bg-white/5" to={`/library/${bookletId}/quiz/${quiz.id}`}>
              <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{quiz.scope} quiz</p>
              <h3 className="text-app mt-1 font-black">{quiz.title}</h3>
              <p className="text-muted mt-1 text-sm">{quiz.questions.length} questions / pass score {quiz.passScore}% / opens offline</p>
            </Link>
          ))}
          {pack.content.whatsappPrompts?.map((prompt) => (
            <LibraryWhatsappButton
              key={prompt.id}
              pack={pack}
              prompt={prompt}
              bookletId={bookletId}
            />
          ))}
        </section>
      )}
      <button
        className="btn border-ember bg-ember/20 text-ember hover:bg-ember hover:text-paper"
        disabled={deleting}
        onClick={async () => {
          if (!window.confirm("Delete this imported booklet from this device?")) return;
          setDeleting(true);
          await deleteImportedLibraryPack(bookletId);
          navigate("/library");
        }}
      >
        {deleting ? "Deleting..." : "Delete imported booklet"}
      </button>
    </section>
  );
}
