import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../state/AuthContext";

type StaffModule = "episodes" | "packs" | "licensing" | "agents" | "mall" | "assets" | "story" | "production" | "analytics" | "library";

const moduleConfig: Record<StaffModule, { title: string; permission: string; actions: Array<{ label: string; to: string; primary?: boolean }> }> = {
  episodes: { title: "Episodes", permission: "episodes.read", actions: [{ label: "Episodes", to: "/studio/episodes", primary: true }, { label: "New Episode", to: "/studio/episodes/new" }] },
  packs: { title: "Packs", permission: "packs.build", actions: [{ label: "Packs", to: "/packs", primary: true }, { label: "Episodes", to: "/studio/episodes" }] },
  licensing: { title: "Licensing", permission: "licensing.read", actions: [{ label: "Licensing", to: "/studio/licensing", primary: true }, { label: "Licence Home", to: "/licence" }] },
  agents: { title: "Agents", permission: "agents.manage", actions: [{ label: "Agents", to: "/studio/agents", primary: true }, { label: "Scratch Cards", to: "/studio/scratch-cards" }] },
  mall: { title: "Mall", permission: "mall.read", actions: [{ label: "Mall", to: "/mall", primary: true }, { label: "Vendors", to: "/mall/vendors" }, { label: "Search", to: "/mall/search" }] },
  assets: { title: "Assets", permission: "assets.read", actions: [{ label: "Media Library", to: "/studio/assets/library", primary: true }, { label: "Upload", to: "/studio/assets/upload" }, { label: "Prompts", to: "/studio/assets/prompts" }] },
  story: { title: "Story", permission: "story.read", actions: [{ label: "Story Engine", to: "/studio/story-engine", primary: true }, { label: "Planner", to: "/studio/story-engine/episode-planner" }, { label: "Continuity", to: "/studio/story-engine/continuity" }] },
  production: { title: "Production", permission: "production.read", actions: [{ label: "Production", to: "/studio/production", primary: true }, { label: "Readiness", to: "/studio/production/readiness" }, { label: "Schedule", to: "/studio/production/schedule-board" }] },
  analytics: { title: "Analytics", permission: "analytics.read", actions: [{ label: "Executive Console", to: "/studio/analytics", primary: true }, { label: "Commerce", to: "/studio/analytics/commerce" }, { label: "Staff", to: "/studio/analytics/staff" }] },
  library: { title: "Library", permission: "library.read", actions: [{ label: "Library Catalogue", to: "/library", primary: true }, { label: "Studio Library", to: "/studio/library" }, { label: "Import Booklet", to: "/library/import" }] },
};

export default function StaffModulePage({ module }: { module: StaffModule }) {
  const { staff } = useAuth();
  const config = moduleConfig[module];
  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Staff module" title={config.title} subtitle={`Scoped by ${config.permission}.`} />
      <section className="panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-badge border-ledger text-ledger">{staff?.active ? "Active" : "Inactive"}</span>
          <span className="status-badge border-signal text-signal">{staff?.role ?? "staff"}</span>
          <span className="status-badge border-white/15 text-paper/55">{staff?.email}</span>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {config.actions.map((action) => (
          <Link key={action.to} className={`panel block p-4 hover:bg-white/5 ${action.primary ? "border-l-4 border-l-signal" : ""}`} to={action.to}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Open</p>
            <h2 className="mt-2 text-xl font-black">{action.label}</h2>
          </Link>
        ))}
      </section>
    </section>
  );
}
