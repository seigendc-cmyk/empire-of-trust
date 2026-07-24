import type {
  IssuedDataPack, PackageDownloadAudit, PackageDownloadToken, PackageIssueRequest,
  ProofOfPayment, ProofOfPaymentStatus, PublicSeriesBundle, ReaderEntitlement,
} from '../types/publicDistribution';

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '');
const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export class DistributionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'DistributionError';
  }
}

export interface DistributionStore {
  publicBundles: Map<string, PublicSeriesBundle>;
  payments: Map<string, ProofOfPayment>;
  entitlements: Map<string, ReaderEntitlement>;
  packages: Map<string, IssuedDataPack>;
  downloads: PackageDownloadAudit[];
}

export const createDistributionStore = (): DistributionStore => ({
  publicBundles: new Map(),
  payments: new Map(),
  entitlements: new Map(),
  packages: new Map(),
  downloads: [],
});

export function publishSeriesProjection(store: DistributionStore, bundle: PublicSeriesBundle): PublicSeriesBundle {
  const safe = structuredClone(bundle);
  store.publicBundles.set(bundle.series.id, safe);
  return structuredClone(safe);
}

export function unpublishSeriesProjection(store: DistributionStore, seriesId: string): void {
  store.publicBundles.delete(seriesId);
}

export function submitProofOfPayment(
  store: DistributionStore,
  input: Omit<ProofOfPayment, 'id' | 'status' | 'submittedAt' | 'reviewerNotes' | 'audit'>
): ProofOfPayment {
  if ([...store.payments.values()].some((item) =>
    item.transactionReference.toLowerCase() === input.transactionReference.trim().toLowerCase() &&
    item.status !== 'cancelled'
  )) throw new DistributionError('duplicate-transaction', 'This transaction reference has already been submitted.');
  const bundle = store.publicBundles.get(input.seriesId);
  if (!bundle) throw new DistributionError('publication-missing', 'The publication is unavailable.');
  const target = input.scope === 'series'
    ? bundle.series
    : input.scope === 'season'
      ? bundle.seasons.find((item) => item.id === input.seasonId)
      : bundle.episodes.find((item) => item.id === input.episodeId);
  if (!target) throw new DistributionError('publication-missing', 'The selected publication is unavailable.');
  if ('releaseStatus' in target && target.releaseStatus !== 'released') {
    throw new DistributionError('unreleased', 'Payment cannot be submitted for unreleased content.');
  }
  if (input.currency !== target.currency) throw new DistributionError('wrong-currency', 'Payment currency does not match the publication.');
  if (input.amount < target.price) throw new DistributionError('wrong-amount', 'Payment amount is below the publication price.');
  const payment: ProofOfPayment = {
    ...structuredClone(input),
    id: uid('pop'),
    readerPhone: normalizePhone(input.readerPhone),
    transactionReference: input.transactionReference.trim(),
    status: 'submitted',
    submittedAt: nowIso(),
    reviewerNotes: '',
    audit: [{ action: 'submitted', actorId: input.readerId, at: nowIso(), note: '' }],
  };
  store.payments.set(payment.id, payment);
  return structuredClone(payment);
}

export function reviewProofOfPayment(
  store: DistributionStore,
  paymentId: string,
  status: Extract<ProofOfPaymentStatus, 'under-review' | 'verified' | 'rejected'>,
  actorId: string,
  note = '',
  entitlementOptions: { maxDevices?: number; expiresAt?: string } = {}
): { payment: ProofOfPayment; entitlement?: ReaderEntitlement } {
  const payment = store.payments.get(paymentId);
  if (!payment) throw new DistributionError('pop-missing', 'Proof of payment was not found.');
  if (!['submitted', 'under-review'].includes(payment.status)) {
    throw new DistributionError('invalid-pop-transition', 'This proof of payment is already final.');
  }
  payment.status = status;
  payment.reviewedAt = nowIso();
  payment.reviewedBy = actorId;
  payment.reviewerNotes = note;
  payment.audit.push({
    action: status === 'under-review' ? 'review-started' : status,
    actorId, at: nowIso(), note,
  });
  if (status !== 'verified') return { payment: structuredClone(payment) };
  const entitlement: ReaderEntitlement = {
    id: uid('ent'),
    readerId: payment.readerId,
    readerPhone: payment.readerPhone,
    type: payment.scope,
    seriesId: payment.seriesId,
    seasonId: payment.seasonId,
    episodeId: payment.episodeId,
    proofOfPaymentId: payment.id,
    status: 'active',
    maxDevices: entitlementOptions.maxDevices || 2,
    deviceIds: [],
    issuedAt: nowIso(),
    expiresAt: entitlementOptions.expiresAt,
  };
  store.entitlements.set(entitlement.id, entitlement);
  return { payment: structuredClone(payment), entitlement: structuredClone(entitlement) };
}

