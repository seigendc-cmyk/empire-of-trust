export function RewardToast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 border border-signal bg-graphite p-3 text-sm font-bold text-signal shadow-2xl shadow-black/40 sm:left-auto sm:w-80">
      {message}
    </div>
  );
}
