import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { DASHBOARD_PATH, DASHBOARD_PERMISSION, type StaffDashboard as StaffDashboardKey } from "../lib/staffPermissions";
import { useAuth } from "../state/AuthContext";

const modules: Array<{ key: StaffDashboardKey; title: string; detail: string }> = [
  { key: "episodes", title: "Episodes", detail: "Draft, edit, preview, and approve episode content." },
  { key: "packs", title: "Packs", detail: "Build, validate, and publish reader packs." },
  { key: "licensing", title: "Licensing", detail: "Review and manage licence operations." },
  { key: "agents", title: "Agents", detail: "Manage studio agents and scratch-card operations." },
  { key: "mall", title: "Mall", detail: "Work with iTred Mall vendors and products." },
  { key: "assets", title: "Assets", detail: "Inspect characters, properties, vehicles, and universe assets." },
  { key: "story", title: "Story", detail: "Use the story engine, continuity, rules, and prompts." },
  { key: "production", title: "Production", detail: "Track casting, scenes, schedules, and readiness." },
  { key: "analytics", title: "Analytics", detail: "Read console and reader analytics surfaces." },
  { key: "library", title: "Library", detail: "Manage independent booklet catalogue and reader packs." },
];

export default function StaffDashboard() {
  const { staff, hasPermission } = useAuth();
  const visibleModules = modules.filter((module) => hasPermission(DASHBOARD_PERMISSION[module.key]));

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Staff" title="Staff Dashboard" subtitle="Permission-scoped workspace for Empire of Trust staff." />
      <section className="panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-badge border-ledger text-ledger">{staff?.active ? "Active" : "Inactive"}</span>
          <span className="status-badge border-signal text-signal">{staff?.role ?? "staff"}</span>
          <span className="status-badge border-white/15 text-paper/55">{staff?.email}</span>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleModules.map((module) => (
          <Link key={module.key} className="panel block p-4 hover:bg-white/5" to={DASHBOARD_PATH[module.key]}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{DASHBOARD_PERMISSION[module.key]}</p>
            <h2 className="mt-2 text-xl font-black">{module.title}</h2>
            <p className="mt-2 text-sm leading-6 text-paper/60">{module.detail}</p>
          </Link>
        ))}
        {visibleModules.length === 0 && <p className="panel p-4 text-sm text-paper/65">No dashboard modules are assigned to this staff account.</p>}
      </section>
    </section>
  );
}
