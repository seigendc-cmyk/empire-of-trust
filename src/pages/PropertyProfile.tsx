import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { MediaReferencePanel } from "../components/MediaReferencePanel";
import { ErrorState, LoadingState } from "../components/States";
import { getPropertyContext } from "../lib/propertyRepository";
import { listScenes } from "../lib/sceneRepository";
import type {
  EotProperty,
  EotPropertyAppearance,
  EotPropertyAssetRecord,
  EotPropertyOwnership,
  EotPropertyRelationship,
  EotPropertyTenant,
  EotPropertyValuation,
  EotScene,
} from "../types";

type View = "overview" | "ownership" | "tenants" | "valuation" | "assets" | "episodes";

export default function PropertyProfile({ view = "overview" }: { view?: View }) {
  const { propertyId } = useParams();
  const [context, setContext] = useState<Awaited<ReturnType<typeof getPropertyContext>> | null>(null);
  const [scenes, setScenes] = useState<EotScene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    Promise.all([getPropertyContext(propertyId), listScenes()])
      .then(([propertyContext, sceneRows]) => {
        setContext(propertyContext);
        setScenes(sceneRows.filter((scene) => scene.propertyId === propertyId || scene.locationId === propertyId));
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <LoadingState label="Loading property profile..." />;
  if (!propertyId || !context?.property) return <ErrorState title="Property not found" message="This property is not available from Firestore or the local cache." />;

  const property = context.property;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={property.propertyCode || "Property"}
        title={property.name}
        subtitle={`${(property.propertyType || property.type).replaceAll("_", " ")} / ${property.location || "Location pending"} / ${property.status || "active"}`}
        actions={[{ label: "Edit", to: `/properties/${propertyId}/edit`, primary: true }, { label: "Directory", to: "/properties" }, { label: "Studio", to: "/studio/properties" }]}
      />
      <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Property sections">
        {[
          ["overview", "Overview"],
          ["ownership", "Ownership"],
          ["tenants", "Tenants"],
          ["valuation", "Valuation"],
          ["assets", "Assets"],
          ["episodes", "Episodes"],
        ].map(([key, label]) => (
          <Link key={key} className={`btn ${view === key ? "btn-primary" : ""}`} to={key === "overview" ? `/properties/${propertyId}` : `/properties/${propertyId}/${key}`}>{label}</Link>
        ))}
      </nav>
      {view === "overview" && <><Overview property={property} relationships={context.relationships} scenes={scenes} /><MediaReferencePanel entityType="property" entityId={propertyId} title="Gallery and production references" /></>}
      {view === "ownership" && <Ownership rows={context.ownership} />}
      {view === "tenants" && <Tenants rows={context.tenants} />}
      {view === "valuation" && <Valuations rows={context.valuations} />}
      {view === "assets" && <Assets rows={context.assets} />}
      {view === "episodes" && <Appearances rows={context.appearances} />}
    </section>
  );
}

function Overview({ property, relationships, scenes }: { property: EotProperty; relationships: EotPropertyRelationship[]; scenes: EotScene[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <section className="panel p-4">
        <div className="h-72 border border-white/10 bg-black/20">
          {property.imageUrl ? <img className="h-full w-full object-cover" src={property.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-lg font-black text-signal">{property.propertyCode || "PROP"}</div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {property.isFictional && <span className="status-badge border-signal text-signal">story asset</span>}
          {property.isProductionLocation && <span className="status-badge border-ledger text-ledger">production location</span>}
          {property.isCommercial && <span className="status-badge border-white/15 text-paper/65">commercial</span>}
          {property.isResidential && <span className="status-badge border-white/15 text-paper/65">residential</span>}
        </div>
      </section>
      <div className="grid gap-4">
        <Info title="Real estate profile" rows={[
          ["Description", property.description],
          ["Story role", property.storyRole],
          ["Zoning", property.zoning],
          ["Size", [property.sizeValue, property.sizeUnit].filter(Boolean).join(" ")],
        ]} />
        <Info title="Location" rows={[
          ["Country", property.country],
          ["Province", property.province],
          ["City", property.city],
          ["District", property.district],
          ["Suburb", property.suburb],
          ["Address", property.address],
          ["GPS", property.gpsLatitude || property.gpsLongitude ? `${property.gpsLatitude ?? ""}, ${property.gpsLongitude ?? ""}` : ""],
        ]} />
      </div>
      <section className="panel p-4 lg:col-span-2">
        <h2 className="text-xl font-black">Linked universe records</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <LinkList title="Character Owners" ids={property.ownerCharacterIds ?? []} base="/characters" />
          <LinkList title="Business Owners" ids={property.ownerBusinessIds ?? []} base="/businesses" />
          <LinkList title="Linked Businesses" ids={property.linkedBusinessIds ?? property.businessIds ?? []} base="/businesses" />
          <LinkList title="Linked Vehicles" ids={property.linkedVehicleIds ?? []} base="/vehicles" />
          <LinkList title="Linked Assets" ids={property.linkedAssetIds ?? []} base="/assets" />
        </div>
      </section>
      <section className="panel p-4 lg:col-span-2">
        <h2 className="text-xl font-black">Production integration</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <InfoCard label="Availability" value={property.isProductionLocation ? property.status || "active" : "not marked"} />
          <InfoCard label="Location notes" value={property.address || property.location || "pending"} />
          <InfoCard label="Linked scenes" value={property.isProductionLocation ? "scene-ready property" : "not assigned"} />
          <InfoCard label="Linked vehicles" value={(property.linkedVehicleIds ?? []).join(", ") || "none"} />
        </div>
        <p className="mt-3 text-sm leading-6 text-paper/60">
          Production can use this property as a filming location, scene setting, asset reference, and continuity object through the property ID and linked universe records.
        </p>
      </section>
      <section className="panel p-4 lg:col-span-2">
        <h2 className="text-xl font-black">Related properties</h2>
        <div className="mt-3 grid gap-2">
          {relationships.map((row) => {
            const other = row.propertyA === property.id ? row.propertyB : row.propertyA;
            return <Link key={row.id} className="border border-white/10 bg-black/20 p-3 text-sm font-bold text-paper/75" to={`/properties/${other}`}>{row.relationshipType.replaceAll("_", " ")} / {other}</Link>;
          })}
          {relationships.length === 0 && <p className="text-sm text-paper/60">No property relationships cached yet.</p>}
        </div>
      </section>
      <section className="panel p-4 lg:col-span-2">
        <h2 className="text-xl font-black">Scenes using this property</h2>
        <div className="mt-3 grid gap-2">
          {scenes.map((scene) => <Link key={scene.id} className="border border-white/10 bg-black/20 p-3 text-sm font-bold text-paper/75" to={`/studio/scenes/${scene.id}`}>{scene.sceneNumber}. {scene.title} / {scene.productionStatus}</Link>)}
          {scenes.length === 0 && <p className="text-sm text-paper/60">No scene usage cached yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Ownership({ rows }: { rows: EotPropertyOwnership[] }) {
  return <RecordList title="Ownership" empty="No ownership records cached yet." rows={rows.map((row) => ({ id: row.id, primary: `${row.ownerName || row.ownerId} / ${row.ownerType}`, secondary: `${row.ownershipPercentage}% / ${row.acquisitionMethod}`, detail: row.notes }))} />;
}

function Tenants({ rows }: { rows: EotPropertyTenant[] }) {
  return <RecordList title="Tenants and occupants" empty="No tenant records cached yet." rows={rows.map((row) => ({ id: row.id, primary: `${row.tenantName || row.tenantId} / ${row.tenantType}`, secondary: `${row.tenancyType} / ${row.status}`, detail: row.notes }))} />;
}

function Valuations({ rows }: { rows: EotPropertyValuation[] }) {
  return <RecordList title="Valuation history" empty="No valuation records cached yet." rows={rows.map((row) => ({ id: row.id, primary: `${row.currency} ${row.estimatedValue}`, secondary: `${row.valuationDate} / ${row.valuationSource}`, detail: row.notes }))} />;
}

function Assets({ rows }: { rows: EotPropertyAssetRecord[] }) {
  return <RecordList title="Property assets" empty="No property asset records cached yet." rows={rows.map((row) => ({ id: row.id, primary: row.assetName, secondary: `${row.assetType} / ${row.currency ?? ""} ${row.valueEstimate ?? ""}`, detail: row.notes }))} />;
}

function Appearances({ rows }: { rows: EotPropertyAppearance[] }) {
  return <RecordList title="Episode appearances" empty="No property appearances cached yet." rows={rows.map((row) => ({ id: row.id, primary: `S${row.seasonNumber}E${row.episodeNumber}${row.chapterNumber ? ` C${row.chapterNumber}` : ""}`, secondary: `${row.importance} / impact ${row.storyImpactScore}`, detail: row.sceneContext }))} />;
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{label}</p>
      <p className="mt-1 text-sm font-bold text-paper/75">{value}</p>
    </div>
  );
}

function RecordList({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; primary: string; secondary: string; detail?: string }> }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <article key={row.id} className="border border-white/10 bg-black/20 p-3">
            <h3 className="font-black">{row.primary}</h3>
            <p className="mt-1 text-sm font-bold text-signal">{row.secondary}</p>
            {row.detail && <p className="mt-2 text-sm leading-6 text-paper/65">{row.detail}</p>}
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-paper/60">{empty}</p>}
      </div>
    </section>
  );
}
