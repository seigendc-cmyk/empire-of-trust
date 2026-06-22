import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getAdvertisingAnalytics } from "../lib/advertisingRepository";

export default function VendorAdvertisingDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdvertisingAnalytics>> | null>(null);

  useEffect(() => {
    getAdvertisingAnalytics().then(setData);
  }, []);

  const visibilityScore = useMemo(() => {
    if (!data) return 0;
    return Math.min(100, data.totals.impressions * 2 + data.totals.clicks * 8 + data.totals.leads * 15);
  }, [data]);

  if (!data) return <LoadingState label="Loading vendor advertising..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Vendor Advertising" title="Business Visibility Dashboard" subtitle="Track premium discovery, leads, and marketplace engagement for sponsored placements." actions={[{ label: "Mall", to: "/mall" }, { label: "Advertising Desk", to: "/studio/advertising" }]} />
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Visibility Score" value={visibilityScore} />
        <Metric label="Impressions" value={data.totals.impressions} />
        <Metric label="Leads" value={data.totals.leads} />
        <Metric label="ROI Basis" value={`$${data.totals.revenue.toFixed(2)}`} />
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black text-app">Lead Statistics</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Contacts" value={data.totals.contactClicks} />
          <Metric label="WhatsApp" value={data.totals.whatsappClicks} />
          <Metric label="Phone Calls" value={data.totals.phoneClicks} />
        </div>
      </section>
      <section className="panel divide-y divide-white/10">
        {data.byCampaign.map((row) => {
          const campaign = data.campaigns.find((item) => item.id === row.campaignId);
          return (
            <div key={row.campaignId} className="p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">{campaign?.packageType || "Campaign"}</p>
              <h2 className="mt-1 text-xl font-black text-app">{campaign?.title || row.campaignId}</h2>
              <p className="mt-2 text-sm text-muted">{row.impressions} impressions / {row.clicks} clicks / {row.leads} leads</p>
            </div>
          );
        })}
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="surface-muted border-app border p-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">{label}</p><p className="mt-2 text-2xl font-black text-app">{value}</p></div>;
}
