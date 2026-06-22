import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { activateWithCode, activateWithScratchCard } from "../lib/licenceRepository";
import type { LocalLicence } from "../types";

export default function LicenceActivate() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [scratchCardCode, setScratchCardCode] = useState("");
  const [mode, setMode] = useState<"code" | "scratch">("code");
  const [licence, setLicence] = useState<LocalLicence | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage("");
    setLicence(null);
    try {
      const result = mode === "code" ? await activateWithCode(phoneNumber, activationCode) : await activateWithScratchCard(phoneNumber, scratchCardCode);
      setLicence(result);
      setMessage("Licence activated and stored locally.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Activation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Licence" title="Activate access" subtitle="Use an activation code or scratch card to create a local offline licence." actions={[{ label: "Status", to: "/licence/status" }]} />
      <section className="panel grid gap-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button className={`btn ${mode === "code" ? "btn-primary" : ""}`} onClick={() => setMode("code")} type="button">Activation code</button>
          <button className={`btn ${mode === "scratch" ? "btn-primary" : ""}`} onClick={() => setMode("scratch")} type="button">Scratch card</button>
        </div>
        <label>
          <span className="label">Phone number</span>
          <input className="field" inputMode="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.currentTarget.value)} placeholder="+27..." />
        </label>
        {mode === "code" ? (
          <label>
            <span className="label">Activation code</span>
            <input className="field uppercase" value={activationCode} onChange={(event) => setActivationCode(event.currentTarget.value)} placeholder="EOT-XXXX" />
          </label>
        ) : (
          <label>
            <span className="label">Scratch card code</span>
            <input className="field uppercase" value={scratchCardCode} onChange={(event) => setScratchCardCode(event.currentTarget.value)} placeholder="SCR-XXXX" />
          </label>
        )}
        <button className="btn btn-primary min-h-12" disabled={busy || !phoneNumber || (mode === "code" ? !activationCode : !scratchCardCode)} onClick={submit} type="button">
          {busy ? "Activating..." : "Activate"}
        </button>
        {message && <p className={`border p-3 text-sm font-bold ${licence ? "border-signal bg-signal/10 text-signal" : "border-ember bg-ember/10 text-ember"}`}>{message}</p>}
      </section>
      {licence && (
        <section className="panel p-4">
          <h2 className="text-xl font-black">Local licence</h2>
          <div className="mt-3 grid gap-2 text-sm text-paper/65">
            <p><span className="font-bold text-paper">Licence:</span> {licence.licenceId}</p>
            <p><span className="font-bold text-paper">Plan:</span> {licence.plan}</p>
            <p><span className="font-bold text-paper">Expires:</span> {licence.expiresAt}</p>
            <p><span className="font-bold text-paper">Features:</span> {licence.features.join(", ")}</p>
          </div>
        </section>
      )}
    </section>
  );
}
