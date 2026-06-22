import { useState } from "react";
import { saveReaderChoice } from "../lib/offlineDb";

interface Props {
  episodeId: string;
  chapterId?: string;
  paragraphId?: string;
  prompt: string;
  options: string[];
  choiceType?: "prediction" | "vote" | "moral_choice" | "business_decision" | "relationship_choice" | "succession_choice";
  onSaved?: (selected: string) => void;
}

export function ReaderChoicePrompt({ episodeId, chapterId, paragraphId, prompt, options, choiceType = "prediction", onSaved }: Props) {
  const [selected, setSelected] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <section className="border border-signal/60 bg-black/25 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Reader choice</p>
      <h3 className="mt-2 font-black">{prompt}</h3>
      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <button key={option} className={`btn justify-start ${selected === option ? "btn-primary" : ""}`} onClick={() => setSelected(option)} type="button">
            {option}
          </button>
        ))}
      </div>
      <button
        className="btn btn-primary mt-3 w-full"
        disabled={!selected || saved}
        onClick={async () => {
          await saveReaderChoice({ episodeId, chapterId, paragraphId, choiceType, prompt, selectedOption: selected, optionsJson: JSON.stringify(options) });
          setSaved(true);
          onSaved?.(selected);
        }}
        type="button"
      >
        {saved ? "Submitted" : "Submit"}
      </button>
    </section>
  );
}
