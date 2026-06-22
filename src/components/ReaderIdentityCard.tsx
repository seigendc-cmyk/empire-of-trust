import type { ReaderIdentity } from "../lib/offlineDb";

export function ReaderIdentityCard({ identity }: { identity: ReaderIdentity }) {
  return (
    <section className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Reader identity</p>
      <h2 className="mt-2 text-xl font-black">{identity.displayName || "Local Reader"}</h2>
      <div className="mt-4 grid gap-2 break-all text-sm text-paper/65">
        <p>ReaderID: {identity.readerId}</p>
        <p>DeviceID: {identity.deviceId}</p>
        <p>Last seen: {new Date(identity.lastSeenAt).toLocaleString()}</p>
      </div>
    </section>
  );
}
