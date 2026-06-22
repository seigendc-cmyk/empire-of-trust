import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import {
  defaultAnalyticsFilters,
  exportRowsToCsv,
  getExecutiveAnalytics,
  type AnalyticsFilters,
  type AnalyticsView,
  type ExecutiveAnalytics,
} from "../lib/executiveAnalyticsRepository";

const views: Array<{ key: AnalyticsView; label: string; permissionHint?: string }> = [
  { key: "overview", label: "Overview" },
  { key: "readers", label: "Readers" },
  { key: "episodes", label: "Episodes" },
  { key: "library", label: "Library" },
  { key: "packs", label: "Packs" },
  { key: "participation", label: "Participation" },
  { key: "quizzes", label: "Quizzes" },
  { key: "predictions", label: "Predictions" },
  { key: "licensing", label: "Licensing" },
  { key: "agents", label: "Agents" },
  { key: "businesses", label: "Businesses" },
  { key: "properties", label: "Properties" },
  { key: "vehicles", label: "Vehicles" },
  { key: "actors", label: "Actors" },
  { key: "production", label: "Production" },
  { key: "assets", label: "Assets" },
  { key: "commerce", label: "Commerce" },
  { key: "staff", label: "Staff" },
];

export default function ExecutiveAnalytics({ view = "overview" }: { view?: AnalyticsView }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultAnalyticsFilters());
  const [data, setData] = useState<ExecutiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function refresh(nextFilters = filters) {
    setLoading(true);
    setError("");
    getExecutiveAnalytics(nextFilters)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Analytics could not be loaded."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const section = data?.sections[view] ?? data?.sections.overview;
  const visibleRows = useMemo(() => section?.rows ?? [], [section]);

  if (loading && !data) return <LoadingState label="Loading executive analytics..." />;
  if (error && !data) return <ErrorState title="Analytics unavailable" message={error} />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Executive Analytics"
        title={section?.title || "Overview"}
        subtitle="Browser-side operating console for readers, story, production, assets, commerce, licensing, and staff activity."
        actions={[
          { label: "Refresh Data", onClick: () => refresh(), primary: true },
          { label: "Studio", to: "/studio" },
        ]}
      />

      {error && <p className="border border-ember bg-ember/10 p-3 text-sm font-bold text-ember">{error}</p>}
      {data?.lastRefreshed && <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Last refreshed: {new Date(data.lastRefreshed).toLocaleString()}</p>}

      <Filters
        filters={filters}
        onChange={(next) => setFilters(next)}
        onApply={(next) => {
          setFilters(next);
          refresh(next);
        }}
      />

      <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Analytics sections">
        {views.map((item) => (
          <Link key={item.key} className={`btn shrink-0 ${view === item.key ? "btn-primary" : ""}`} to={item.key === "overview" ? "/studio/analytics" : `/studio/analytics/${item.key}`}>
            {item.label}
          </Link>
        ))}
      </nav>

      {data && view === "overview" && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(data.overview).map(([label, value]) => <Metric key={label} label={label} value={value} />)}
        </section>
      )}

      {section && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(section.metrics).map(([label, value]) => <Metric key={label} label={label} value={value} />)}
          </section>
          <section className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{section.title}</h2>
                <p className="mt-1 text-sm text-muted">{section.summary || `${visibleRows.length} visible analytics rows`}</p>
              </div>
              <button className="btn" type="button" onClick={() => exportRowsToCsv(`eot-${view}-analytics.csv`, visibleRows)}>Export CSV</button>
            </div>
            {loading ? <LoadingState label="Refreshing analytics..." /> : visibleRows.length === 0 ? (
              <EmptyState title="No analytics rows" message="No matching records were found for this section and filter set." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted">
                      <th className="p-3">Label</th>
                      <th className="p-3">Metric</th>
                      <th className="p-3">Detail</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={`${row.id}-${row.label}`} className="border-b border-white/10">
                        <td className="p-3 font-bold text-app">{row.label}</td>
                        <td className="p-3 font-black text-signal">{row.metric}</td>
                        <td className="p-3 text-muted">{row.detail}</td>
                        <td className="p-3 text-muted">{row.status || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {data && filters.search && (
        <section className="panel p-4">
          <h2 className="text-xl font-black">Global search results</h2>
          <div className="mt-3 grid gap-2">
            {data.searchResults.map((row) => (
              <div key={`${row.id}-${row.detail}`} className="border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-black">{row.label}</p>
                <p className="mt-1 text-sm text-muted">{row.metric} / {row.detail}</p>
              </div>
            ))}
            {data.searchResults.length === 0 && <p className="text-sm text-muted">No global matches.</p>}
          </div>
        </section>
      )}
    </section>
  );
}

function Filters({ filters, onChange, onApply }: { filters: AnalyticsFilters; onChange: (filters: AnalyticsFilters) => void; onApply: (filters: AnalyticsFilters) => void }) {
  const set = (key: keyof AnalyticsFilters, value: string) => onChange({ ...filters, [key]: value });
  return (
    <section className="panel grid gap-3 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <input className="field" placeholder="Global search" value={filters.search} onChange={(event) => set("search", event.target.value)} />
        <input className="field" type="date" value={filters.dateFrom} onChange={(event) => set("dateFrom", event.target.value)} />
        <input className="field" type="date" value={filters.dateTo} onChange={(event) => set("dateTo", event.target.value)} />
        <button className="btn btn-primary" type="button" onClick={() => onApply(filters)}>Apply filters</button>
      </div>
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <input className="field" placeholder="Season" value={filters.season} onChange={(event) => set("season", event.target.value)} />
        <input className="field" placeholder="Episode" value={filters.episode} onChange={(event) => set("episode", event.target.value)} />
        <input className="field" placeholder="Category" value={filters.category} onChange={(event) => set("category", event.target.value)} />
        <input className="field" placeholder="Licence plan" value={filters.licencePlan} onChange={(event) => set("licencePlan", event.target.value)} />
        <input className="field" placeholder="Staff member" value={filters.staffMember} onChange={(event) => set("staffMember", event.target.value)} />
        <input className="field" placeholder="Country" value={filters.country} onChange={(event) => set("country", event.target.value)} />
        <input className="field" placeholder="City" value={filters.city} onChange={(event) => set("city", event.target.value)} />
        <input className="field" placeholder="Status" value={filters.status} onChange={(event) => set("status", event.target.value)} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label.replace(/([A-Z])/g, " $1")}</p>
      <p className="mt-3 text-3xl font-black text-signal">{value}</p>
    </article>
  );
}