export function entitlementCoversEpisode(
  entitlement: ReaderEntitlement,
  episode: { seriesId: string; seasonId: string; id: string }
): boolean {
  return entitlement.seriesId === episode.seriesId && (
    entitlement.type === 'series' ||
    (entitlement.type === 'season' && entitlement.seasonId === episode.seasonId) ||
    (entitlement.type === 'episode' && entitlement.episodeId === episode.id)
  );
}

export function revokeEntitlement(
  store: DistributionStore, entitlementId: string, actorId: string, reason: string
): ReaderEntitlement {
  const entitlement = store.entitlements.get(entitlementId);
  if (!entitlement) throw new DistributionError('missing-entitlement', 'Entitlement was not found.');
  entitlement.status = 'revoked';
  entitlement.revokedAt = nowIso();
  entitlement.revokedBy = actorId;
  entitlement.revocationReason = reason;
  return structuredClone(entitlement);
}

export function reissueEntitlement(
  store: DistributionStore, entitlementId: string, actorId: string,
  options: { maxDevices?: number; expiresAt?: string } = {}
): ReaderEntitlement {
  const source = store.entitlements.get(entitlementId);
  if (!source) throw new DistributionError('missing-entitlement', 'Entitlement was not found.');
  if (!actorId) throw new DistributionError('publisher-required', 'Publisher approval is required.');
  const replacement: ReaderEntitlement = {
    ...structuredClone(source),
    id: uid('ent'),
    status: 'active',
    maxDevices: options.maxDevices || source.maxDevices,
    deviceIds: [],
    issuedAt: nowIso(),
    expiresAt: options.expiresAt,
    revokedAt: undefined,
    revokedBy: undefined,
    revocationReason: undefined,
  };
  store.entitlements.set(replacement.id, replacement);
  return structuredClone(replacement);
}

export function grantComplimentaryEntitlement(
  store: DistributionStore,
  input: Omit<ReaderEntitlement, 'id' | 'status' | 'deviceIds' | 'issuedAt' | 'proofOfPaymentId'>,
  publisherId: string
): ReaderEntitlement {
  if (!publisherId) throw new DistributionError('publisher-required', 'Publisher approval is required.');
  const entitlement: ReaderEntitlement = {
    ...structuredClone(input),
    id: uid('ent'),
    status: 'active',
    deviceIds: [],
    issuedAt: nowIso(),
  };
  store.entitlements.set(entitlement.id, entitlement);
  return structuredClone(entitlement);
}

export function revokeIssuedPackage(
  store: DistributionStore, packageId: string, actorId: string
): IssuedDataPack {
  const pack = store.packages.get(packageId);
  if (!pack) throw new DistributionError('missing-package', 'Issued package was not found.');
  pack.status = 'revoked';
  pack.revokedAt = nowIso();
  pack.revokedBy = actorId;
  return structuredClone(pack);
}

export interface ProtectedPackageIssuer {
  issueSignedPackage(input: {
    request: PackageIssueRequest;
    entitlement: ReaderEntitlement;
    episodeId: string;
    seriesId: string;
    seasonId: string;
  }): Promise<IssuedDataPack>;
  createShortLivedDownload(pack: IssuedDataPack): Promise<PackageDownloadToken>;
}

