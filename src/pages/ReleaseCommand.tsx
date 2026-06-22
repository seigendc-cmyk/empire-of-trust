import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getReleaseCommandCenter, publishEpisodeNow, scheduleEpisodeRelease } from "../lib/publishingRepository";
import type { Episode } from "../types";

type ReleaseRow = Awaited<ReturnType<typeof getReleaseCommandCenter>>[number];

function defaultReleaseDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReleaseCommand() {
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [form, setForm] = useState<Record<string, { releaseDate: string; releaseTime: string; timezone: string; downloadUrl: string }>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const nextRows = await getReleaseCommandCenter();
    setRows(nextRows);
    setForm((current) => {
      const next = { ...current };
      for (const row of nextRows) {
        next[row.episode.id] ??= {
          releaseDate: row.releaseSchedule?.releaseDate ?? row.catalogueEntry?.releaseDate ?? defaultReleaseDate(),
          releaseTime: row.releaseSchedule?.releaseTime ?? row.catalogueEntry?.releaseTime ?? "08:00",
          timezone: row.releaseSchedule?.timezone ?? row.catalogueEntry?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
          downloadUrl: row.catalogueEntry?.downloadUrl ?? "",
        };
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateForm(episodeId: string, field: "releaseDate" | "releaseTime" | "timezone" | "downloadUrl", value: string) {
    setForm((current) => ({
      ...current,
      [episodeId]: {
        releaseDate: current[episodeId]?.releaseDate ?? defaultReleaseDate(),
        releaseTime: current[episodeId]?.releaseTime ?? "08:00",
        timezone: current[episodeId]?.timezone ?? "UTC",
        downloadUrl: current[episodeId]?.downloadUrl ?? "",
        [field]: value,
      },
    }));
  }

  async function schedule(episode: Episode) {
    setWorkingId(episode.id);
    setMessage("");
    try {
      const input = form[episode.id] ?? { releaseDate: defaultReleaseDate(), releaseTime: "08:00", timezone: "UTC", downloadUrl: "" };
      await scheduleEpisodeRelease(episode, input);
      setMessage(`${episode.title} scheduled.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not schedule episode.");
    } finally {
      setWorkingId("");
    }
  }

  async function publish(episode: Episode) {
    setWorkingId(episode.id);
    setMessage("");
    try {
      await publishEpisodeNow(episode, form[episode.id]?.downloadUrl ?? "");
      setMessage(`${episode.title} published.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish episode.");
    } finally {
      setWorkingId("");
    }
  }

  if (loading) return <LoadingState label="Loading release command..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Publishing"
        title="Release Command"
        subtitle="Schedule approved episodes, publish catalogue records, and catch production blockers before release."
        actions={[{ label: "Episodes", to: "/studio/episodes" }, { label: "Readiness", to: "/studio/production/readiness" }, { label: "Packs", to: "/packs" }]}
      />
      {message && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{message}</p>}
      {rows.length === 0 ? (
        <EmptyState title="No episodes" message="Create an episode before release planning." actionLabel="Create episode" actionTo="/studio/episodes/new" />
      ) : (
        <section className="panel divide-y divide-white/10">
          {rows.map((row) => {
            const values = form[row.episode.id] ?? { releaseDate: defaultReleaseDate(), releaseTime: "08:00", timezone: "UTC", downloadUrl: "" };
            return (
              <div key={row.episode.id} className="grid gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{row.episode.episodeIdentifier || `S${row.episode.seasonNumber}E${row.episode.episodeNumber}`} / {row.episode.status}</p>
                    <h2 className="mt-1 text-xl font-black">{row.episode.title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-paper/60">{row.episode.synopsis}</p>
                  </div>
                  <p className={`status-badge ${row.blockers.length ? "border-ember text-ember" : "border-signal text-signal"}`}>{row.blockers.length ? `${row.blockers.length} blockers` : "Release clear"}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/45">Readiness</p>
                    <p className="mt-1 text-2xl font-black text-signal">{row.readiness?.readiness ?? 0}%</p>
                  </div>
                  <div className="border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/45">Schedule</p>
                    <p className="mt-1 text-sm font-bold">{row.releaseSchedule ? `${row.releaseSchedule.releaseDate} ${row.releaseSchedule.releaseTime}` : "Not scheduled"}</p>
                  </div>
                  <div className="border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/45">Catalogue</p>
                    <p className="mt-1 text-sm font-bold">{row.catalogueEntry?.status ?? "Missing"}</p>
                  </div>
                  <div className="border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/45">Licence</p>
                    <p className="mt-1 text-sm font-bold">{row.episode.requiredLicencePlan || "free"}</p>
                  </div>
                </div>

                {row.blockers.length > 0 && (
                  <div className="grid gap-2">
                    {row.blockers.map((blocker) => <p key={blocker} className="border border-ember bg-ember/10 p-3 text-sm font-bold text-ember">{blocker}</p>)}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-4">
                  <label>
                    <span className="label">Release date</span>
                    <input className="field" type="date" value={values.releaseDate} onChange={(event) => updateForm(row.episode.id, "releaseDate", event.currentTarget.value)} />
                  </label>
                  <label>
                    <span className="label">Release time</span>
                    <input className="field" type="time" value={values.releaseTime} onChange={(event) => updateForm(row.episode.id, "releaseTime", event.currentTarget.value)} />
                  </label>
                  <label>
                    <span className="label">Timezone</span>
                    <input className="field" value={values.timezone} onChange={(event) => updateForm(row.episode.id, "timezone", event.currentTarget.value)} />
                  </label>
                  <label>
                    <span className="label">Download URL</span>
                    <input className="field" value={values.downloadUrl} onChange={(event) => updateForm(row.episode.id, "downloadUrl", event.currentTarget.value)} />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary" type="button" disabled={workingId === row.episode.id || !row.canSchedule} onClick={() => schedule(row.episode)}>
                    {workingId === row.episode.id ? "Working..." : "Schedule release"}
                  </button>
                  <button className="btn" type="button" disabled={workingId === row.episode.id || !row.canPublish} onClick={() => publish(row.episode)}>Publish now</button>
                  <Link className="btn" to={`/studio/episodes/${row.episode.id}/build-pack`}>Build pack</Link>
                  <Link className="btn" to={`/studio/episodes/${row.episode.id}/edit`}>Edit episode</Link>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </section>
  );
}
