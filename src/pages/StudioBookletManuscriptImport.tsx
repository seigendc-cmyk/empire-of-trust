import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import {
  getBooklet,
  parseBookletManuscript,
  replaceBookletManuscriptStructure,
  type ParsedBookletChapter,
} from "../lib/bookletFoundationRepository";
import type { EotBooklet } from "../types";

const sample = `Chapter One: Getting Started
This chapter introduces the booklet.

WHY THIS MATTERS
Paste manuscript content here. Uppercase headings become sections.

Chapter 2: Next Steps
Section 1: Practical Action
Add more content under each heading.`;

export default function StudioBookletManuscriptImport() {
  const { bookletId } = useParams();
  const navigate = useNavigate();
  const [booklet, setBooklet] = useState<EotBooklet | null>(null);
  const [manuscript, setManuscript] = useState("");
  const [parsed, setParsed] = useState<ParsedBookletChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookletId) return;
    getBooklet(bookletId).then(setBooklet).finally(() => setLoading(false));
  }, [bookletId]);

  const counts = useMemo(() => ({
    chapters: parsed.length,
    sections: parsed.reduce((total, chapter) => total + chapter.sections.length, 0),
  }), [parsed]);

  function parse() {
    setError("");
    const next = parseBookletManuscript(manuscript);
    if (!next.length) {
      setError("No chapters detected. Add headings such as Chapter 1, CHAPTER 1, or Chapter One.");
      return;
    }
    setParsed(next);
    setMessage(`Detected ${next.length} chapters and ${next.reduce((total, chapter) => total + chapter.sections.length, 0)} sections.`);
  }

  function updateChapter(chapterIndex: number, patch: Partial<ParsedBookletChapter>) {
    setParsed((current) => current.map((chapter, index) => index === chapterIndex ? { ...chapter, ...patch } : chapter));
  }

  function updateSection(chapterIndex: number, sectionIndex: number, patch: Partial<ParsedBookletChapter["sections"][number]>) {
    setParsed((current) => current.map((chapter, index) => {
      if (index !== chapterIndex) return chapter;
      return {
        ...chapter,
        sections: chapter.sections.map((section, innerIndex) => innerIndex === sectionIndex ? { ...section, ...patch } : section),
      };
    }));
  }

  async function save() {
    if (!bookletId || !parsed.length) return;
    setSaving(true);
    setError("");
    try {
      const result = await replaceBookletManuscriptStructure(bookletId, parsed);
      setMessage(`Saved ${result.chapters} chapters and ${result.sections} sections to Firestore.`);
      window.setTimeout(() => navigate(`/studio/booklets/${bookletId}`), 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save parsed manuscript.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading manuscript importer..." />;
  if (!booklet || !bookletId) return <ErrorState title="Booklet not found" message="Create the booklet foundation record first, then import a manuscript." />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={booklet.bookletCode}
        title="Import ChatGPT manuscript"
        subtitle="Paste a full manuscript, preview the detected chapters and sections, correct them, then save to the booklet foundation."
        actions={[{ label: "Booklet", to: `/studio/booklets/${bookletId}` }, { label: "Edit", to: `/studio/booklets/${bookletId}/edit` }]}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <section className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="panel grid gap-3 p-4">
          <label>
            <span className="label">Manuscript</span>
            <textarea
              className="field min-h-[55vh] font-mono text-sm leading-6"
              value={manuscript}
              onChange={(event) => setManuscript(event.currentTarget.value)}
              placeholder={sample}
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            <button className="btn btn-primary" type="button" disabled={!manuscript.trim()} onClick={parse}>Preview Import</button>
            <button className="btn" type="button" onClick={() => setManuscript(sample)}>Use Sample</button>
            <button className="btn" type="button" onClick={() => { setManuscript(""); setParsed([]); }}>Clear</button>
          </div>
        </div>
        <aside className="panel grid content-start gap-3 p-4">
          <h2 className="text-app text-xl font-black">Detection</h2>
          <Info label="Chapters" value={String(counts.chapters)} />
          <Info label="Sections" value={String(counts.sections)} />
          <p className="text-muted text-sm leading-6">Supported chapter formats include Chapter 1, CHAPTER 1, Chapter One, Chapter Two, Part 1, and markdown chapter headings.</p>
        </aside>
      </section>

      {parsed.length > 0 && (
        <section className="panel divide-y divide-white/10">
          <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 className="text-app text-xl font-black">Correct parsed structure</h2>
              <p className="text-muted mt-1 text-sm leading-6">Edit headings and content before saving. Saving replaces existing generated chapters and sections for this booklet.</p>
            </div>
            <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save Parsed Structure"}</button>
          </div>
          {parsed.map((chapter, chapterIndex) => (
            <details key={chapterIndex} className="p-4" open>
              <summary className="text-app cursor-pointer text-lg font-black">Chapter {chapterIndex + 1}: {chapter.title}</summary>
              <div className="mt-4 grid gap-3 md:grid-cols-[8rem_1fr]">
                <label><span className="label">Number</span><input className="field" type="number" value={chapter.chapterNumber} onChange={(event) => updateChapter(chapterIndex, { chapterNumber: Number(event.currentTarget.value) || chapterIndex + 1 })} /></label>
                <label><span className="label">Title</span><input className="field" value={chapter.title} onChange={(event) => updateChapter(chapterIndex, { title: event.currentTarget.value })} /></label>
                <label className="md:col-span-2"><span className="label">Summary</span><textarea className="field min-h-20" value={chapter.summary} onChange={(event) => updateChapter(chapterIndex, { summary: event.currentTarget.value })} /></label>
              </div>
              <div className="mt-4 grid gap-3">
                {chapter.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="surface-muted border-app grid gap-3 border p-3 md:grid-cols-[8rem_1fr]">
                    <label><span className="label">Section</span><input className="field" type="number" value={section.sectionNumber} onChange={(event) => updateSection(chapterIndex, sectionIndex, { sectionNumber: Number(event.currentTarget.value) || sectionIndex + 1 })} /></label>
                    <label><span className="label">Heading</span><input className="field" value={section.heading} onChange={(event) => updateSection(chapterIndex, sectionIndex, { heading: event.currentTarget.value })} /></label>
                    <label className="md:col-span-2"><span className="label">Content</span><textarea className="field min-h-32" value={section.content} onChange={(event) => updateSection(chapterIndex, sectionIndex, { content: event.currentTarget.value })} /></label>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-muted border-app border p-3">
      <dt className="text-soft text-xs font-bold uppercase tracking-[0.12em]">{label}</dt>
      <dd className="text-app mt-1 text-2xl font-black">{value}</dd>
    </div>
  );
}
