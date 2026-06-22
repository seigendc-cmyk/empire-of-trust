import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { createScratchCardBatch, listStudioLicensingData, subscriptionPlans } from "../lib/licenceRepository";
import type { EotScratchCard, EotScratchCardBatch } from "../types";

export default function StudioScratchCards() {
  const [cards, setCards] = useState<EotScratchCard[] | null>(null);
  const [batches, setBatches] = useState<EotScratchCardBatch[]>([]);
  const [batchName, setBatchName] = useState("");
  const [plan, setPlan] = useState("reader");
  const [quantity, setQuantity] = useState(10);
  const [durationDays, setDurationDays] = useState(30);
  const [status, setStatus] = useState("");

  async function load() {
    const data = await listStudioLicensingData();
    setCards(data.cards);
    setBatches(data.batches);
  }

  useEffect(() => {
    load();
  }, []);

  if (!cards) return <LoadingState label="Loading scratch cards..." />;

  const redeemed = cards.filter((card) => card.status === "redeemed");

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Studio" title="Scratch cards" subtitle="Create scratch card batches and view redeemed cards." actions={[{ label: "Licensing", to: "/studio/licensing" }]} />
      <section className="panel grid gap-3 p-4 sm:grid-cols-4">
        <label><span className="label">Batch name</span><input className="field" value={batchName} onChange={(event) => setBatchName(event.currentTarget.value)} /></label>
        <label>
          <span className="label">Plan</span>
          <select className="field" value={plan} onChange={(event) => setPlan(event.currentTarget.value)}>
            {subscriptionPlans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label><span className="label">Quantity</span><input className="field" type="number" min={1} max={100} value={quantity} onChange={(event) => setQuantity(Number(event.currentTarget.value))} /></label>
        <label><span className="label">Days</span><input className="field" type="number" min={1} value={durationDays} onChange={(event) => setDurationDays(Number(event.currentTarget.value))} /></label>
        <button className="btn btn-primary sm:col-span-4" onClick={async () => {
          const id = await createScratchCardBatch({ batchName, plan, quantity, durationDays });
          setStatus(`Scratch card batch created: ${id}`);
          setBatchName("");
          await load();
        }} type="button">Create batch</button>
        {status && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal sm:col-span-4">{status}</p>}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel divide-y divide-white/10">
          <div className="p-4"><h2 className="text-xl font-black">Batches</h2></div>
          {batches.map((batch) => <div key={batch.id} className="p-4 text-sm text-paper/65"><p className="font-bold text-paper">{batch.batchName}</p><p>{batch.plan} / {batch.quantity} / {batch.status}</p></div>)}
        </div>
        <div className="panel divide-y divide-white/10">
          <div className="p-4"><h2 className="text-xl font-black">Redeemed cards</h2></div>
          {redeemed.length === 0 ? <p className="p-4 text-sm text-paper/60">No redeemed cards found.</p> : redeemed.map((card) => (
            <div key={card.id} className="p-4 text-sm text-paper/65">
              <p className="font-bold text-paper">{card.scratchCardCode}</p>
              <p>{card.plan} / {card.phoneNumber || "No phone"} / {card.licenceId || "No licence"}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
