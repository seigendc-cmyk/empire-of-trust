import { useEffect, useState } from "react";

export function OfflineStatusBadge() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <span className={`status-badge ${online ? "border-ledger text-ledger" : "border-signal text-signal"}`}>
      <span className={`h-2 w-2 ${online ? "bg-ledger" : "bg-signal"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}
