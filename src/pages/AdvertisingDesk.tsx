import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import {
  advertiserInputFromForm,
  advertisingPackages,
  campaignInputFromForm,
  getAdvertiser,
  getAdvertisingAnalytics,
  getAdvertisingCampaign,
  listAdvertisers,
  listAdvertisingCampaigns,
  moderateAdvertisingCopy,
  saveAdvertiser,
  saveAdvertisingCampaign,
  setAdvertisingCampaignStatus,
} from "../lib/advertisingRepository";
import type { Advertiser, AdvertisingCampaign } from "../types";

export default function AdvertisingDesk({ view = "campaigns" }: { view?: "campaigns" | "new" | "analytics" }) {
  const { campaignId } = useParams();
  if (view === "new" || campaignId) return <CampaignEditor campaignId={campaignId} />;
  if (view === "analytics") return <AdvertisingAnalytics />;
  return <CampaignList />;
}

function CampaignList() {
  const [campaigns, setCampaigns] = useState<AdvertisingCampaign[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    Promise.all([listAdvertisingCampaigns(), listAdvertisers()])
      .then(([campaignRows, advertiserRows]) => {
        setCampaigns(campaignRows);
        setAdvertisers(advertiserRows);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  const advertiserLookup = useMemo(() => new Map(advertisers.map((item) => [item.id, item.businessName])), [advertisers]);

  if (loading) return <LoadingState label="Loading advertising desk..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Advertising Management"
        title="Premium Business Spotlight Desk"
        subtitle="Create, moderate, schedule, pause, and measure trusted business discovery inside EOT."
        actions={[{ label: "New Campaign", to: "/studio/advertising/new", primary: true }, { label: "Analytics", to: "/studio/advertising/analytics" }]}
      />
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Active" value={campaigns.filter((item) => item.status === "active").length} />
        <Metric label="Review" value={campaigns.filter((item) => item.status === "review").length} />
        <Metric label="Paused" value={campaigns.filter((item) => item.status === "paused").length} />
        <Metric label="Advertisers" value={advertisers.length} />
      </section>
      {campaigns.length === 0 ? <EmptyState title="No campaigns" message="Create a campaign to start testing premium placements." actionLabel="New Campaign" actionTo="/studio/advertising/new" /> : (
        <section className="panel divide-y divide-white/10">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
              <Link to={`/studio/advertising/${campaign.id}/edit`} className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">{campaign.packageType} / {campaign.status} / {campaign.moderationStatus}</p>
                <h2 className="mt-1 text-xl font-black text-app">{campaign.title}</h2>
                <p className="mt-1 text-sm text-muted">{advertiserLookup.get(campaign.advertiserId) || campaign.advertiserId || "Advertiser pending"} / {campaign.targetRegion} / {campaign.targetCategory}</p>
                {campaign.rejectionReason && <p className="mt-2 border border-danger bg-danger/10 p-2 text-xs font-bold text-danger">Moderation: {campaign.rejectionReason}</p>}
              </Link>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button className="btn" type="button" onClick={() => setAdvertisingCampaignStatus(campaign.id, "paused").then(refresh)}>Pause</button>
                <button className="btn" type="button" onClick={() => setAdvertisingCampaignStatus(campaign.id, "active").then(refresh)}>Resume</button>
                <button className="btn border-danger text-danger" type="button" onClick={() => setAdvertisingCampaignStatus(campaign.id, "rejected").then(refresh)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}

function CampaignEditor({ campaignId }: { campaignId?: string }) {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<AdvertisingCampaign | null>(null);
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [loading, setLoading] = useState(Boolean(campaignId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!campaignId) return;
    getAdvertisingCampaign(campaignId)
      .then(async (row) => {
        setCampaign(row);
        if (row?.advertiserId) setAdvertiser(await getAdvertiser(row.advertiserId));
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const advertiserRow = advertiserInputFromForm(form, advertiser?.id || campaign?.advertiserId);
    const campaignRow = campaignInputFromForm(form, campaign?.id);
    const rejectionTerms = moderateAdvertisingCopy([advertiserRow.businessName, advertiserRow.shortDescription, campaignRow.title, campaignRow.summary].join(" "));
    if (rejectionTerms.length) {
      setError(`Campaign rejected by moderation policy: ${rejectionTerms.join(", ")}.`);
      return;
    }
    const advertiserId = await saveAdvertiser(advertiserRow);
    const savedId = await saveAdvertisingCampaign({ ...campaignRow, advertiserId, vendorId: advertiserRow.vendorId, logoUrl: campaignRow.logoUrl || advertiserRow.logoUrl, bannerUrl: campaignRow.bannerUrl || advertiserRow.bannerUrl });
    navigate(`/studio/advertising/${savedId}/edit`);
  }

  if (loading) return <LoadingState label="Loading campaign..." />;
  if (campaignId && !campaign) return <ErrorState title="Campaign not found" />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Advertising Management" title={campaign ? "Edit campaign" : "New campaign"} subtitle="Only approved, brand-safe business campaigns can become visible placements." actions={[{ label: "Advertising", to: "/studio/advertising" }]} />
      <form className="panel grid gap-4 p-4" onSubmit={save}>
        {error && <p className="border border-danger bg-danger/10 p-3 text-sm font-bold text-danger">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="businessName" label="Business name" value={advertiser?.businessName} required />
          <Field name="vendorId" label="Vendor ID" value={advertiser?.vendorId || campaign?.vendorId} />
          <Field name="industry" label="Industry" value={advertiser?.industry} />
          <Field name="location" label="Location" value={advertiser?.location} />
          <Field name="logoUrl" label="Logo URL" value={campaign?.logoUrl || advertiser?.logoUrl} />
          <Field name="bannerUrl" label="Banner URL" value={campaign?.bannerUrl || advertiser?.bannerUrl} />
          <Field name="phone" label="Phone" value={advertiser?.phone || campaign?.contactPhone} />
          <Field name="whatsapp" label="WhatsApp" value={advertiser?.whatsapp || campaign?.contactWhatsapp} />
        </div>
        <Area name="shortDescription" label="Business short description" value={advertiser?.shortDescription || campaign?.summary} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="title" label="Campaign title" value={campaign?.title} required />
          <label className="grid gap-1 text-sm font-bold">Package<select className="field" name="packageType" defaultValue={campaign?.packageType || "starter"}>{advertisingPackages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <Field name="startDate" label="Start date" type="date" value={campaign?.startDate} />
          <Field name="endDate" label="End date" type="date" value={campaign?.endDate} />
          <Field name="priority" label="Priority" type="number" value={String(campaign?.priority ?? 1)} />
          <Field name="budget" label="Budget" type="number" value={String(campaign?.budget ?? 0)} />
          <Field name="targetRegion" label="Target region" value={campaign?.targetRegion || "Zimbabwe"} />
          <Field name="targetCategory" label="Target category" value={campaign?.targetCategory || "General"} />
        </div>
        <Area name="placementTypes" label="Placements" value={(campaign?.placementTypes ?? ["marketplace_home", "vendor_listing"]).join("\n")} />
        <Area name="summary" label="Campaign summary" value={campaign?.summary} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold">Status<select className="field" name="status" defaultValue={campaign?.status || "review"}>{["draft", "review", "approved", "active", "paused", "rejected", "expired"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-bold">Moderation<select className="field" name="moderationStatus" defaultValue={campaign?.moderationStatus || "pending"}>{["pending", "approved", "rejected"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm font-bold"><input name="verified" type="checkbox" defaultChecked={advertiser?.verified ?? true} /> Verified vendor</label>
        </div>
        <button className="btn btn-primary w-full sm:w-fit" type="submit">Save Campaign</button>
      </form>
    </section>
  );
}

function AdvertisingAnalytics() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdvertisingAnalytics>> | null>(null);
  useEffect(() => {
    getAdvertisingAnalytics().then(setData);
  }, []);
  if (!data) return <LoadingState label="Loading advertising analytics..." />;
  const ctr = data.totals.impressions ? ((data.totals.clicks / data.totals.impressions) * 100).toFixed(1) : "0.0";
  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Advertising Analytics" title="Campaign Performance" subtitle="Local-first impression, lead, and click analytics. Firestore sync is opportunistic." actions={[{ label: "Advertising", to: "/studio/advertising" }, { label: "Vendor Dashboard", to: "/vendor/advertising" }]} />
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Impressions" value={data.totals.impressions} />
        <Metric label="Clicks" value={data.totals.clicks} />
        <Metric label="CTR" value={`${ctr}%`} />
        <Metric label="Leads" value={data.totals.leads} />
      </section>
      <section className="panel divide-y divide-white/10">
        {data.byCampaign.map((row) => {
          const campaign = data.campaigns.find((item) => item.id === row.campaignId);
          return (
            <div key={row.campaignId} className="grid gap-2 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">{campaign?.packageType || "campaign"} / {campaign?.status || "local"}</p>
              <h2 className="text-xl font-black text-app">{campaign?.title || row.campaignId}</h2>
              <p className="text-sm text-muted">{row.impressions} impressions / {row.clicks} clicks / {row.leads} leads / ${row.revenue.toFixed(2)} revenue</p>
            </div>
          );
        })}
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="panel p-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">{label}</p><p className="mt-2 text-3xl font-black text-app">{value}</p></div>;
}

function Field({ name, label, value = "", type = "text", required = false }: { name: string; label: string; value?: string; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-bold">{label}<input className="field" name={name} type={type} defaultValue={value} required={required} /></label>;
}

function Area({ name, label, value = "" }: { name: string; label: string; value?: string }) {
  return <label className="grid gap-1 text-sm font-bold">{label}<textarea className="field min-h-28" name={name} defaultValue={value} /></label>;
}
