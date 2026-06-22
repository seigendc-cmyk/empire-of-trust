import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { PredictionCard } from "../components/PredictionCard";
import { LoadingState } from "../components/States";
import { getReaderPredictions, type ReaderChoice } from "../lib/offlineDb";

const samplePrompts = [
  { prompt: "Should Samantha challenge the board?", options: ["Challenge openly", "Move quietly", "Wait for proof"] },
  { prompt: "Who should Trust trust?", options: ["Samantha", "Tanatswa", "The board"] },
  { prompt: "Should the company acquire the competitor?", options: ["Acquire", "Partner", "Walk away"] },
];

export default function ReaderPredictions() {
  const [predictions, setPredictions] = useState<ReaderChoice[] | null>(null);

  async function load() {
    setPredictions(await getReaderPredictions());
  }

  useEffect(() => {
    load();
  }, []);

  if (!predictions) return <LoadingState label="Loading predictions..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Reader participation" title="Predictions" subtitle="Submit local predictions that make you part of the Empire of Trust drama." actions={[{ label: "Participation", to: "/reader/participation" }]} />
      <section className="grid gap-3">
        {samplePrompts.map((item) => (
          <PredictionCard key={item.prompt} episodeId="global" prompt={item.prompt} options={item.options} onSaved={load} />
        ))}
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Submitted predictions</h2>
        {predictions.length === 0 ? <p className="mt-3 text-sm text-paper/60">No predictions submitted yet.</p> : (
          <div className="mt-4 grid gap-3">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="border border-white/10 bg-black/20 p-3">
                <h3 className="font-black">{prediction.prompt}</h3>
                <p className="mt-2 text-sm text-paper/70">{prediction.selectedOption}</p>
                <p className="mt-2 text-xs text-paper/40">{new Date(prediction.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
