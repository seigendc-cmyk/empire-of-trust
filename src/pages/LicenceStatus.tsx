import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getLicenceStatus } from "../lib/licenceRepository";
import type { ReaderIdentity } from "../lib/offlineDb";
import type { ActivationAttempt, AgentActivationRequest, DeviceIdentity, LicenceActivityLog, LocalLicence, ScratchCardAttempt } from "../types";

interface StatusData {
  reader: ReaderIdentity;
  device: DeviceIdentity;
  activeLicence?: LocalLicence;
  licences: LocalLicence[];
  activationAttempts: ActivationAttempt[];
  scratchCardAttempts: ScratchCardAttempt[];
  agentRequests: AgentActivationRequest[];
  logs: LicenceActivityLog[];
}

export default function LicenceStatus() {
  const [data, setData] = useState<StatusData | null>(null);

  useEffect(() => {
    getLicenceStatus().then(setData);
  }, []);

  if (!data) return <LoadingState label="Loading licence status..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Licence" title="Status" subtitle="Offline licence records stored on this device." actions={[{ label: "Activate", to: "/licence/activate", primary: true }, { label: "Help", to: "/licence/request-help" }]} />
      <section className={`panel p-4 ${data.activeLicence ? "border-signal" : "border-ember"}`}>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Current access</p>
        <h2 className="mt-2 text-2xl font-black">{data.activeLicence ? `${data.activeLicence.plan} / ${data.activeLicence.status}` : "No active licence"}</h2>
        <p className="mt-2 text-sm leading-6 text-paper/60">{data.activeLicence ? `Expires ${data.activeLicence.expiresAt}. Grace until ${data.activeLicence.graceExpiresAt}.` : "Free/sample packs remain available. Paid packs require activation."}</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-xl font-black">ReaderID</h2>
          <p className="mt-2 break-all text-sm text-paper/60">{data.reader.readerId}</p>
        </div>
        <div className="panel p-4">
          <h2 className="text-xl font-black">DeviceID</h2>
          <p className="mt-2 break-all text-sm text-paper/60">{data.device.deviceId}</p>
          <p className="mt-2 text-xs text-paper/40">{data.device.platform}</p>
        </div>
      </section>
      <section className="panel divide-y divide-white/10">
        <div className="p-4"><h2 className="text-xl font-black">Licences</h2></div>
        {data.licences.length === 0 ? <p className="p-4 text-sm text-paper/60">No local licences stored yet.</p> : data.licences.map((licence) => (
          <div key={licence.licenceId} className="p-4 text-sm text-paper/65">
            <p className="font-bold text-paper">{licence.plan} / {licence.status}</p>
            <p className="break-all">{licence.licenceId}</p>
            <p>Source: {licence.source} / Sync: {licence.syncStatus}</p>
          </div>
        ))}
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Activation history</h2>
        <p className="mt-3 text-sm text-paper/60">{data.activationAttempts.length} code attempts / {data.scratchCardAttempts.length} scratch card attempts / {data.agentRequests.length} agent requests.</p>
      </section>
    </section>
  );
}
