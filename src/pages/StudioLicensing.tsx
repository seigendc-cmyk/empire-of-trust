import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { createActivationCode, listStudioLicensingData, subscriptionPlans, updateAgentActivationRequestStatus } from "../lib/licenceRepository";
import type { AgentActivationRequest, EotActivationCode, EotSubscriptionPlan, LocalLicence } from "../types";

interface LicensingData {
  licences: LocalLicence[];
  codes: EotActivationCode[];
  requests: AgentActivationRequest[];
  plans: EotSubscriptionPlan[];
}

export default function StudioLicensing() {
  const [data, setData] = useState<LicensingData | null>(null);
  const [plan, setPlan] = useState("reader");
  const [durationDays, setDurationDays] = useState(30);
  const [createdCode, setCreatedCode] = useState("");

  async function load() {
    const result = await listStudioLicensingData();
    setData({ licences: result.licences, codes: result.codes, requests: result.requests, plans: result.plans });
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) return <LoadingState label="Loading licensing panel..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Studio" title="Licensing" subtitle="Manage placeholder plans, activation codes, licence records, and agent requests." actions={[{ label: "Agents", to: "/studio/agents" }, { label: "Scratch cards", to: "/studio/scratch-cards" }]} />
      <section className="panel grid gap-3 p-4 sm:grid-cols-[1fr_160px_auto]">
        <label>
          <span className="label">Plan</span>
          <select className="field" value={plan} onChange={(event) => setPlan(event.currentTarget.value)}>
            {subscriptionPlans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Days</span>
          <input className="field" type="number" min={1} value={durationDays} onChange={(event) => setDurationDays(Number(event.currentTarget.value))} />
        </label>
        <button
          className="btn btn-primary self-end"
          onClick={async () => {
            const code = await createActivationCode({ plan, durationDays });
            setCreatedCode(code);
            await load();
          }}
          type="button"
        >
          Create code
        </button>
        {createdCode && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal sm:col-span-3">Created {createdCode}</p>}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel divide-y divide-white/10">
          <div className="p-4"><h2 className="text-xl font-black">Activation codes</h2></div>
          {data.codes.length === 0 ? <p className="p-4 text-sm text-paper/60">No codes found.</p> : data.codes.map((code) => (
            <div key={code.id} className="p-4 text-sm text-paper/65">
              <p className="font-bold text-paper">{code.activationCode}</p>
              <p>{code.plan} / {code.status}</p>
            </div>
          ))}
        </div>
        <div className="panel divide-y divide-white/10">
          <div className="p-4"><h2 className="text-xl font-black">Agent requests</h2></div>
          {data.requests.length === 0 ? <p className="p-4 text-sm text-paper/60">No requests found.</p> : data.requests.map((request) => (
            <div key={request.id} className="grid gap-2 p-4 text-sm text-paper/65">
              <p className="font-bold text-paper">{request.customerName || request.phoneNumber}</p>
              <p>{request.agentCode} / {request.plan} / {request.status}</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn min-h-10 px-3 py-2" onClick={() => updateAgentActivationRequestStatus(request.id, "approved").then(load)} type="button">Approve</button>
                <button className="btn min-h-10 px-3 py-2" onClick={() => updateAgentActivationRequestStatus(request.id, "rejected").then(load)} type="button">Reject</button>
                <button className="btn min-h-10 px-3 py-2" onClick={() => updateAgentActivationRequestStatus(request.id, "completed").then(load)} type="button">Complete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Subscription plan placeholders</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {data.plans.map((item) => (
            <div key={item.id} className="border border-white/10 bg-black/20 p-3">
              <p className="font-black">{item.name}</p>
              <p className="mt-1 text-xs text-paper/50">{item.features.join(", ")}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Licence records</h2>
        <p className="mt-2 text-sm text-paper/60">{data.licences.length} records loaded from Firestore.</p>
      </section>
    </section>
  );
}
