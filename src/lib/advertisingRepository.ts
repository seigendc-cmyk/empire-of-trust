import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { numberValue, stringValue } from "./forms";
import { getOrCreateReaderIdentity, readerDb } from "./offlineDb";
import type {
  Advertiser,
  AdvertisingCampaign,
  AdvertisingClick,
  AdvertisingImpression,
  AdvertisingPackage,
  AdvertisingPlacement,
  AdvertisingStatus,
  BusinessSpotlight,
  CampaignAnalytics,
  EpisodeSponsor,
} from "../types";

export const advertisingPackages: Array<{ id: AdvertisingPackage; title: string; features: string[] }> = [
  { id: "starter", title: "Starter Promotion", features: ["Category visibility boost"] },
  { id: "growth", title: "Growth Promotion", features: ["Featured listings", "Search boost"] },
  { id: "pro", title: "Pro Promotion", features: ["Homepage placement", "Spotlight inclusion"] },
  { id: "enterprise", title: "Enterprise Promotion", features: ["Homepage placement", "Spotlight inclusion", "Episode sponsorship", "Campaign scheduling", "Priority ranking"] },
];

export const advertisingPolicyRejectTerms = [
  "gambling",
  "casino",
  "adult",
  "political",
  "election",
  "get rich quick",
  "guaranteed returns",
  "illegal",
  "counterfeit",
  "ponzi",
  "fraud",
];

const collections = {
  advertisers: "advertisers",
  campaigns: "advertising_campaigns",
  impressions: "advertising_impressions",
  clicks: "advertising_clicks",
  spotlights: "business_spotlights",
  episodeSponsors: "episode_sponsors",
  analytics: "campaign_analytics",
} as const;

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isActiveWindow(startDate: string, endDate: string) {
  const day = todayKey();
  return (!startDate || startDate <= day) && (!endDate || endDate >= day);
}

