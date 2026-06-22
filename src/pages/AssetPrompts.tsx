import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import {
  archiveAssetPrompt,
  aspectRatios,
  buildPromptTemplate,
  duplicateAssetPrompt,
  listAssetPrompts,
  promptInputFromForm,
  promptStyles,
  promptTypes,
  upsertAssetPrompt,
} from "../lib/assetRepository";
import type { EotAssetPrompt } from "../types";

export default function AssetPrompts() {
  const [prompts, setPrompts] = useState<EotAssetPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EotAssetPrompt | null>(null);
  const [promptType, setPromptType] = useState("character");
  const [copied, setCopied] = useState("");

  function refresh() {
    setLoading(true);
    listAssetPrompts().then(setPrompts).finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await upsertAssetPrompt(promptInputFromForm(form, editing?.id, editing?.assetId));
    setEditing(null);
    event.currentTarget.reset();
    refresh();
  }

  async function copyText(prompt: EotAssetPrompt) {
    await navigator.clipboard?.writeText(prompt.promptText);
    setCopied(prompt.id);
    setTimeout(() => setCopied(""), 1600);
  }

  const activePrompts = useMemo(() => prompts.filter((prompt) => prompt.status !== "archived"), [prompts]);
  const archivedPrompts = useMemo(() => prompts.filter((prompt) => prompt.status === "archived"), [prompts]);

  if (loading) return <LoadingState label="Loading prompt library..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Asset Prompts"
        title="Prompt library"
        subtitle="Save AI image, video, animation, poster, trailer, business, property, and vehicle prompt text without calling an AI API."
        actions={[{ label: "Upload", to: "/studio/assets/upload", primary: true }, { label: "Library", to: "/studio/assets/library" }]}
      />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form className="panel grid gap-3 p-4" onSubmit={submit}>
          <h2 className="text-xl font-black">{editing ? "Edit prompt" : "Save prompt"}</h2>
          <label className="grid gap-1 text-sm font-bold">
            Prompt type
            <select className="field" name="promptType" value={editing?.promptType ?? promptType} onChange={(event) => setPromptType(event.target.value)}>
              {promptTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Title
            <input className="field" name="title" defaultValue={editing?.title} required placeholder="Mandla portrait prompt" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Linked asset ID
            <input className="field" name="assetId" defaultValue={editing?.assetId} placeholder="Optional" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold">
              Style
              <select className="field" name="style" defaultValue={editing?.style || "cinematic"}>
                {promptStyles.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Aspect ratio
              <select className="field" name="aspectRatio" defaultValue={editing?.aspectRatio || "16:9"}>
                {aspectRatios.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-bold">
            Prompt text
            <textarea className="field min-h-56 font-mono text-sm" name="promptText" defaultValue={editing?.promptText || buildPromptTemplate(promptType)} required />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Negative prompt
            <textarea className="field min-h-20" name="negativePrompt" defaultValue={editing?.negativePrompt} placeholder="Optional exclusions" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Notes
            <textarea className="field min-h-20" name="notes" defaultValue={editing?.notes} placeholder="Usage notes or generator settings" />
          </label>
          <input type="hidden" name="status" value={editing?.status || "draft"} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary">{editing ? "Update prompt" : "Save prompt"}</button>
            {editing && <button className="btn" type="button" onClick={() => setEditing(null)}>Cancel edit</button>}
          </div>
        </form>
        <div className="grid gap-4">
          <PromptList title="Active prompts" rows={activePrompts} copied={copied} onCopy={copyText} onEdit={setEditing} onDuplicate={async (prompt) => { await duplicateAssetPrompt(prompt); refresh(); }} onArchive={async (prompt) => { await archiveAssetPrompt(prompt); refresh(); }} />
          <PromptList title="Archived prompts" rows={archivedPrompts} copied={copied} onCopy={copyText} onEdit={setEditing} onDuplicate={async (prompt) => { await duplicateAssetPrompt(prompt); refresh(); }} />
        </div>
      </div>
    </section>
  );
}

function PromptList({
  title,
  rows,
  copied,
  onCopy,
  onEdit,
  onDuplicate,
  onArchive,
}: {
  title: string;
  rows: EotAssetPrompt[];
  copied: string;
  onCopy: (prompt: EotAssetPrompt) => void;
  onEdit: (prompt: EotAssetPrompt) => void;
  onDuplicate: (prompt: EotAssetPrompt) => void;
  onArchive?: (prompt: EotAssetPrompt) => void;
}) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 grid gap-3">
        {rows.map((prompt) => (
          <article key={prompt.id} className="border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-signal">{prompt.promptType} / {prompt.style} / {prompt.aspectRatio}</p>
            <h3 className="mt-1 font-black">{prompt.title}</h3>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted">{prompt.promptText}</pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn" type="button" onClick={() => onCopy(prompt)}>{copied === prompt.id ? "Copied" : "Copy"}</button>
              <button className="btn" type="button" onClick={() => onEdit(prompt)}>Edit</button>
              <button className="btn" type="button" onClick={() => onDuplicate(prompt)}>Duplicate</button>
              {onArchive && <button className="btn" type="button" onClick={() => onArchive(prompt)}>Archive</button>}
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">No prompts in this section.</p>}
      </div>
    </section>
  );
}
