import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

export default function LicenceHome() {
  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Access" title="Licence" subtitle="Local activation, offline licence status, and support for paid access readiness." actions={[{ label: "Activate", to: "/licence/activate", primary: true }, { label: "Status", to: "/licence/status" }]} />
      <section className="grid gap-3 sm:grid-cols-3">
        <Link className="panel p-4 hover:bg-white/5" to="/licence/activate">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Activation</p>
          <h2 className="mt-2 text-xl font-black">Code or scratch card</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Bind access to this ReaderID and device.</p>
        </Link>
        <Link className="panel p-4 hover:bg-white/5" to="/licence/status">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Offline check</p>
          <h2 className="mt-2 text-xl font-black">Licence status</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">View local plans, features, expiry, and grace period.</p>
        </Link>
        <Link className="panel p-4 hover:bg-white/5" to="/licence/request-help">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Support</p>
          <h2 className="mt-2 text-xl font-black">Request help</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Prepare a WhatsApp support message with device context.</p>
        </Link>
      </section>
    </section>
  );
}