function parseList(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function normalizeStatus(value: unknown, fallback: AdvertisingStatus = "draft"): AdvertisingStatus {
  const candidate = String(value ?? fallback) as AdvertisingStatus;
  return ["draft", "review", "approved", "active", "paused", "rejected", "expired"].includes(candidate) ? candidate : fallback;
}

export function moderateAdvertisingCopy(input: string) {
  const normalized = input.toLowerCase();
  return advertisingPolicyRejectTerms.filter((term) => normalized.includes(term));
}

export function normalizeAdvertiser(input: Partial<Advertiser> & { id: string }): Advertiser {
  return {
    id: input.id,
    vendorId: input.vendorId || "",
    businessName: input.businessName || "Untitled advertiser",
    industry: input.industry || "Business services",
    location: input.location || "Zimbabwe",
    shortDescription: input.shortDescription || "",
    logoUrl: input.logoUrl || "",
    bannerUrl: input.bannerUrl || "",
    website: input.website || "",
    phone: input.phone || "",
    whatsapp: input.whatsapp || "",
    email: input.email || "",
    verified: Boolean(input.verified),
    status: normalizeStatus(input.status, "active"),
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
    createdBy: input.createdBy || "",
    audit: input.audit || {},
  };
}

export function normalizeCampaign(input: Partial<AdvertisingCampaign> & { id: string }): AdvertisingCampaign {
  const placementTypes = (input.placementTypes?.length ? input.placementTypes : ["marketplace_home"]) as AdvertisingPlacement[];
  const copy = [input.title, input.summary, input.targetCategory].join(" ");
  const rejectReasons = moderateAdvertisingCopy(copy);
  return {
    id: input.id,
    advertiserId: input.advertiserId || "",
    vendorId: input.vendorId || "",
    title: input.title || "Untitled campaign",
    packageType: input.packageType || "starter",
    placementTypes,
    startDate: input.startDate || todayKey(),
    endDate: input.endDate || "",
    status: rejectReasons.length ? "rejected" : normalizeStatus(input.status, "review"),
    moderationStatus: rejectReasons.length ? "rejected" : input.moderationStatus || "pending",
    priority: Number(input.priority || 1),
    budget: Number(input.budget || 0),
    targetRegion: input.targetRegion || "Zimbabwe",
    targetCategory: input.targetCategory || "General",
    bannerUrl: input.bannerUrl || "",
    logoUrl: input.logoUrl || "",
    destinationUrl: input.destinationUrl || "",
    contactPhone: input.contactPhone || "",
    contactWhatsapp: input.contactWhatsapp || "",
    summary: input.summary || "",
    rejectionReason: input.rejectionReason || rejectReasons.join(", "),
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
    createdBy: input.createdBy || "",
    audit: input.audit || {},
  };
}

export function campaignInputFromForm(formData: FormData, idValue?: string): AdvertisingCampaign {
  return normalizeCampaign({
    id: idValue || id("ad_campaign"),
    advertiserId: stringValue(formData, "advertiserId").trim(),
    vendorId: stringValue(formData, "vendorId").trim(),
    title: stringValue(formData, "title").trim(),
    packageType: stringValue(formData, "packageType", "starter") as AdvertisingPackage,
    placementTypes: parseList(stringValue(formData, "placementTypes", "marketplace_home")) as AdvertisingPlacement[],
    startDate: stringValue(formData, "startDate").trim(),
    endDate: stringValue(formData, "endDate").trim(),
    status: stringValue(formData, "status", "review") as AdvertisingStatus,
    moderationStatus: stringValue(formData, "moderationStatus", "pending") as AdvertisingCampaign["moderationStatus"],
    priority: numberValue(formData, "priority", 1),
    budget: numberValue(formData, "budget", 0),
    targetRegion: stringValue(formData, "targetRegion", "Zimbabwe").trim(),
    targetCategory: stringValue(formData, "targetCategory", "General").trim(),
    bannerUrl: stringValue(formData, "bannerUrl").trim(),
    logoUrl: stringValue(formData, "logoUrl").trim(),
    destinationUrl: stringValue(formData, "destinationUrl").trim(),
    contactPhone: stringValue(formData, "contactPhone").trim(),
    contactWhatsapp: stringValue(formData, "contactWhatsapp").trim(),
    summary: stringValue(formData, "summary").trim(),
  });
}

export function advertiserInputFromForm(formData: FormData, idValue?: string): Advertiser {
  return normalizeAdvertiser({
    id: idValue || id("advertiser"),
    vendorId: stringValue(formData, "vendorId").trim(),
    businessName: stringValue(formData, "businessName").trim(),
    industry: stringValue(formData, "industry").trim(),
    location: stringValue(formData, "location", "Zimbabwe").trim(),
    shortDescription: stringValue(formData, "shortDescription").trim(),
    logoUrl: stringValue(formData, "logoUrl").trim(),
    bannerUrl: stringValue(formData, "bannerUrl").trim(),
    website: stringValue(formData, "website").trim(),
    phone: stringValue(formData, "phone").trim(),
    whatsapp: stringValue(formData, "whatsapp").trim(),
    email: stringValue(formData, "email").trim(),
    verified: formData.has("verified"),
    status: stringValue(formData, "status", "active") as AdvertisingStatus,
  });
}

const seedAdvertiser = normalizeAdvertiser({
  id: "seed-broadchem-industries",
  vendorId: "seed-broadchem-industries",
  businessName: "Broadchem Industries",
  industry: "Industrial Chemicals | Water Treatment",
  location: "Harare, Zimbabwe",
  shortDescription: "Verified industrial supply partner for water treatment, sanitation, and business operations.",
  logoUrl: "",
  bannerUrl: "",
  whatsapp: "+263000000000",
  verified: true,
  status: "active",
});

const seedCampaign = normalizeCampaign({
  id: "seed-broadchem-enterprise",
  advertiserId: seedAdvertiser.id,
  vendorId: seedAdvertiser.vendorId,
  title: "Broadchem Enterprise Spotlight",
  packageType: "enterprise",
  placementTypes: ["daily_spotlight", "episode_sponsor", "chapter_spotlight", "marketplace_home", "vendor_listing", "product_listing"],
  status: "active",
  moderationStatus: "approved",
  priority: 100,
  targetRegion: "Zimbabwe",
  targetCategory: "Industrial Chemicals",
  summary: seedAdvertiser.shortDescription,
  contactWhatsapp: seedAdvertiser.whatsapp,
});

function seedSpotlight(): BusinessSpotlight {
  return {
    id: "seed-broadchem-spotlight",
    campaignId: seedCampaign.id,
    advertiserId: seedAdvertiser.id,
    vendorId: seedAdvertiser.vendorId,
    businessName: seedAdvertiser.businessName,
    industry: seedAdvertiser.industry,
    location: seedAdvertiser.location,
    shortDescription: seedAdvertiser.shortDescription,
    bannerUrl: seedAdvertiser.bannerUrl,
    logoUrl: seedAdvertiser.logoUrl,
    verified: true,
    status: "active",
    priority: 100,
    startDate: todayKey(),
    endDate: "",
    createdAt: now(),
    updatedAt: now(),
  };
}

function seedSponsor(episodeId?: string): EpisodeSponsor {
  return {
    id: `seed-broadchem-sponsor-${episodeId || "global"}`,
    campaignId: seedCampaign.id,
    advertiserId: seedAdvertiser.id,
    episodeId,
    sponsorName: seedAdvertiser.businessName,
    industry: seedAdvertiser.industry,
    tagline: "Verified Vendor",
    logoUrl: seedAdvertiser.logoUrl,
    status: "active",
    priority: 100,
    startDate: todayKey(),
    endDate: "",
    createdAt: now(),
    updatedAt: now(),
  };
}

async function listFirestore<T>(collectionName: string, orderField = "updatedAt") {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured.");
  const snapshots = await getDocs(query(collection(db, collectionName), orderBy(orderField)));
  return snapshots.docs.map((snapshot) => withId<T>(snapshot));
}

export async function listAdvertisers() {
  try {
    const rows = (await listFirestore<Advertiser>(collections.advertisers, "businessName")).map(normalizeAdvertiser);
    if (rows.length) await readerDb.advertisers.bulkPut(rows);
    return rows.length ? rows : [seedAdvertiser];
  } catch {
    const cached = (await readerDb.advertisers.toArray()).map(normalizeAdvertiser);
    return cached.length ? cached : [seedAdvertiser];
  }
}

export async function getAdvertiser(advertiserId: string) {
  try {
    if (isFirebaseConfigured) {
      const snapshot = await getDoc(doc(db, collections.advertisers, advertiserId));
      if (snapshot.exists()) {
        const row = normalizeAdvertiser(withId<Advertiser>(snapshot));
        await readerDb.advertisers.put(row);
        return row;
      }
    }
  } catch {
    // local fallback below
  }
  return (await readerDb.advertisers.get(advertiserId)) ?? (advertiserId === seedAdvertiser.id ? seedAdvertiser : null);
}

export async function saveAdvertiser(input: Advertiser) {
  const row = normalizeAdvertiser({ ...input, updatedAt: now() });
  await readerDb.advertisers.put(row);
  if (isFirebaseConfigured) {
    const { id: rowId, ...payload } = row;
    await setDoc(doc(db, collections.advertisers, rowId), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
  }
  return row.id;
}

export async function listAdvertisingCampaigns() {
  try {
    const rows = (await listFirestore<AdvertisingCampaign>(collections.campaigns, "updatedAt")).map(normalizeCampaign);
    if (rows.length) await readerDb.advertisingCampaigns.bulkPut(rows);
    return rows.length ? rows : [seedCampaign];
  } catch {
    const cached = (await readerDb.advertisingCampaigns.toArray()).map(normalizeCampaign);
    return cached.length ? cached : [seedCampaign];
  }
}

export async function getAdvertisingCampaign(campaignId: string) {
  try {
    if (isFirebaseConfigured) {
      const snapshot = await getDoc(doc(db, collections.campaigns, campaignId));
      if (snapshot.exists()) {
        const row = normalizeCampaign(withId<AdvertisingCampaign>(snapshot));
        await readerDb.advertisingCampaigns.put(row);
        return row;
      }
    }
  } catch {
    // local fallback below
  }
  return (await readerDb.advertisingCampaigns.get(campaignId)) ?? (campaignId === seedCampaign.id ? seedCampaign : null);
}

export async function saveAdvertisingCampaign(input: AdvertisingCampaign) {
  const row = normalizeCampaign({ ...input, updatedAt: now() });
  await readerDb.advertisingCampaigns.put(row);
  if (isFirebaseConfigured) {
    const { id: rowId, ...payload } = row;
    await setDoc(doc(db, collections.campaigns, rowId), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
  }
  return row.id;
}

export async function setAdvertisingCampaignStatus(campaignId: string, status: AdvertisingStatus) {
  const campaign = await getAdvertisingCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  return saveAdvertisingCampaign({ ...campaign, status, updatedAt: now() });
}

export async function listActiveBusinessSpotlights() {
  try {
    if (isFirebaseConfigured) {
      const snapshots = await getDocs(query(collection(db, collections.spotlights), where("status", "==", "active")));
      const rows = snapshots.docs.map((snapshot) => withId<BusinessSpotlight>(snapshot)).filter((item) => isActiveWindow(item.startDate, item.endDate)).sort((a, b) => b.priority - a.priority);
      if (rows.length) await readerDb.businessSpotlights.bulkPut(rows);
      return rows.length ? rows : [seedSpotlight()];
    }
  } catch {
    // local fallback below
  }
  const cached = (await readerDb.businessSpotlights.toArray()).filter((item) => item.status === "active" && isActiveWindow(item.startDate, item.endDate)).sort((a, b) => b.priority - a.priority);
  return cached.length ? cached : [seedSpotlight()];
}

export async function getDailyBusinessSpotlight() {
  const rows = await listActiveBusinessSpotlights();
  return rows[0] ?? null;
}

export async function getEpisodeSponsorForEpisode(episodeId?: string) {
  try {
    if (isFirebaseConfigured) {
      const snapshots = await getDocs(query(collection(db, collections.episodeSponsors), where("status", "==", "active")));
      const rows = snapshots.docs.map((snapshot) => withId<EpisodeSponsor>(snapshot)).filter((item) => (!item.episodeId || item.episodeId === episodeId) && isActiveWindow(item.startDate, item.endDate)).sort((a, b) => b.priority - a.priority);
      if (rows.length) await readerDb.episodeSponsors.bulkPut(rows);
      return rows[0] ?? seedSponsor(episodeId);
    }
  } catch {
    // local fallback below
  }
  const cached = (await readerDb.episodeSponsors.toArray()).filter((item) => item.status === "active" && (!item.episodeId || item.episodeId === episodeId) && isActiveWindow(item.startDate, item.endDate)).sort((a, b) => b.priority - a.priority);
  return cached[0] ?? seedSponsor(episodeId);
}

export async function getChapterSpotlight() {
  const lastShown = Number(localStorage.getItem("eotChapterSpotlightLastShown") || 0);
  if (Date.now() - lastShown < 20 * 60 * 1000) return null;
  const spotlight = await getDailyBusinessSpotlight();
  return spotlight;
}

export function markChapterSpotlightShown() {
  localStorage.setItem("eotChapterSpotlightLastShown", String(Date.now()));
}

export function shouldShowDailySpotlight() {
  return localStorage.getItem("eotDailyBusinessSpotlightDate") !== todayKey();
}

export function markDailySpotlightShown() {
  localStorage.setItem("eotDailyBusinessSpotlightDate", todayKey());
  localStorage.setItem("eotDailyBusinessSpotlightShownAt", now());
}

export async function trackAdImpression(input: Omit<AdvertisingImpression, "id" | "readerId" | "createdAt" | "syncStatus">) {
  const reader = await getOrCreateReaderIdentity();
  const row: AdvertisingImpression = { ...input, id: id("ad_imp"), readerId: reader.readerId, createdAt: now(), syncStatus: "pending" };
  await readerDb.advertisingImpressions.put(row);
  if (isFirebaseConfigured && navigator.onLine) {
    try {
      await addDoc(collection(db, collections.impressions), { ...row, createdAt: serverTimestamp() });
      await readerDb.advertisingImpressions.update(row.id, { syncStatus: "synced" });
    } catch {
      await readerDb.advertisingImpressions.update(row.id, { syncStatus: "failed" });
    }
  }
  return row;
}

export async function trackAdClick(input: Omit<AdvertisingClick, "id" | "readerId" | "createdAt" | "syncStatus">) {
  const reader = await getOrCreateReaderIdentity();
  const row: AdvertisingClick = { ...input, id: id("ad_click"), readerId: reader.readerId, createdAt: now(), syncStatus: "pending" };
  await readerDb.advertisingClicks.put(row);
  if (isFirebaseConfigured && navigator.onLine) {
    try {
      await addDoc(collection(db, collections.clicks), { ...row, createdAt: serverTimestamp() });
      await readerDb.advertisingClicks.update(row.id, { syncStatus: "synced" });
    } catch {
      await readerDb.advertisingClicks.update(row.id, { syncStatus: "failed" });
    }
  }
  return row;
}

export async function getAdvertisingAnalytics(): Promise<{ campaigns: AdvertisingCampaign[]; advertisers: Advertiser[]; totals: CampaignAnalytics; byCampaign: CampaignAnalytics[] }> {
  const [campaigns, advertisers, impressions, clicks] = await Promise.all([
    listAdvertisingCampaigns(),
    listAdvertisers(),
    readerDb.advertisingImpressions.toArray(),
    readerDb.advertisingClicks.toArray(),
  ]);
  const campaignIds = new Set(campaigns.map((item) => item.id));
  const byCampaign = Array.from(campaignIds).map((campaignId) => {
    const campaign = campaigns.find((item) => item.id === campaignId);
    const campaignImpressions = impressions.filter((item) => item.campaignId === campaignId);
    const campaignClicks = clicks.filter((item) => item.campaignId === campaignId);
    return {
      id: campaignId,
      campaignId,
      advertiserId: campaign?.advertiserId,
      impressions: campaignImpressions.length,
      clicks: campaignClicks.length,
      modalViews: campaignImpressions.filter((item) => item.placement === "daily_spotlight").length,
      modalClosures: campaignClicks.filter((item) => item.action === "dismiss").length,
      profileVisits: campaignClicks.filter((item) => item.action === "view_business" || item.action === "profile_visit").length,
      contactClicks: campaignClicks.filter((item) => item.action === "contact_vendor").length,
      whatsappClicks: campaignClicks.filter((item) => item.action === "whatsapp").length,
      phoneClicks: campaignClicks.filter((item) => item.action === "phone").length,
      leads: campaignClicks.filter((item) => ["contact_vendor", "whatsapp", "phone", "lead"].includes(item.action)).length,
      revenue: Number(campaign?.budget || 0),
      updatedAt: now(),
    };
  });
  const total = byCampaign.reduce<CampaignAnalytics>((acc, item) => ({
    ...acc,
    impressions: acc.impressions + item.impressions,
    clicks: acc.clicks + item.clicks,
    modalViews: acc.modalViews + item.modalViews,
    modalClosures: acc.modalClosures + item.modalClosures,
    profileVisits: acc.profileVisits + item.profileVisits,
    contactClicks: acc.contactClicks + item.contactClicks,
    whatsappClicks: acc.whatsappClicks + item.whatsappClicks,
    phoneClicks: acc.phoneClicks + item.phoneClicks,
    leads: acc.leads + item.leads,
    revenue: acc.revenue + item.revenue,
  }), { id: "total", campaignId: "all", impressions: 0, clicks: 0, modalViews: 0, modalClosures: 0, profileVisits: 0, contactClicks: 0, whatsappClicks: 0, phoneClicks: 0, leads: 0, revenue: 0, updatedAt: now() });
  return { campaigns, advertisers, totals: total, byCampaign };
}
