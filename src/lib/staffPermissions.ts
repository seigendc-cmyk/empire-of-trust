import { deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, collection } from "firebase/firestore";
import { ADMIN_EMAIL, db, isFirebaseConfigured } from "./firebase";

export const STUDIO_PERMISSIONS = [
  "studio.access",
  "staff.manage",
  "episodes.read",
  "episodes.write",
  "episodes.approve",
  "packs.build",
  "packs.publish",
  "reader.analytics.read",
  "licensing.read",
  "licensing.write",
  "agents.manage",
  "scratchcards.manage",
  "mall.read",
  "mall.write",
  "commerce.read",
  "commerce.write",
  "commerce.vendor.manage",
  "commerce.product.manage",
  "commerce.pack.build",
  "commerce.analytics.read",
  "assets.read",
  "assets.write",
  "assets.upload",
  "assets.delete",
  "assets.prompts.manage",
  "assets.publish",
  "story.read",
  "story.write",
  "production.read",
  "production.write",
  "console.analytics.read",
  "settings.manage",
  "library.read",
  "library.write",
  "library.publish",
  "library.analytics.read",
  "businesses.read",
  "businesses.write",
  "businesses.ownership.manage",
  "businesses.directors.manage",
  "businesses.assets.manage",
  "properties.read",
  "properties.write",
  "properties.ownership.manage",
  "properties.tenants.manage",
  "properties.valuation.manage",
  "properties.assets.manage",
  "vehicles.read",
  "vehicles.write",
  "vehicles.ownership.manage",
  "vehicles.usage.manage",
  "vehicles.maintenance.manage",
  "actors.read",
  "actors.write",
  "actors.media.manage",
  "casting.read",
  "casting.write",
  "casting.approve",
  "talent.notes.write",
  "talent.contracts.manage",
  "scenes.read",
  "scenes.write",
  "scenes.breakdown.manage",
  "scenes.cast.manage",
  "scenes.assets.manage",
  "scenes.schedule.manage",
  "scenes.continuity.manage",
  "production.planning.read",
  "production.planning.write",
  "timeline.read",
  "timeline.write",
  "continuity.read",
  "continuity.write",
  "continuity.resolve",
  "continuity.rules.manage",
] as const;

export type StudioPermission = (typeof STUDIO_PERMISSIONS)[number] | "*";
export type StaffDashboard = "dashboard" | "episodes" | "packs" | "licensing" | "agents" | "mall" | "assets" | "story" | "production" | "analytics" | "library";

export interface StudioStaff {
  email: string;
  displayName: string;
  role: string;
  active: boolean;
  permissions: StudioPermission[];
  dashboard: StaffDashboard;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudioAuditLog {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: unknown;
}

export const DASHBOARD_PERMISSION: Record<StaffDashboard, StudioPermission> = {
  dashboard: "studio.access",
  episodes: "episodes.read",
  packs: "packs.build",
  licensing: "licensing.read",
  agents: "agents.manage",
  mall: "mall.read",
  assets: "assets.read",
  story: "story.read",
  production: "production.read",
  analytics: "console.analytics.read",
  library: "library.read",
};

export const DASHBOARD_PATH: Record<StaffDashboard, string> = {
  dashboard: "/staff/dashboard",
  episodes: "/staff/episodes",
  packs: "/staff/packs",
  licensing: "/staff/licensing",
  agents: "/staff/agents",
  mall: "/staff/mall",
  assets: "/staff/assets",
  story: "/staff/story",
  production: "/staff/production",
  analytics: "/staff/analytics",
  library: "/staff/library",
};

export function normalizeStaffEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export function isSuperAdminEmail(email: string | null | undefined) {
  return normalizeStaffEmail(email) === normalizeStaffEmail(ADMIN_EMAIL);
}

export function superAdminStaff(email = ADMIN_EMAIL): StudioStaff {
  return {
    email: normalizeStaffEmail(email),
    displayName: "Super Admin",
    role: "super_admin",
    active: true,
    permissions: ["*"],
    dashboard: "dashboard",
  };
}

export function hasStudioPermission(staff: StudioStaff | null, permission: StudioPermission) {
  if (!staff || !staff.active) return false;
  return staff.permissions.includes("*") || staff.permissions.includes(permission);
}

export function defaultStaffDashboard(staff: StudioStaff | null) {
  if (!staff) return "/studio/login";
  if (staff.permissions.includes("*")) return "/studio";
  return DASHBOARD_PATH[staff.dashboard] ?? "/staff/dashboard";
}

export async function getStudioStaff(email: string) {
  const normalized = normalizeStaffEmail(email);
  if (!normalized) return null;
  if (isSuperAdminEmail(normalized)) return superAdminStaff(normalized);
  if (!isFirebaseConfigured) return null;
  const snapshot = await getDoc(doc(db, "studioStaff", normalized));
  if (!snapshot.exists()) return null;
  return { email: normalized, ...snapshot.data() } as StudioStaff;
}

export async function listStudioStaff() {
  if (!isFirebaseConfigured) return [];
  const snapshots = await getDocs(query(collection(db, "studioStaff"), orderBy("email")));
  return snapshots.docs.map((snapshot) => ({ email: snapshot.id, ...snapshot.data() }) as StudioStaff);
}

export async function saveStudioStaff(input: StudioStaff, actorEmail: string) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured.");
  const email = normalizeStaffEmail(input.email);
  if (!email) throw new Error("Staff email is required.");
  const existing = await getDoc(doc(db, "studioStaff", email));
  const staff: StudioStaff = {
    email,
    displayName: input.displayName.trim(),
    role: input.role.trim() || "staff",
    active: input.active,
    permissions: input.permissions,
    dashboard: input.dashboard,
  };
  await setDoc(doc(db, "studioStaff", email), {
    ...staff,
    createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logStudioAudit(actorEmail, existing.exists() ? "staff updated" : "staff created", "studioStaff", email, {
    role: staff.role,
    active: staff.active,
    permissions: staff.permissions,
    dashboard: staff.dashboard,
  });
  return staff;
}

export async function deactivateStudioStaff(email: string, actorEmail: string) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured.");
  const normalized = normalizeStaffEmail(email);
  await setDoc(doc(db, "studioStaff", normalized), { active: false, updatedAt: serverTimestamp() }, { merge: true });
  await logStudioAudit(actorEmail, "staff deactivated", "studioStaff", normalized);
}

export async function removeStudioStaff(email: string, actorEmail: string) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured.");
  const normalized = normalizeStaffEmail(email);
  await deleteDoc(doc(db, "studioStaff", normalized));
  await logStudioAudit(actorEmail, "staff access removed", "studioStaff", normalized);
}

export async function logStudioAudit(actorEmail: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  if (!isFirebaseConfigured) return;
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await setDoc(doc(db, "studioAuditLogs", id), {
    id,
    actorEmail: normalizeStaffEmail(actorEmail),
    action,
    targetType,
    targetId,
    metadata,
    createdAt: serverTimestamp(),
  });
}
