import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { MediaReferencePanel } from "../components/MediaReferencePanel";
import { ErrorState, LoadingState } from "../components/States";
import { listSceneAssets, listScenes } from "../lib/sceneRepository";
import { getVehicleContext } from "../lib/vehicleRepository";
import type { EotScene, EotSceneAsset, EotVehicle, EotVehicleAppearance, EotVehicleMaintenance, EotVehicleOwnership, EotVehicleRelationship, EotVehicleUsage } from "../types";

type View = "overview" | "ownership" | "usage" | "maintenance" | "episodes";

export default function VehicleProfile({ view = "overview" }: { view?: View }) {
  const { vehicleId } = useParams();
  const [context, setContext] = useState<Awaited<ReturnType<typeof getVehicleContext>> | null>(null);
  const [sceneLinks, setSceneLinks] = useState<Array<{ scene: EotScene; asset?: EotSceneAsset }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;
    Promise.all([getVehicleContext(vehicleId), listScenes(), listSceneAssets()])
      .then(([vehicleContext, scenes, assets]) => {
        setContext(vehicleContext);
        const vehicleAssets = assets.filter((asset) => asset.assetType === "vehicle" && asset.assetId === vehicleId);
        setSceneLinks(vehicleAssets.map((asset) => ({ asset, scene: scenes.find((scene) => scene.id === asset.sceneId) })).filter((row): row is { scene: EotScene; asset: EotSceneAsset } => Boolean(row.scene)));
      })
      .finally(() => setLoading(false));
  }, [vehicleId]);

  if (loading) return <LoadingState label="Loading vehicle profile..." />;
  if (!vehicleId || !context?.vehicle) return <ErrorState title="Vehicle not found" message="This vehicle is not available from Firestore or the local cache." />;

  const vehicle = context.vehicle;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={vehicle.vehicleCode || "Vehicle"}
        title={vehicle.name}
        subtitle={`${(vehicle.vehicleType || vehicle.type).replaceAll("_", " ")} / ${vehicle.registrationNumber || vehicle.registration || "registration pending"} / ${vehicle.status || "active"}`}
        actions={[{ label: "Edit", to: `/vehicles/${vehicleId}/edit`, primary: true }, { label: "Directory", to: "/vehicles" }, { label: "Studio", to: "/studio/vehicles" }]}
      />
      <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Vehicle sections">
        {[
          ["overview", "Overview"],
          ["ownership", "Ownership"],
          ["usage", "Usage"],
          ["maintenance", "Maintenance"],
          ["episodes", "Episodes"],
        ].map(([key, label]) => (
          <Link key={key} className={`btn ${view === key ? "btn-primary" : ""}`} to={key === "overview" ? `/vehicles/${vehicleId}` : `/vehicles/${vehicleId}/${key}`}>{label}</Link>
        ))}
      </nav>
      {view === "overview" && <><Overview vehicle={vehicle} relationships={context.relationships} sceneLinks={sceneLinks} /><MediaReferencePanel entityType="vehicle" entityId={vehicleId} title="Gallery, continuity images, and promotional media" /></>}
      {view === "ownership" && <Ownership rows={context.ownership} />}
      {view === "usage" && <Usage rows={context.usage} />}
      {view === "maintenance" && <Maintenance rows={context.maintenance} />}
      {view === "episodes" && <Appearances rows={context.appearances} />}
    </section>
  );
}

