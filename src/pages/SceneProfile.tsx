import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { MediaReferencePanel } from "../components/MediaReferencePanel";
import { ErrorState, LoadingState } from "../components/States";
import { getSceneContext, runSceneContinuityChecks } from "../lib/sceneRepository";

type View = "overview" | "breakdown" | "cast" | "assets" | "continuity" | "schedule";

export default function SceneProfile({ view = "overview" }: { view?: View }) {
  const { sceneId } = useParams();
  const [context, setContext] = useState<Awaited<ReturnType<typeof getSceneContext>> | null>(null);
  const [checks, setChecks] = useState<Array<{ severity: "info" | "warning" | "critical"; note: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sceneId) return;
    Promise.all([getSceneContext(sceneId), runSceneContinuityChecks(sceneId)])
      .then(([ctx, ruleChecks]) => {
        setContext(ctx);
        setChecks(ruleChecks);
      })
      .finally(() => setLoading(false));
  }, [sceneId]);

  if (loading) return <LoadingState label="Loading scene plan..." />;
  if (!sceneId || !context?.scene) return <ErrorState title="Scene not found" message="This scene is not available from Firestore or the local cache." />;
  const scene = context.scene;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow={scene.sceneCode || "Scene"} title={scene.title} subtitle={`${scene.episodeId} / ${scene.productionStatus} / ${scene.continuityStatus}`} actions={[{ label: "Edit", to: `/studio/scenes/${sceneId}/edit`, primary: true }, { label: "Scenes", to: "/studio/scenes" }]} />
      <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Scene sections">
        {["overview", "breakdown", "cast", "assets", "continuity", "schedule"].map((key) => <Link key={key} className={`btn ${view === key ? "btn-primary" : ""}`} to={key === "overview" ? `/studio/scenes/${sceneId}` : `/studio/scenes/${sceneId}/${key}`}>{key}</Link>)}
      </nav>
      {view === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Info title="Scene plan" rows={[["Description", scene.description], ["Type", scene.sceneType], ["Story date", scene.storyDate], ["Location", scene.propertyId || scene.locationId], ["Business", scene.businessId], ["Emotional tone", scene.emotionalTone], ["Camera", scene.cameraDirection], ["Purpose", scene.dramaticPurpose]]} />
          <section className="panel p-4">
            <h2 className="text-xl font-black">Continuity rule checks</h2>
            <div className="mt-3 grid gap-2">
              {checks.map((check) => <p key={check.note} className={`border p-3 text-sm font-semibold ${check.severity === "critical" ? "border-ember text-ember" : "border-signal text-signal"}`}>{check.severity}: {check.note}</p>)}
              {checks.length === 0 && <p className="text-sm text-paper/60">No rule warnings detected.</p>}
            </div>
          </section>
          <div className="lg:col-span-2">
            <MediaReferencePanel entityType="scene" entityId={sceneId} title="Scene images, concept references, and visual direction" />
          </div>
        </div>
      )}
      {view === "breakdown" && <Records title="Breakdown" rows={context.breakdowns.map((row) => [row.id, row.synopsis, row.productionNotes || row.keyConflict])} />}
      {view === "cast" && <Records title="Cast" rows={context.cast.map((row) => [row.id, `${row.characterId} / ${row.actorId || "actor pending"}`, `${row.roleImportance} / dialogue ${row.dialogueRequired ? "yes" : "no"} / ${row.notes}`])} />}
      {view === "assets" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Records title="Assets" rows={context.assets.map((row) => [row.id, `${row.assetName} / ${row.assetType}`, row.description || row.notes])} />
          <Records title="Props" rows={context.props.map((row) => [row.id, `${row.propName} / ${row.propType}`, row.notes])} />
          <Records title="Wardrobe" rows={context.wardrobe.map((row) => [row.id, row.characterId, row.wardrobeDescription])} />
          <Records title="Shot list" rows={context.shots.map((row) => [row.id, `${row.shotNumber}. ${row.shotType}`, row.description])} />
        </div>
      )}
      {view === "continuity" && <Records title="Continuity checklist" rows={context.continuity.map((row) => [row.id, `${row.severity} / ${row.continuityType} / ${row.resolved ? "resolved" : "open"}`, row.note])} />}
      {view === "schedule" && <Records title="Schedule" rows={context.schedules.map((row) => [row.id, `${row.scheduledDate} / ${row.status}`, [row.startTime, row.endTime, row.propertyId || row.locationId, row.notes].filter(Boolean).join(" / ")])} />}
    </section>
  );
}

function Info({ title, rows }: { title: string; rows: Array<[string, string | number | undefined]> }) {
  return <section className="panel p-4"><h2 className="text-xl font-black">{title}</h2><dl className="mt-3 grid gap-2">{rows.filter(([, value]) => value).map(([label, value]) => <div key={label} className="border border-white/10 bg-black/20 p-3"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{label}</dt><dd className="mt-1 text-sm leading-6 text-paper/75">{value}</dd></div>)}</dl></section>;
}

function Records({ title, rows }: { title: string; rows: Array<[string, string, string | undefined]> }) {
  return <section className="panel p-4"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 grid gap-3">{rows.map(([id, primary, detail]) => <article key={id} className="border border-white/10 bg-black/20 p-3"><h3 className="font-black">{primary}</h3>{detail && <p className="mt-2 text-sm text-paper/60">{detail}</p>}</article>)}{rows.length === 0 && <p className="text-sm text-paper/60">No records cached yet.</p>}</div></section>;
}
