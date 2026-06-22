import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import {
  deleteBookletEngagement,
  getBooklet,
  listBookletEngagement,
  saveBookletEngagement,
} from "../lib/bookletFoundationRepository";
import type { EotBooklet, EotBookletEngagement, EotBookletEngagementType } from "../types";
import { useParams } from "react-router-dom";

const ctaOptions: Array<{ value: EotBookletEngagementType; label: string; template: string }> = [
  { value: "feedback", label: "Send Feedback", template: "Hello, I read {{title}} and my feedback is..." },
  { value: "submit_answers", label: "Submit Answers", template: "Hello, I completed {{title}}. My answers are..." },
  { value: "ask_question", label: "Ask Questions", template: "Hello, I have a question about {{title}}..." },
  { value: "join_community", label: "Join Community", template: "Hello, I read {{title}} and would like to join the community." },
  { value: "request_help", label: "Request Help", template: "Hello, I need help with {{title}}..." },
];

export default function StudioBookletEngagementBuilder() {
  const { bookletId } = useParams();
  const [booklet, setBooklet] = useState<EotBooklet | null>(null);
  const [rows, setRows] = useState<EotBookletEngagement[]>([]);
  const [ctaType, setCtaType] = useState<EotBookletEngagementType>("feedback");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!bookletId) return;
    setLoading(true);
    const [bookletRecord, engagementRows] = await Promise.all([getBooklet(bookletId), listBookletEngagement(bookletId)]);
    setBooklet(bookletRecord);
    setRows(engagementRows);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load engagement builder.");
      setLoading(false);
    });
  }, [bookletId]);

  if (loading) return <LoadingState label="Loading engagement builder..." />;
  if (!booklet || !bookletId) return <ErrorState title="Booklet not found" message="Open engagement builder from a saved booklet." />;

  const defaultTemplate = ctaOptions.find((option) => option.value === ctaType)?.template ?? "";

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={booklet.bookletCode}
        title="WhatsApp Engagement Builder"
        subtitle="Create reader CTA buttons that open WhatsApp with a pre-filled booklet response."
        actions={[
          { label: "Booklet", to: `/studio/booklets/${booklet.id}` },
          { label: "Quizzes", to: `/studio/booklets/${booklet.id}/quizzes` },
          { label: "Build Pack", to: `/studio/booklets/${booklet.id}/build-pack`, primary: true },
        ]}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <form className="panel grid gap-3 p-4 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setSaving(true);
        setError("");
        try {
          await saveBookletEngagement({
            bookletId,
            ctaType,
            purpose: ctaType,
            buttonLabel: String(formData.get("buttonLabel") ?? "").trim(),
            whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim(),
            messageTemplate: String(formData.get("messageTemplate") ?? "").trim(),
          });
          event.currentTarget.reset();
          setCtaType("feedback");
          setMessage("WhatsApp CTA saved.");
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save WhatsApp CTA.");
        } finally {
          setSaving(false);
        }
      }}>
        <h2 className="text-app md:col-span-2 text-xl font-black">Create CTA button</h2>
        <label><span className="label">CTA type</span><select className="field" value={ctaType} onChange={(event) => setCtaType(event.currentTarget.value as EotBookletEngagementType)}>{ctaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span className="label">Button label</span><input className="field" name="buttonLabel" required defaultValue={ctaOptions.find((option) => option.value === ctaType)?.label} /></label>
        <label className="md:col-span-2"><span className="label">WhatsApp number</span><input className="field" name="whatsappNumber" required placeholder="+27710000000" /></label>
        <label className="md:col-span-2"><span className="label">Message template</span><textarea className="field min-h-32" name="messageTemplate" required defaultValue={defaultTemplate} key={ctaType} /></label>
        <p className="text-muted md:col-span-2 text-sm leading-6">Template tokens: {"{{title}}"}, {"{{bookletCode}}"}, {"{{readerId}}"}. The Reader fills these before opening WhatsApp.</p>
        <button className="btn btn-primary md:col-span-2" type="submit" disabled={saving}>{saving ? "Saving..." : "Save CTA"}</button>
      </form>

      <section className="panel divide-y divide-white/10">
        <div className="p-4">
          <h2 className="text-app text-xl font-black">Saved WhatsApp CTAs</h2>
          <p className="text-muted mt-2 text-sm leading-6">{rows.length} engagement buttons configured for this booklet.</p>
        </div>
        {rows.length === 0 && <div className="p-4"><EmptyState title="No WhatsApp CTAs yet" message="Create reader actions for feedback, answers, questions, and community joining." /></div>}
        {rows.map((item) => (
          <article key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{item.ctaType.replace(/_/g, " ")}</p>
              <h3 className="text-app mt-1 text-lg font-black">{item.buttonLabel}</h3>
              <p className="text-muted mt-1 break-all text-sm">{item.whatsappNumber}</p>
              <p className="text-soft mt-1 line-clamp-2 text-sm">{item.messageTemplate}</p>
            </div>
            <button className="btn border-ember bg-ember/10 text-ember" type="button" onClick={async () => {
              if (!window.confirm("Delete this WhatsApp CTA?")) return;
              await deleteBookletEngagement(item.id);
              setMessage("WhatsApp CTA deleted.");
              await load();
            }}>Delete</button>
          </article>
        ))}
      </section>
    </section>
  );
}
