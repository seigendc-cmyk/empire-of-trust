import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { createAgent, listStudioLicensingData } from "../lib/licenceRepository";
import type { AgentActivationRequest, EotAgent } from "../types";

export default function StudioAgents() {
  const [agents, setAgents] = useState<EotAgent[] | null>(null);
  const [requests, setRequests] = useState<AgentActivationRequest[]>([]);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const data = await listStudioLicensingData();
    setAgents(data.agents);
    setRequests(data.requests);
  }

  useEffect(() => {
    load();
  }, []);

  if (!agents) return <LoadingState label="Loading agents..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Studio" title="RPN agents" subtitle="Create agents and review assisted activation records." actions={[{ label: "Licensing", to: "/studio/licensing" }]} />
      <section className="panel grid gap-3 p-4 sm:grid-cols-3">
        <label><span className="label">Agent name</span><input className="field" value={name} onChange={(event) => setName(event.currentTarget.value)} /></label>
        <label><span className="label">Phone</span><input className="field" value={phoneNumber} onChange={(event) => setPhoneNumber(event.currentTarget.value)} /></label>
        <label><span className="label">Agent code optional</span><input className="field uppercase" value={agentCode} onChange={(event) => setAgentCode(event.currentTarget.value)} /></label>
        <button className="btn btn-primary sm:col-span-3" onClick={async () => {
          const code = await createAgent({ name, phoneNumber, agentCode });
          setStatus(`Agent created: ${code}`);
          setName("");
          setPhoneNumber("");
          setAgentCode("");
          await load();
        }} type="button">Create agent</button>
        {status && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal sm:col-span-3">{status}</p>}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel divide-y divide-white/10">
          <div className="p-4"><h2 className="text-xl font-black">Agents</h2></div>
          {agents.map((agent) => <div key={agent.id} className="p-4 text-sm text-paper/65"><p className="font-bold text-paper">{agent.name}</p><p>{agent.agentCode} / {agent.phoneNumber} / {agent.status}</p></div>)}
        </div>
        <div className="panel divide-y divide-white/10">
          <div className="p-4"><h2 className="text-xl font-black">Activation requests</h2></div>
          {requests.map((request) => <div key={request.id} className="p-4 text-sm text-paper/65"><p className="font-bold text-paper">{request.customerName}</p><p>{request.agentCode} / {request.phoneNumber} / {request.status}</p><p>{request.notes}</p></div>)}
        </div>
      </section>
    </section>
  );
}
