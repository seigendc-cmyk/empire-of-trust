import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getChapterSpotlight, markChapterSpotlightShown, trackAdClick, trackAdImpression } from "../lib/advertisingRepository";
import type { BusinessSpotlight } from "../types";

export function ChapterBusinessSpotlight({ disabled = false }: { disabled?: boolean }) {
  const [spotlight, setSpotlight] = useState<BusinessSpotlight | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    getChapterSpotlight()
      .then((row) => {
        if (cancelled || !row) return;
        setSpotlight(row);
        setShow(true);
        markChapterSpotlightShown();
        trackAdImpression({ campaignId: row.campaignId, advertiserId: row.advertiserId, placement: "chapter_spotlight", entityId: row.vendorId, metadata: { source: "chapter_transition" } }).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  if (!spotlight || !show) return null;

  const businessUrl = spotlight.vendorId ? `/mall/vendors/${spotlight.vendorId}` : `/mall/search?query=${encodeURIComponent(spotlight.businessName)}`;

  return (
    <section className="surface border-app grid gap-4 border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Business Spotlight</p>
          <h2 className="mt-1 text-xl font-black text-app">{spotlight.businessName}</h2>
        </div>
        <span className="border border-signal px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-signal">Featured Vendor</span>
      </div>
      {spotlight.bannerUrl && <img className="h-36 w-full border border-app object-cover" src={spotlight.bannerUrl} alt="" loading="lazy" />}
      <p className="text-sm leading-6 text-muted">{spotlight.shortDescription}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button className="btn btn-primary" type="button" onClick={() => setShow(false)}>Continue Story</button>
        <Link className="btn" to={businessUrl} onClick={() => trackAdClick({ campaignId: spotlight.campaignId, advertiserId: spotlight.advertiserId, placement: "chapter_spotlight", action: "view_business", entityId: spotlight.vendorId, metadata: { source: "chapter_transition" } }).catch(() => undefined)}>
          Explore Vendor
        </Link>
      </div>
    </section>
  );
}
