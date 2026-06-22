import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getReaderParticipationTimeline, type ReaderChoice, type ReaderParticipation } from "../lib/offlineDb";

interface Timeline {
  participation: ReaderParticipation[];
  choices: ReaderChoice[];
}

export default function ReaderParticipation() {
  const [timeline, setTimeline] = useState<Timeline | null>(null);

  useEffect(() => {
    getReaderParticipationTimeline().then(setTimeline);
  }, []);

  if (!timeline) return <LoadingState label="Loading participation..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Reader participation" title="Participation" subtitle="Predictions, votes, choices, and local drama timeline." actions={[{ label: "Predictions", to: "/reader/predictions", primary: true }]} />
      <section className="panel p-4">
        <h2 className="text-xl font-black">Timeline</h2>
        {timeline.participation.length === 0 ? <p className="mt-3 text-sm text-paper/60">No participation yet.</p> : (
          <div className="mt-4 grid gap-3">
            {timeline.participation.map((item) => (
              <div key={item.id} className="border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{item.participationType}</p>
                <h3 className="mt-2 font-black">{item.prompt}</h3>
                <p className="mt-2 text-sm text-paper/70">{item.response}</p>
                <p className="mt-2 text-xs text-paper/40">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Choices</h2>
        {timeline.choices.length === 0 ? <p className="mt-3 text-sm text-paper/60">No choices stored yet.</p> : (
          <div className="mt-4 grid gap-3">
            {timeline.choices.map((choice) => (
              <div key={choice.id} className="border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{choice.choiceType}</p>
                <h3 className="mt-2 font-black">{choice.prompt}</h3>
                <p className="mt-2 text-sm text-paper/70">{choice.selectedOption}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
