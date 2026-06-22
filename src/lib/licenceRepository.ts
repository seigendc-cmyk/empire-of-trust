import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { getOrCreateReaderIdentity, readerDb } from "./offlineDb";
import type {
  AgentActivationRequest,
  DeviceIdentity,
  EotActivationCode,
  EotAgent,
  EotScratchCard,
  EotScratchCardBatch,
  EotSubscriptionPlan,
  LicenceActivityLog,
  LicenceSource,
  LocalLicence,
  SubscriptionPlanCode,
} from "../types";

export const subscriptionPlans: EotSubscriptionPlan[] = [
  { id: "free", name: "Free", description: "Sample access and public reader features.", features: ["reader"], status: "placeholder" },
  { id: "reader", name: "Reader", description: "Episode packs and standard reader participation.", features: ["reader", "packs", "quizzes"], status: "placeholder" },
  { id: "premium", name: "Premium", description: "Premium content, assets, mall, and participation.", features: ["reader", "packs", "quizzes", "assets", "mall", "premium_content"], status: "placeholder" },
  { id: "studio", name: "Studio", description: "Studio authoring and publishing placeholder.", features: ["reader", "packs", "quizzes", "assets", "mall", "premium_content", "studio"], status: "placeholder" },
  { id: "enterprise", name: "Enterprise", description: "Enterprise partner access placeholder.", features: ["reader", "packs", "quizzes", "assets", "mall", "premium_content", "studio"], status: "placeholder" },
];

const planRank: Record<string, number> = { free: 0, reader: 1, premium: 2, studio: 3, enterprise: 4 };