export async function requestSecurePackage(
  store: DistributionStore,
  request: PackageIssueRequest,
  readerId: string,
  issuer: ProtectedPackageIssuer
): Promise<PackageDownloadToken> {
  const reject = (code: string, message: string): never => {
    store.downloads.push({
      id: uid('download'), packageId: '', entitlementId: request.entitlementId,
      readerId, bookId: request.bookId, deviceId: request.deviceId,
      requestedAt: nowIso(), outcome: 'rejected', reason: code,
    });
    throw new DistributionError(code, message);
  };
  const entitlement = store.entitlements.get(request.entitlementId);
  if (!entitlement || entitlement.readerId !== readerId) return reject('missing-entitlement', 'Entitlement was not found.');
  if (entitlement.status === 'revoked') return reject('revoked-entitlement', 'Entitlement has been revoked.');
  if (entitlement.status === 'expired' || (entitlement.expiresAt && Date.parse(entitlement.expiresAt) <= Date.now())) {
    return reject('expired-entitlement', 'Entitlement has expired.');
  }
  if (normalizePhone(request.readerPhone) !== entitlement.readerPhone) return reject('wrong-phone', 'Phone binding does not match.');
  const bundle = store.publicBundles.get(entitlement.seriesId);
  const episode = bundle?.episodes.find((item) => item.bookId === request.bookId);
  if (!episode || episode.releaseStatus !== 'released') return reject('unreleased-episode', 'Episode is not released.');
  if (!entitlementCoversEpisode(entitlement, episode)) return reject('missing-entitlement', 'Entitlement does not cover this episode.');
  const payment = entitlement.proofOfPaymentId ? store.payments.get(entitlement.proofOfPaymentId) : undefined;
  if (payment && payment.status !== 'verified') return reject('unverified-pop', 'Verified proof of payment is required.');
  if (!entitlement.deviceIds.includes(request.deviceId)) {
    if (entitlement.deviceIds.length >= entitlement.maxDevices) return reject('device-limit', 'Maximum device limit reached.');
    entitlement.deviceIds.push(request.deviceId);
  }
  const pack = await issuer.issueSignedPackage({
    request, entitlement: structuredClone(entitlement), episodeId: episode.id,
    seriesId: episode.seriesId, seasonId: episode.seasonId,
  });
  if (pack.status === 'revoked') return reject('revoked-package', 'Package has been revoked.');
  if (!pack.checksum || !pack.signatureKeyId || !pack.storagePath.startsWith('protected-packages/')) {
    return reject('invalid-package', 'Issuer returned invalid protected package metadata.');
  }
  store.packages.set(pack.id, pack);
  const token = await issuer.createShortLivedDownload(pack);
  if (Date.parse(token.expiresAt) > Date.now() + 15 * 60_000) return reject('unsafe-token', 'Download token lifetime is too long.');
  store.downloads.push({
    id: uid('download'), packageId: pack.id, entitlementId: entitlement.id,
    readerId, bookId: request.bookId, deviceId: request.deviceId,
    requestedAt: nowIso(), outcome: 'issued', reason: '',
  });
  return token;
}

export class DevelopmentPackageIssuer implements ProtectedPackageIssuer {
  constructor(private readonly preIssuedPackages: Map<string, IssuedDataPack> = new Map()) {}
  async issueSignedPackage({ request }: { request: PackageIssueRequest }): Promise<IssuedDataPack> {
    const pack = this.preIssuedPackages.get(request.bookId);
    if (!pack) throw new DistributionError(
      'issuer-unavailable',
      'Development issuer has no pre-signed package. It never generates signatures or stores private keys.'
    );
    return structuredClone(pack);
  }
  async createShortLivedDownload(pack: IssuedDataPack): Promise<PackageDownloadToken> {
    return {
      packageId: pack.id,
      downloadUrl: `/emulator/protected-download/${encodeURIComponent(pack.id)}`,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      checksum: pack.checksum,
    };
  }
}

export async function requestPackageDownloadFromBackend(
  request: PackageIssueRequest,
  fetcher: typeof fetch = fetch
): Promise<PackageDownloadToken> {
  const response = await fetcher('/api/package-download-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(request),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new DistributionError(body.code || 'download-rejected', body.message || 'Package request rejected.');
  return body as PackageDownloadToken;
}
