import type { ReaderIdentity } from "../lib/offlineDb";

export function ReaderIdentityCard({ identity }: { identity: ReaderIdentity }) {
  return (
    <section className="panel p-4">
      <p className="text-accent text-xs font-bold uppercase tracking-[0.16em]">Reader identity</p>
      <h2 className="mt-2 text-xl font-black">{identity.displayName || "Local Reader"}</h2>
      <div className="text-muted mt-4 grid gap-2 break-all text-sm">
        <p>ReaderID: {identity.readerId}</p>
        <p>DeviceID: {identity.deviceId}</p>
        {(identity.city || identity.country) && <p>Location: {[identity.city, identity.country].filter(Boolean).join(", ")}</p>}
        {identity.phone && <p>Phone: {identity.phone}</p>}
        <p>Last seen: {new Date(identity.lastSeenAt).toLocaleString()}</p>
      </div>
    </section>
  );
}
