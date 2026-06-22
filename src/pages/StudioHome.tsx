import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

export default function StudioHome() {
  return (
    <section className="page">
      <PageHeader eyebrow="Studio" title="Dashboard" subtitle="Create episodes, edit chapters, preview reader flow, and build offline packs." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link className="panel block border-l-4 border-l-signal p-4 hover:bg-white/5" to="/studio/episodes/new">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Start</p>
          <h2 className="mt-2 text-xl font-black">Create Episode</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Set season, title, synopsis, release week, and licence plan.</p>
        </Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/studio/episodes">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Manage</p>
          <h2 className="mt-2 text-xl font-black">Edit Episodes</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Add chapters, paragraphs, image prompts, and continuity notes.</p>
        </Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/studio/episodes">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Review</p>
          <h2 className="mt-2 text-xl font-black">Preview</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Open a reader-style preview before export.</p>
        </Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/packs">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Publish</p>
          <h2 className="mt-2 text-xl font-black">Build Packs</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Download JSON packs and import them offline.</p>
        </Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/studio/release-command">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Release</p>
          <h2 className="mt-2 text-xl font-black">Release Command</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Schedule approved episodes and publish catalogue records.</p>
        </Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/studio/books">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Library</p>
          <h2 className="mt-2 text-xl font-black">Book Library</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Add books, compile episodes into book packs, and export deployable data packs.</p>
        </Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/studio/story-engine">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Plan</p>
          <h2 className="mt-2 text-xl font-black">Story Engine</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Manage episode plans, arcs, continuity, prompts, and rules.</p>
        </Link>
        <Link className="panel block p-4 hover:bg-white/5" to="/studio/production">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Produce</p>
          <h2 className="mt-2 text-xl font-black">Production Studio</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Track actors, casting, scenes, locations, schedules, assets, and continuity.</p>
        </Link>
      </div>
    </section>
  );
}
