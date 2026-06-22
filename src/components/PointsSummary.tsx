export function PointsSummary({ totalPoints, episodesCompleted, predictionsSubmitted, choicesMade }: { totalPoints: number; episodesCompleted: number; predictionsSubmitted: number; choicesMade: number }) {
  const items = [
    ["Points", totalPoints],
    ["Completed", episodesCompleted],
    ["Predictions", predictionsSubmitted],
    ["Choices", choicesMade],
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="panel p-4">
          <p className="text-2xl font-black text-signal">{value}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p>
        </div>
      ))}
    </section>
  );
}
