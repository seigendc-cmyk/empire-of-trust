import { useState } from "react";
import { getOrCreateReaderIdentity, logActivity, saveLibraryWhatsappLog } from "../lib/offlineDb";
import type { LibraryBookletPack, LibraryWhatsappPrompt } from "../types";

interface Props {
  pack: LibraryBookletPack;
  prompt: LibraryWhatsappPrompt;
  bookletId: string;
  chapterId?: string;
  chapterTitle?: string;
  sectionId?: string;
  sectionTitle?: string;
  selectedAnswers?: string;
}

export function LibraryWhatsappButton({ pack, prompt, bookletId, chapterId, chapterTitle = "", sectionId, sectionTitle = "", selectedAnswers = "" }: Props) {
  const [customText, setCustomText] = useState("");
  const [sending, setSending] = useState(false);
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  async function openWhatsApp() {
    if (!online || sending) return;
    setSending(true);
    try {
      const reader = await getOrCreateReaderIdentity();
      const message = fillTemplate(prompt.responseTemplate || prompt.prompt, {
        pack,
        readerId: reader.readerId,
        chapterTitle,
        sectionTitle,
        customText,
        selectedAnswers,
      });
      await saveLibraryWhatsappLog({
        bookletId,
        chapterId,
        sectionId,
        promptId: prompt.id,
        whatsappNumber: prompt.whatsappNumber ?? "",
        message,
      });
      await logActivity("whatsapp_clicked", {
        targetType: "libraryWhatsAppCta",
        targetId: prompt.id,
        metadata: { bookletId, chapterId, sectionId, ctaType: prompt.ctaType, buttonLabel: prompt.buttonLabel ?? prompt.prompt },
      }, reader);
      window.open(whatsappHref(prompt.whatsappNumber ?? "", message), "_blank", "noopener,noreferrer");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="surface-muted border-app grid gap-3 border p-3">
      <div>
        <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{prompt.ctaType?.replace(/_/g, " ") || "WhatsApp"}</p>
        <h3 className="text-app mt-1 font-black">{prompt.buttonLabel || prompt.prompt}</h3>
        <p className="text-muted mt-1 text-sm">{online ? "Opens WhatsApp with a pre-filled message and logs locally for sync." : "Requires internet to open WhatsApp."}</p>
      </div>
      <label>
        <span className="label">Optional message</span>
        <textarea className="field min-h-20" value={customText} onChange={(event) => setCustomText(event.currentTarget.value)} placeholder="Add your response before opening WhatsApp" />
      </label>
      <button className="btn btn-primary" type="button" disabled={!online || sending} onClick={() => void openWhatsApp()}>
        {online ? sending ? "Opening..." : prompt.buttonLabel || "Open WhatsApp" : "Requires internet"}
      </button>
    </div>
  );
}

function whatsappHref(number: string, message: string) {
  const cleaned = number.replace(/[^\d]/g, "");
  return cleaned ? `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function fillTemplate(template: string, input: { pack: LibraryBookletPack; readerId: string; chapterTitle: string; sectionTitle: string; customText: string; selectedAnswers: string }) {
  return template
    .replaceAll("{{title}}", input.pack.manifest.title)
    .replaceAll("{{bookletCode}}", input.pack.manifest.bookletCode)
    .replaceAll("{{readerId}}", input.readerId)
    .replaceAll("{{chapter}}", input.chapterTitle)
    .replaceAll("{{section}}", input.sectionTitle)
    .replaceAll("{{customText}}", input.customText)
    .replaceAll("{{selectedAnswers}}", input.selectedAnswers);
}
