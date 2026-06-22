import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getAssetContext } from "../lib/assetRepository";
import type { EotAsset } from "../types";

export default function AssetDetail() {
  const { assetId } = useParams();
  const [context, setContext] = useState<Awaited<ReturnType<typeof getAssetContext>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assetId) return;
    getAssetContext(assetId).then(setContext).finally(() => setLoading(false));
  }, [assetId]);

  if (loading) return <LoadingState label="Loading asset..." />;
  if (!assetId || !context?.asset) return <ErrorState title="Asset not found" message="This asset is not available from Firestore or local cache." />;

  const asset = context.asset;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={asset.assetCode || asset.assetType || "Asset"}
        title={asset.title || asset.name}
        subtitle={`${asset.category || "production"} / ${asset.status || "draft"} / ${(asset.mimeType || "metadata").replaceAll("_", " ")}`}
        actions={[
          { label: "Edit", to: `/studio/assets/${asset.id}/edit`, primary: true },
          { label: "Library", to: "/studio/assets/library" },
          { label: "Prompts", to: "/studio/assets/prompts" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="panel p-4">
          <div className="aspect-[4/3] border border-white/10 bg-black/20">
            {asset.downloadUrl || asset.imageUrl ? <img className="h-full w-full object-cover" src={asset.downloadUrl || asset.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-sm font-black uppercase tracking-[0.15em] text-signal">{asset.assetType}</div>}
          </div>
          {asset.downloadUrl && <a className="btn mt-3 w-full" href={asset.downloadUrl} target="_blank" rel="noreferrer">Open media</a>}
        </section>
        <div className="grid gap-4">
          <Info title="Metadata" rows={[
            ["Description", asset.description],
            ["Asset type", asset.assetType],
            ["Category", asset.category],
            ["Storage path", asset.storagePath],
            ["File size", asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : ""],
            ["Dimensions", asset.width || asset.height ? `${asset.width || "?"} x ${asset.height || "?"}` : ""],
            ["Created by", asset.createdBy],
          ]} />
          <section className="panel p-4">
            <h2 className="text-xl font-black">Tags and links</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(asset.tags ?? []).map((tag) => <span key={tag} className="status-badge border-white/15 text-muted">{tag}</span>)}
              {(asset.tags ?? []).length === 0 && <p className="text-sm text-muted">No tags saved.</p>}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <LinkList title="Characters" ids={asset.relatedCharacterIds ?? []} base="/characters" />
              <LinkList title="Actors" ids={asset.relatedActorIds ?? []} base="/actors" />
              <LinkList title="Businesses" ids={asset.relatedBusinessIds ?? []} base="/businesses" />
              <LinkList title="Properties" ids={asset.relatedPropertyIds ?? []} base="/properties" />
              <LinkList title="Vehicles" ids={asset.relatedVehicleIds ?? []} base="/vehicles" />
              <LinkList title="Scenes" ids={asset.relatedSceneIds ?? []} base="/studio/scenes" />
            </div>
          </section>
        </div>
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        <Records title="Prompt library" empty="No prompts linked to this asset." rows={context.prompts.map((row) => [row.title, `${row.promptType} / ${row.style} / ${row.aspectRatio}`, row.promptText])} />
        <Records title="Version history" empty="No asset versions cached yet." rows={context.versions.map((row) => [`Version ${row.versionNumber}`, row.createdAt ? String(row.createdAt) : "", row.notes || row.downloadUrl])} />
        <Records title="Usage tracking" empty="No usage records cached yet." rows={context.usage.map((row) => [row.usedInType, row.usedInId, row.createdAt ? String(row.createdAt) : ""])} />
      </section>
    </section>
  );
}

function Info({ title, rows }: { title: string; rows: Array<[string, string | number | undefined]> }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <dl className="mt-3 grid gap-2">
        {rows.filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => (
          <div key={label} className="border border-white/10 bg-black/20 p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
            <dd className="mt-1 break-words text-sm leading-6 text-app">{value}</dd>
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
        {ids.length === 0 && <p className="text-xs text-muted">No links.</p>}
      </div>
    </section>
  );
}

function Records({ title, empty, rows }: { title: string; empty: string; rows: Array<[string, string, string]> }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 grid gap-3">
        {rows.map(([primary, secondary, detail]) => (
          <article key={`${primary}-${secondary}`} className="border border-white/10 bg-black/20 p-3">
            <h3 className="font-black">{primary}</h3>
            <p className="mt-1 text-sm font-bold text-signal">{secondary}</p>
            {detail && <p className="mt-2 line-clamp-4 break-words text-sm leading-6 text-muted">{detail}</p>}
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">{empty}</p>}
      </div>
    </section>
  );
}
