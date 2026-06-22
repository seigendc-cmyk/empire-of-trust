import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { buildWhatsAppHelpLink, getLicenceStatus, requestAgentActivation, subscriptionPlans } from "../lib/licenceRepository";
import type { DeviceIdentity, LocalLicence } from "../types";
import type { ReaderIdentity } from "../lib/offlineDb";

export default function LicenceHelp() {
  const [reader, setReader] = useState<ReaderIdentity | null>(null);
  const [device, setDevice] = useState<DeviceIdentity | null>(null);
  const [licence, setLicence] = useState<LocalLicence | undefined>();
  const [agentCode, setAgentCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [plan, setPlan] = useState("reader");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    getLicenceStatus().then((data) => {
      setReader(data.reader);
      setDevice(data.device);
      setLicence(data.activeLicence);
      setPhoneNumber(data.activeLicence?.phoneNumber ?? "");
    });
  }, []);

  if (!reader || !device) return <LoadingState label="Preparing licence help..." />;

  const whatsapp = buildWhatsAppHelpLink({ readerId: reader.readerId, deviceId: device.deviceId, phoneNumber, licenceId: licence?.licenceId, issueType: notes || "Licence activation help" });

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Licence" title="Request help" subtitle="Create an RPN/agent-assisted activation request or send support context by WhatsApp." actions={[{ label: "Status", to: "/licence/status" }]} />
      <section className="panel grid gap-3 p-4">
        <h2 className="text-xl font-black">Agent activation request</h2>
        <label><span className="label">Agent code</span><input className="field uppercase" value={agentCode} onChange={(event) => setAgentCode(event.currentTarget.value)} placeholder="RPN-..." /></label>
        <label><span className="label">Customer name</span><input className="field" value={customerName} onChange={(event) => setCustomerName(event.currentTarget.value)} /></label>
        <label><span className="label">Phone number</span><input className="field" inputMode="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.currentTarget.value)} /></label>
        <label>
          <span className="label">Plan</span>
          <select className="field" value={plan} onChange={(event) => setPlan(event.currentTarget.value)}>
            {subscriptionPlans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label><span className="label">Notes</span><textarea className="field min-h-28" value={notes} onChange={(event) => setNotes(event.currentTarget.value)} /></label>
        <button
          className="btn btn-primary"
          onClick={async () => {
            const request = await requestAgentActivation({ agentCode, customerName, phoneNumber, plan, deviceId: device.deviceId, readerId: reader.readerId, notes });
            setStatus(`Request ${request.status}. Reference ${request.id}.`);
          }}
          type="button"
        >
          Submit request
        </button>
        {status && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{status}</p>}
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">WhatsApp support</h2>
        <p className="mt-2 text-sm leading-6 text-paper/60">The message includes ReaderID, DeviceID, phone number, licence ID, app version, and issue type.</p>
        <a className="btn btn-primary mt-4 w-full sm:w-fit" href={whatsapp} target="_blank" rel="noreferrer">Request Licence Help via WhatsApp</a>
      </section>
    </section>
  );
}