function Overview({ vehicle, relationships, sceneLinks }: { vehicle: EotVehicle; relationships: EotVehicleRelationship[]; sceneLinks: Array<{ scene: EotScene; asset?: EotSceneAsset }> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <section className="panel p-4">
        <div className="h-72 border border-white/10 bg-black/20">
          {vehicle.imageUrl ? <img className="h-full w-full object-cover" src={vehicle.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-lg font-black text-signal">{vehicle.vehicleCode || "VEH"}</div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {vehicle.isFictional && <span className="status-badge border-signal text-signal">story asset</span>}
          {vehicle.isBusinessAsset && <span className="status-badge border-white/15 text-paper/65">business asset</span>}
          {vehicle.isProductionVehicle && <span className="status-badge border-ledger text-ledger">production vehicle</span>}
        </div>
      </section>
      <div className="grid gap-4">
        <Info title="Fleet profile" rows={[
          ["Make", vehicle.make],
          ["Model", vehicle.model],
          ["Year", vehicle.year],
          ["Color", vehicle.color],
          ["Registration", vehicle.registrationNumber || vehicle.registration],
          ["VIN / chassis", vehicle.vinOrChassisNumber],
          ["Engine", vehicle.engineNumber],
          ["Story role", vehicle.storyRole],
        ]} />
        <Info title="Location" rows={[
          ["Country", vehicle.country],
          ["City", vehicle.city],
          ["District", vehicle.district],
          ["Suburb", vehicle.suburb],
        ]} />
      </div>
      <section className="panel p-4 lg:col-span-2">
        <h2 className="text-xl font-black">Linked universe records</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <LinkList title="Character Owners" ids={vehicle.ownerCharacterIds ?? []} base="/characters" />
          <LinkList title="Business Owners" ids={vehicle.ownerBusinessIds ?? []} base="/businesses" />
          <LinkList title="Properties" ids={vehicle.linkedPropertyIds ?? []} base="/properties" />
          <LinkList title="Assets" ids={vehicle.linkedAssetIds ?? []} base="/assets" />
        </div>
      </section>
      <section className="panel p-4 lg:col-span-2">
        <h2 className="text-xl font-black">Vehicle relationship graph</h2>
        <div className="mt-3 grid gap-2">
          {relationships.map((row) => {
            const other = row.vehicleA === vehicle.id ? row.vehicleB : row.vehicleA;
            return <Link key={row.id} className="border border-white/10 bg-black/20 p-3 text-sm font-bold text-paper/75" to={`/vehicles/${other}`}>{row.relationshipType.replaceAll("_", " ")} / {other}</Link>;
          })}
          {relationships.length === 0 && <p className="text-sm text-paper/60">No vehicle relationships cached yet.</p>}
        </div>
      </section>
      <section className="panel p-4 lg:col-span-2">
        <h2 className="text-xl font-black">Scenes using this vehicle</h2>
        <div className="mt-3 grid gap-2">
          {sceneLinks.map(({ scene, asset }) => <Link key={`${scene.id}-${asset?.id}`} className="border border-white/10 bg-black/20 p-3 text-sm font-bold text-paper/75" to={`/studio/scenes/${scene.id}`}>{scene.sceneNumber}. {scene.title} / {asset?.assetName || "vehicle"}</Link>)}
          {sceneLinks.length === 0 && <p className="text-sm text-paper/60">No scene usage cached yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Ownership({ rows }: { rows: EotVehicleOwnership[] }) {
  return <RecordList title="Ownership" empty="No ownership records cached yet." rows={rows.map((row) => [`${row.ownerName || row.ownerId} / ${row.ownerType}`, `${row.ownershipPercentage}% / ${row.acquisitionMethod}`, row.notes])} />;
}

function Usage({ rows }: { rows: EotVehicleUsage[] }) {
  return <RecordList title="Usage and assignment history" empty="No usage records cached yet." rows={rows.map((row) => [row.usageType.replaceAll("_", " "), [row.assignedDriverName, row.assignedCharacterId, row.assignedBusinessId].filter(Boolean).join(" / "), row.notes])} />;
}

function Maintenance({ rows }: { rows: EotVehicleMaintenance[] }) {
  return <RecordList title="Maintenance history" empty="No maintenance records cached yet." rows={rows.map((row) => [`${row.maintenanceDate} / ${row.maintenanceType.replaceAll("_", " ")}`, `${row.currency ?? ""} ${row.costAmount ?? ""} / ${row.serviceProvider ?? ""}`, row.notes])} />;
}

function Appearances({ rows }: { rows: EotVehicleAppearance[] }) {
  return <RecordList title="Episode appearances" empty="No vehicle appearances cached yet." rows={rows.map((row) => [`S${row.seasonNumber}E${row.episodeNumber}${row.chapterNumber ? ` C${row.chapterNumber}` : ""}`, `${row.importance} / impact ${row.storyImpactScore}`, row.sceneContext])} />;
}

function Info({ title, rows }: { title: string; rows: Array<[string, string | number | undefined]> }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <dl className="mt-3 grid gap-2">
        {rows.filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => (
          <div key={label} className="border border-white/10 bg-black/20 p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{label}</dt>
            <dd className="mt-1 text-sm leading-6 text-paper/75">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LinkList({ title, ids, base }: { title: string; ids: string[]; base: string }) {
  return (
    <section className="border border-white/10 bg-black/20 p-3">
      <h3 className="text-sm font-black">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {ids.map((id) => <Link key={id} className="border border-signal px-2 py-1 text-xs font-bold text-signal" to={`${base}/${id}`}>{id}</Link>)}
        {ids.length === 0 && <p className="text-xs text-paper/60">No links.</p>}
      </div>
    </section>
  );
}

function RecordList({ title, empty, rows }: { title: string; empty: string; rows: Array<[string, string, string | undefined]> }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.map(([primary, secondary, detail]) => (
          <article key={`${primary}-${secondary}`} className="border border-white/10 bg-black/20 p-3">
            <h3 className="font-black">{primary}</h3>
            <p className="mt-1 text-sm font-bold text-signal">{secondary || "Assignment pending"}</p>
            {detail && <p className="mt-2 text-sm leading-6 text-paper/65">{detail}</p>}
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-paper/60">{empty}</p>}
      </div>
    </section>
  );
}
