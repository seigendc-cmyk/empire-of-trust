import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRelatedAssets, listAssetPrompts } from "../lib/assetRepository";
import type { EotAsset, EotAssetPrompt } from "../types";

export function MediaReferencePanel({ entityType, entityId, title = "Media references" }: { entityType: string; entityId: string; title?: string }) {
  const [assets, setAssets] = useState<EotAsset[]>([]);
  const [prompts, setPrompts] = useState<EotAssetPrompt[]>([]);

  useEffect(() => {
    Promise.all([getRelatedAssets(entityType, entityId), listAssetPrompts()])
      .then(([assetRows, promptRows]) => {
        setAssets(assetRows);
        const assetIds = new Set(assetRows.map((asset) => asset.id));
        setPrompts(promptRows.filter((prompt) => prompt.assetId === entityId || (prompt.assetId ? assetIds.has(prompt.assetId) : false)));
      })
      .catch(() => undefined);
  }, [entityId, entityType]);

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm text-muted">{assets.length} assets / {prompts.length} linked prompts</p>
        </div>
        <Link className="btn" to="/studio/assets/upload">Add media</Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {assets.slice(0, 8).map((asset) => (
          <Link key={asset.id} to={`/studio/assets/${asset.id}`} className="border border-white/10 bg-black/20 p-3 hover:border-signal">
            <div className="aspect-[4/3] border border-white/10 bg-black/20">
              {asset.downloadUrl || asset.imageUrl ? <img className="h-full w-full object-cover" src={asset.downloadUrl || asset.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black uppercase text-signal">{asset.assetType}</div>}
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-signal">{asset.category} / {asset.status}</p>
            <h3 className="mt-1 line-clamp-2 font-black">{asset.title}</h3>
          </Link>
        ))}
      </div>
      {assets.length === 0 && <p className="mt-4 text-sm text-muted">No linked assets cached yet. Add related IDs on a media record to surface it here.</p>}
      {prompts.length > 0 && (
        <div className="mt-4 grid gap-2">
          {prompts.slice(0, 4).map((prompt) => (
            <Link key={prompt.id} to="/studio/assets/prompts" className="border border-white/10 bg-black/20 p-3 text-sm hover:border-signal">
              <span className="font-black">{prompt.title}</span>
              <span className="text-muted"> / {prompt.promptType} / {prompt.style}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
