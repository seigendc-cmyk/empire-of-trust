import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { assetCategories, assetTypes, collectAssetTags, searchAssets } from "../lib/assetRepository";
import type { EotAsset } from "../types";

const categoryLabel: Record<string, string> = {
  all: "All media",
  character: "Characters",
  actor: "Actors",
  business: "Businesses",
  property: "Properties",
  vehicle: "Vehicles",
  scene: "Scenes",
  episode: "Posters",
  season: "Posters",
  marketing: "Marketing",
  production: "Production",
};

export default function AssetLibrary({ category = "all", view = "library" }: { category?: string; view?: "library" | "posters" | "marketing" }) {
  const resolvedCategory = view === "posters" ? "episode" : view === "marketing" ? "marketing" : category;
  const [assets, setAssets] = useState<EotAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  useEffect(() => {
    setLoading(true);
    searchAssets(search, resolvedCategory, type).then(setAssets).finally(() => setLoading(false));
  }, [resolvedCategory, search, type]);

  const tags = useMemo(() => collectAssetTags(assets), [assets]);
  const title = categoryLabel[resolvedCategory] || "Media assets";

  if (loading) return <LoadingState label="Loading media library..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Asset Library"
        title={title}
        subtitle="Central media library for generated and manually uploaded Empire of Trust assets."
        actions={[
          { label: "Upload", to: "/studio/assets/upload", primary: true },
          { label: "Prompts", to: "/studio/assets/prompts" },
        ]}
      />
      <section className="panel grid gap-3 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_160px]">
          <input className="field" placeholder="Search title, tag, entity ID, asset type" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="field" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All asset types</option>
            {assetTypes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
          <select className="field" value={layout} onChange={(event) => setLayout(event.target.value as "grid" | "list")}>
            <option value="grid">Grid view</option>
            <option value="list">List view</option>
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all", ...assetCategories].map((item) => (
            <Link key={item} className={`btn shrink-0 ${resolvedCategory === item ? "btn-primary" : ""}`} to={item === "all" ? "/studio/assets/library" : `/studio/assets/${item === "episode" || item === "season" ? "posters" : `${item}s`}`}>
              {categoryLabel[item] || item}
            </Link>
          ))}
        </div>
        {tags.length > 0 && <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Tags: {tags.slice(0, 12).join(" / ")}</p>}
      </section>
      {assets.length === 0 ? (
        <EmptyState title="No assets found" message="Upload media or save generated prompt metadata to start building the library." />
      ) : layout === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
        </div>
      ) : (
        <div className="panel divide-y divide-white/10">
          {assets.map((asset) => (
            <Link key={asset.id} to={`/studio/assets/${asset.id}`} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[96px_1fr_auto]">
              <Thumb asset={asset} />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-signal">{asset.assetType?.replaceAll("_", " ")} / {asset.status}</p>
                <h2 className="mt-1 text-xl font-black">{asset.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{asset.description || "No description."}</p>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{asset.category}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function AssetCard({ asset }: { asset: EotAsset }) {
  return (
    <Link to={`/studio/assets/${asset.id}`} className="panel block overflow-hidden hover:border-signal">
      <Thumb asset={asset} large />
      <div className="grid gap-2 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-signal">{asset.category} / {asset.status}</p>
        <h2 className="line-clamp-2 text-lg font-black">{asset.title}</h2>
        <p className="line-clamp-2 text-sm leading-6 text-muted">{asset.description || asset.assetType?.replaceAll("_", " ")}</p>
        <div className="flex flex-wrap gap-2">
          {(asset.tags ?? []).slice(0, 4).map((tag) => <span key={tag} className="status-badge border-white/15 text-muted">{tag}</span>)}
        </div>
      </div>
    </Link>
  );
}

function Thumb({ asset, large = false }: { asset: EotAsset; large?: boolean }) {
  return (
    <div className={`${large ? "aspect-[4/3]" : "h-24"} border border-white/10 bg-black/20`}>
      {asset.downloadUrl || asset.imageUrl ? (
        <img className="h-full w-full object-cover" src={asset.downloadUrl || asset.imageUrl} alt="" />
      ) : (
        <div className="grid h-full place-items-center text-xs font-black uppercase tracking-[0.15em] text-signal">{asset.assetType || "asset"}</div>
      )}
    </div>
  );
}
