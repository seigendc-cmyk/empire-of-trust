import { useEffect, useState } from "react";
import { getEpisodeSponsorForEpisode, trackAdImpression } from "../lib/advertisingRepository";
import type { EpisodeSponsor } from "../types";

export function EpisodeSponsorCard({ episodeId }: { episodeId?: string }) {
  const [sponsor, setSponsor] = useState<EpisodeSponsor | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEpisodeSponsorForEpisode(episodeId)
      .then((row) => {
        if (cancelled || !row) return;
        setSponsor(row);
        setShow(true);
        trackAdImpression({ campaignId: row.campaignId, advertiserId: row.advertiserId, placement: "episode_sponsor", entityId: episodeId, metadata: { episodeId } }).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  useEffect(() => {
    if (!show) return;
    const timeout = window.setTimeout(() => setShow(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [show]);

  if (!sponsor || !show) return null;

  return (
    <section className="surface border-app grid min-h-48 place-items-center border p-5 text-center">
      <div className="grid justify-items-center gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">This episode is brought to you by</p>
        <div className="grid h-20 w-20 place-items-center border border-signal bg-black/20">
          {sponsor.logoUrl ? <img className="h-full w-full object-cover" src={sponsor.logoUrl} alt="" loading="lazy" /> : <span className="text-xl font-black text-accent">DC</span>}
        </div>
        <div>
          <h2 className="text-2xl font-black text-app">{sponsor.sponsorName}</h2>
          <p className="mt-1 text-sm font-bold text-muted">{sponsor.industry}</p>
        </div>
        <p className="border border-success px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-success">{sponsor.tagline || "Verified Vendor"}</p>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Powered by Digital Commerce</p>
      </div>
    </section>
  );
}
