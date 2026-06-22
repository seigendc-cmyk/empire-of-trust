import { useState } from "react";
import { saveDramaParticipation, saveReaderChoice } from "../lib/offlineDb";

export function DramaPollCard({ episodeId, prompt, options, onSaved }: { episodeId: string; prompt: string; options: string[]; onSaved?: () => void }) {
  const [selected, setSelected] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <section className="border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Drama poll</p>
      <h3 className="mt-2 font-black">{prompt}</h3>
      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <button key={option} className={`btn justify-start ${selected === option ? "btn-primary" : ""}`} type="button" onClick={() => setSelected(option)}>
            {option}
          </button>
        ))}
      </div>
      <button
        className="btn btn-primary mt-3 w-full"
        disabled={!selected || saved}
        type="button"
        onClick={async () => {
          await saveReaderChoice({ episodeId, choiceType: "vote", prompt, selectedOption: selected, optionsJson: JSON.stringify(options) });
          await saveDramaParticipation({ participationType: "poll", episodeId, prompt, response: selected, scoreImpact: 1 });
          setSaved(true);
          onSaved?.();
        }}
      >
        {saved ? "Saved" : "Vote"}
      </button>
    </section>
  );
}
