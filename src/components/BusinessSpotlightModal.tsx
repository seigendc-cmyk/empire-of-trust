import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getDailyBusinessSpotlight,
  markDailySpotlightShown,
  shouldShowDailySpotlight,
  trackAdClick,
  trackAdImpression,
} from "../lib/advertisingRepository";
import type { BusinessSpotlight } from "../types";

function whatsAppHref(number: string | undefined, message: string) {
  const clean = String(number ?? "").replace(/[^\d+]/g, "");
  return clean ? `https://wa.me/${clean.replace(/^\+/, "")}?text=${encodeURIComponent(message)}` : "";
}

export function BusinessSpotlightModal() {
  const location = useLocation();
  const [spotlight, setSpotlight] = useState<BusinessSpotlight | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname.startsWith("/studio/login")) return;
    if (!shouldShowDailySpotlight()) return;
    let cancelled = false;
    getDailyBusinessSpotlight()
      .then((row) => {
        if (cancelled || !row) return;
        setSpotlight(row);
        setVisible(true);
        markDailySpotlightShown();
        trackAdImpression({ campaignId: row.campaignId, advertiserId: row.advertiserId, placement: "daily_spotlight", entityId: row.vendorId, metadata: { source: "daily_modal" } }).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(() => {
      dismiss("auto_expired");
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!spotlight || !visible) return null;

  const businessUrl = spotlight.vendorId ? `/mall/vendors/${spotlight.vendorId}` : `/mall/search?query=${encodeURIComponent(spotlight.businessName)}`;
  const whatsappUrl = whatsAppHref(undefined, `Hello ${spotlight.businessName}, I discovered your business through Empire of Trust.`);

  function dismiss(action = "dismiss") {
    setVisible(false);
    if (spotlight) {
      trackAdClick({ campaignId: spotlight.campaignId, advertiserId: spotlight.advertiserId, placement: "daily_spotlight", action, entityId: spotlight.vendorId, metadata: { source: "daily_modal" } }).catch(() => undefined);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/55 p-3 backdrop-blur-sm sm:place-items-center">
      <section className="surface w-full max-w-lg border border-signal shadow-2xl animate-in fade-in slide-in-from-bottom-4">
        <div className="h-32 border-b border-app bg-black/30 sm:h-40">
          {spotlight.bannerUrl ? <img className="h-full w-full object-cover" src={spotlight.bannerUrl} alt="" loading="lazy" /> : <div className="grid h-full place-items-center text-sm font-black uppercase tracking-[0.18em] text-accent">Business Spotlight</div>}
        </div>
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <div className="h-16 border border-app bg-black/20">
              {spotlight.logoUrl ? <img className="h-full w-full object-cover" src={spotlight.logoUrl} alt="" loading="lazy" /> : <div className="grid h-full place-items-center text-xs font-black text-accent">DC</div>}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Daily Business Spotlight</p>
                {spotlight.verified && <span className="border border-success px-2 py-0.5 text-[0.68rem] font-black uppercase text-success">Verified</span>}
              </div>
              <h2 className="mt-1 text-xl font-black text-app">{spotlight.businessName}</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{spotlight.industry} / {spotlight.location}</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-muted">{spotlight.shortDescription}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link className="btn btn-primary" to={businessUrl} onClick={() => dismiss("view_business")}>View Business</Link>
            {whatsappUrl ? <a className="btn" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => dismiss("contact_vendor")}>Contact Vendor</a> : <Link className="btn" to={businessUrl} onClick={() => dismiss("contact_vendor")}>Contact Vendor</Link>}
            <button className="btn" type="button" onClick={() => dismiss("dismiss")}>Dismiss</button>
          </div>
        </div>
      </section>
    </div>
  );
}