function now() {
  return new Date().toISOString();
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function randomCode(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function featuresForPlan(plan: string) {
  return subscriptionPlans.find((item) => item.id === plan)?.features ?? ["reader", "packs"];
}

async function logLicenceActivity(eventType: string, metadata: Record<string, unknown> = {}, licenceId?: string) {
  const [reader, device] = await Promise.all([getOrCreateReaderIdentity(), getOrCreateDeviceIdentity()]);
  const log: LicenceActivityLog = {
    id: `liclog_${crypto.randomUUID()}`,
    readerId: reader.readerId,
    deviceId: device.deviceId,
    eventType,
    licenceId,
    metadata,
    createdAt: now(),
    syncStatus: "pending",
  };
  await readerDb.licenceActivityLog.put(log);
  return log;
}

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const existing = await readerDb.deviceIdentity.toCollection().first();
  const timestamp = now();
  if (existing) {
    const next = { ...existing, lastSeenAt: timestamp, platform: navigator.platform || existing.platform, userAgent: navigator.userAgent || existing.userAgent };
    await readerDb.deviceIdentity.put(next);
    return next;
  }
  const identity: DeviceIdentity = {
    deviceId: `device_${crypto.randomUUID()}`,
    createdAt: timestamp,
    lastSeenAt: timestamp,
    platform: navigator.platform || "web",
    userAgent: navigator.userAgent || "unknown",
  };
  await readerDb.deviceIdentity.put(identity);
  await logLicenceActivity("device_created", { platform: identity.platform });
  return identity;
}

export async function getActiveLocalLicence() {
  const licences = await readerDb.localLicences.toArray();
  const timestamp = Date.now();
  return licences
    .filter((licence) => {
      if (licence.status === "revoked" || licence.status === "invalid") return false;
      const expiry = Date.parse(licence.expiresAt || "");
      const grace = Date.parse(licence.graceExpiresAt || licence.expiresAt || "");
      return Number.isNaN(expiry) || timestamp <= Math.max(expiry, grace);
    })
    .sort((a, b) => (planRank[b.plan] ?? 0) - (planRank[a.plan] ?? 0) || Date.parse(b.expiresAt) - Date.parse(a.expiresAt))[0];
}

export async function canOpenPack(requiredLicencePlan?: string) {
  const required = (requiredLicencePlan || "free").toLowerCase();
  if (!required || required === "free" || required === "sample") return { allowed: true, licence: undefined, reason: "Free pack" };
  const licence = await getActiveLocalLicence();
  if (!licence) return { allowed: false, licence: undefined, reason: "No valid local licence found." };
  if ((planRank[licence.plan] ?? 0) >= (planRank[required] ?? 1)) return { allowed: true, licence, reason: "Local licence is valid." };
  return { allowed: false, licence, reason: `This pack requires ${required}. Current local plan is ${licence.plan}.` };
}

async function createLocalLicence(input: { phoneNumber: string; plan: string; source: LicenceSource; durationDays?: number; features?: string[]; remoteLicenceId?: string }) {
  const [reader, device] = await Promise.all([getOrCreateReaderIdentity(), getOrCreateDeviceIdentity()]);
  const licence: LocalLicence = {
    licenceId: input.remoteLicenceId ?? `lic_${crypto.randomUUID()}`,
    readerId: reader.readerId,
    deviceId: device.deviceId,
    phoneNumber: input.phoneNumber,
    plan: input.plan,
    status: "active",
    features: input.features?.length ? input.features : featuresForPlan(input.plan),
    issuedAt: now(),
    expiresAt: addDays(input.durationDays ?? 30),
    graceExpiresAt: addDays((input.durationDays ?? 30) + 7),
    source: input.source,
    syncStatus: "pending",
  };
  await readerDb.localLicences.put(licence);
  await logLicenceActivity("licence_created", { source: input.source, plan: input.plan }, licence.licenceId);
  return licence;
}

export async function activateWithCode(phoneNumber: string, activationCode: string) {
  const [reader, device] = await Promise.all([getOrCreateReaderIdentity(), getOrCreateDeviceIdentity()]);
  const attemptBase = {
    id: `act_${crypto.randomUUID()}`,
    readerId: reader.readerId,
    deviceId: device.deviceId,
    phoneNumber,
    activationCode,
    createdAt: now(),
  };
  try {
    const snapshots = await getDocs(query(collection(db, "eotActivationCodes"), where("activationCode", "==", activationCode.trim()), limit(1)));
    const codeDoc = snapshots.docs[0];
    if (!codeDoc) throw new Error("Activation code was not found.");
    const code = withId<EotActivationCode>(codeDoc);
    if (!["unused", "active"].includes(code.status)) throw new Error(`Activation code is ${code.status}.`);
    const licence = await createLocalLicence({ phoneNumber, plan: code.plan || "reader", source: "activation_code", durationDays: code.durationDays || 30, features: code.features });
    const remote = await addDoc(collection(db, "eotLicences"), { ...licence, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const nextLicence = { ...licence, licenceId: remote.id, syncStatus: "synced" as const };
    await readerDb.localLicences.delete(licence.licenceId);
    await readerDb.localLicences.put(nextLicence);
    await updateDoc(doc(db, "eotActivationCodes", codeDoc.id), {
      status: "redeemed",
      redeemedByReaderId: reader.readerId,
      redeemedByDeviceId: device.deviceId,
      phoneNumber,
      licenceId: remote.id,
      redeemedAt: serverTimestamp(),
    });
    await readerDb.activationAttempts.put({ ...attemptBase, status: "success", message: "Activation code redeemed." });
    await logLicenceActivity("activation_code_redeemed", { activationCode }, remote.id);
    return nextLicence;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Activation failed.";
    await readerDb.activationAttempts.put({ ...attemptBase, status: "failed", message });
    await logLicenceActivity("activation_code_failed", { activationCode, message });
    throw new Error(message);
  }
}

export async function activateWithScratchCard(phoneNumber: string, scratchCardCode: string) {
  const [reader, device] = await Promise.all([getOrCreateReaderIdentity(), getOrCreateDeviceIdentity()]);
  const attemptBase = {
    id: `scratch_${crypto.randomUUID()}`,
    readerId: reader.readerId,
    deviceId: device.deviceId,
    phoneNumber,
    scratchCardCode,
    createdAt: now(),
  };
  try {
    const snapshots = await getDocs(query(collection(db, "eotScratchCards"), where("scratchCardCode", "==", scratchCardCode.trim()), limit(1)));
    const cardDoc = snapshots.docs[0];
    if (!cardDoc) throw new Error("Scratch card was not found.");
    const card = withId<EotScratchCard>(cardDoc);
    if (card.status !== "unused") throw new Error(`Scratch card is ${card.status}.`);
    const licence = await createLocalLicence({ phoneNumber, plan: card.plan || "reader", source: "scratch_card", durationDays: card.durationDays || 30, features: card.features });
    const remote = await addDoc(collection(db, "eotLicences"), { ...licence, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const nextLicence = { ...licence, licenceId: remote.id, syncStatus: "synced" as const };
    await readerDb.localLicences.delete(licence.licenceId);
    await readerDb.localLicences.put(nextLicence);
    await updateDoc(doc(db, "eotScratchCards", cardDoc.id), {
      status: "redeemed",
      redeemedByReaderId: reader.readerId,
      redeemedByDeviceId: device.deviceId,
      phoneNumber,
      licenceId: remote.id,
      redeemedAt: serverTimestamp(),
    });
    await readerDb.scratchCardAttempts.put({ ...attemptBase, status: "success", message: "Scratch card redeemed." });
    await logLicenceActivity("scratch_card_redeemed", { scratchCardCode }, remote.id);
    return nextLicence;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scratch card activation failed.";
    await readerDb.scratchCardAttempts.put({ ...attemptBase, status: "failed", message });
    await logLicenceActivity("scratch_card_failed", { scratchCardCode, message });
    throw new Error(message);
  }
}

export async function requestAgentActivation(input: Omit<AgentActivationRequest, "id" | "status" | "createdAt" | "updatedAt" | "syncStatus">) {
  const request: AgentActivationRequest = {
    ...input,
    id: `agentreq_${crypto.randomUUID()}`,
    status: "pending",
    createdAt: now(),
    updatedAt: now(),
    syncStatus: "pending",
  };
  await readerDb.agentActivationRequests.put(request);
  try {
    const remote = await addDoc(collection(db, "eotAgentActivationRequests"), { ...request, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const synced = { ...request, id: remote.id, syncStatus: "synced" as const };
    await readerDb.agentActivationRequests.delete(request.id);
    await readerDb.agentActivationRequests.put(synced);
    return synced;
  } catch {
    return request;
  }
}

export async function getLicenceStatus() {
  const [reader, device, licences, activationAttempts, scratchCardAttempts, agentRequests, logs] = await Promise.all([
    getOrCreateReaderIdentity(),
    getOrCreateDeviceIdentity(),
    readerDb.localLicences.toArray(),
    readerDb.activationAttempts.toArray(),
    readerDb.scratchCardAttempts.toArray(),
    readerDb.agentActivationRequests.toArray(),
    readerDb.licenceActivityLog.toArray(),
  ]);
  const activeLicence = await getActiveLocalLicence();
  return {
    reader,
    device,
    activeLicence,
    licences: licences.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    activationAttempts: activationAttempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    scratchCardAttempts: scratchCardAttempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    agentRequests: agentRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    logs: logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export function buildWhatsAppHelpLink(input: { readerId: string; deviceId: string; phoneNumber?: string; licenceId?: string; issueType: string }) {
  const text = [
    "Empire of Trust licence help request",
    `ReaderID: ${input.readerId}`,
    `DeviceID: ${input.deviceId}`,
    `Phone: ${input.phoneNumber || "not provided"}`,
    `LicenceID: ${input.licenceId || "none"}`,
    "App version: 1.0.0",
    `Issue: ${input.issueType}`,
  ].join("\n");
  return `https://wa.me/27700000000?text=${encodeURIComponent(text)}`;
}

export async function createActivationCode(input: { activationCode?: string; plan: string; durationDays: number; features?: string[] }) {
  const code = input.activationCode?.trim() || randomCode("EOT");
  await addDoc(collection(db, "eotActivationCodes"), {
    activationCode: code,
    plan: input.plan,
    status: "unused",
    features: input.features?.length ? input.features : featuresForPlan(input.plan),
    durationDays: input.durationDays,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function createAgent(input: { agentCode?: string; name: string; phoneNumber: string }) {
  const agentCode = input.agentCode?.trim() || randomCode("RPN");
  await addDoc(collection(db, "eotAgents"), { agentCode, name: input.name, phoneNumber: input.phoneNumber, status: "active", createdAt: serverTimestamp() });
  return agentCode;
}

export async function createScratchCardBatch(input: { batchName: string; plan: string; quantity: number; durationDays: number }) {
  const batchRef = await addDoc(collection(db, "eotScratchCardBatches"), {
    batchName: input.batchName,
    plan: input.plan,
    quantity: input.quantity,
    status: "issued",
    createdAt: serverTimestamp(),
  });
  const batch = writeBatch(db);
  for (let index = 0; index < input.quantity; index += 1) {
    const cardRef = doc(collection(db, "eotScratchCards"));
    batch.set(cardRef, {
      scratchCardCode: randomCode("SCR"),
      batchId: batchRef.id,
      plan: input.plan,
      status: "unused",
      features: featuresForPlan(input.plan),
      durationDays: input.durationDays,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return batchRef.id;
}

export async function listStudioLicensingData() {
  const [licences, codes, cards, batches, agents, requests] = await Promise.all([
    getDocs(query(collection(db, "eotLicences"), orderBy("issuedAt", "desc"), limit(50))).catch(() => null),
    getDocs(query(collection(db, "eotActivationCodes"), orderBy("createdAt", "desc"), limit(50))).catch(() => null),
    getDocs(query(collection(db, "eotScratchCards"), orderBy("createdAt", "desc"), limit(50))).catch(() => null),
    getDocs(query(collection(db, "eotScratchCardBatches"), orderBy("createdAt", "desc"), limit(25))).catch(() => null),
    getDocs(query(collection(db, "eotAgents"), orderBy("createdAt", "desc"), limit(50))).catch(() => null),
    getDocs(query(collection(db, "eotAgentActivationRequests"), orderBy("createdAt", "desc"), limit(50))).catch(() => null),
  ]);
  return {
    licences: licences?.docs.map((item) => withId<LocalLicence>(item)) ?? [],
    codes: codes?.docs.map((item) => withId<EotActivationCode>(item)) ?? [],
    cards: cards?.docs.map((item) => withId<EotScratchCard>(item)) ?? [],
    batches: batches?.docs.map((item) => withId<EotScratchCardBatch>(item)) ?? [],
    agents: agents?.docs.map((item) => withId<EotAgent>(item)) ?? [],
    requests: requests?.docs.map((item) => withId<AgentActivationRequest>(item)) ?? [],
    plans: subscriptionPlans,
  };
}

export async function updateAgentActivationRequestStatus(requestId: string, status: AgentActivationRequest["status"]) {
  await updateDoc(doc(db, "eotAgentActivationRequests", requestId), { status, updatedAt: serverTimestamp() });
}
