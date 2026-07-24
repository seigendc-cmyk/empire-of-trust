import {
  collection, doc, getDoc, getDocs, query, where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import type {
  PackageDownloadToken, PackageIssueRequest, ProofOfPayment, PublicSeries,
  PublicSeriesBundle, PublicSeriesEpisode, PublicSeriesSeason, ReaderEntitlement,
} from '../types/publicDistribution';

const assertAuthenticated = () => {
  if (!auth.currentUser) throw new Error('Firebase Authentication is required.');
  return auth.currentUser;
};

async function runAuditedPublishingOperation<T>(
  action: string,
  entityType: string,
  entityId: string,
  mutation: Record<string, unknown>,
): Promise<T> {
  const user = assertAuthenticated();
  const response = await fetch('/api/staff/publishing', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({
      mutation,
      audit: {
        action,
        entityType,
        entityId,
        hierarchy: {
          seriesId: mutation.seriesId,
          seasonId: mutation.seasonId,
          episodeId: mutation.episodeId,
        },
        changedFields: ['status'],
        before: null,
        after: mutation,
        reason: 'Staff publishing action',
        source: 'staff-web',
      },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Audited publishing operation failed.');
  return body as T;
}

export async function uploadProofOfPaymentReceipt(file: File): Promise<string> {
  const user = assertAuthenticated();
  if (file.size > 10 * 1024 * 1024) throw new Error('Receipt must be smaller than 10 MB.');
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    throw new Error('Receipt must be an image or PDF.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `pop-receipts/${user.uid}/${crypto.randomUUID()}/${safeName}`;
  await uploadBytes(ref(getStorage(), path), file, { contentType: file.type });
  return path;
}

export async function publishPublicSeriesBundle(bundle: PublicSeriesBundle): Promise<void> {
  await runAuditedPublishingOperation('series.publish', 'series', bundle.series.id, {
    operation: 'publish-series-bundle', seriesId: bundle.series.id, bundle,
  });
}

export async function updatePublicSeries(series: PublicSeries): Promise<void> {
  await runAuditedPublishingOperation('series.publish', 'series', series.id, {
    operation: 'publish-series', seriesId: series.id, series,
  });
}

export async function unpublishPublicSeries(seriesId: string): Promise<void> {
  await runAuditedPublishingOperation('series.unpublish', 'series', seriesId, {
    operation: 'unpublish-series', seriesId,
  });
}

export async function publishPublicSeason(season: PublicSeriesSeason): Promise<void> {
  await runAuditedPublishingOperation('season.publish', 'season', season.id, {
    operation: 'publish-season', seriesId: season.seriesId, seasonId: season.id, season,
  });
}

export async function unpublishPublicSeason(seriesId: string, seasonId: string): Promise<void> {
  await runAuditedPublishingOperation('season.unpublish', 'season', seasonId, {
    operation: 'unpublish-season', seriesId, seasonId,
  });
}

export async function publishPublicEpisode(episode: PublicSeriesEpisode): Promise<void> {
  await runAuditedPublishingOperation('episode.publish', 'episode', episode.id, {
    operation: 'publish-episode', seriesId: episode.seriesId,
    seasonId: episode.seasonId, episodeId: episode.id, episode,
  });
}

export async function unpublishPublicEpisode(seriesId: string, episodeId: string): Promise<void> {
  await runAuditedPublishingOperation('episode.unpublish', 'episode', episodeId, {
    operation: 'unpublish-episode', seriesId, episodeId,
  });
}

export async function fetchPublicSeriesCatalogue(): Promise<PublicSeries[]> {
  const snapshot = await getDocs(query(collection(db, 'publicSeries'), where('status', '==', 'published')));
  return snapshot.docs.map((item) => item.data() as PublicSeries)
    .filter((item) => item.status === 'published');
}

export async function fetchPublicSeriesBundle(seriesId: string): Promise<PublicSeriesBundle | null> {
  const seriesSnapshot = await getDoc(doc(db, 'publicSeries', seriesId));
  if (!seriesSnapshot.exists()) return null;
  const [seasons, episodes] = await Promise.all([
    getDocs(query(collection(db, 'publicSeries', seriesId, 'seasons'), where('status', '==', 'published'))),
    getDocs(query(collection(db, 'publicSeries', seriesId, 'episodes'), where('releaseStatus', 'in', ['locked','coming-soon','released']))),
  ]);
  return {
    series: seriesSnapshot.data() as PublicSeries,
    seasons: seasons.docs.map((item) => item.data() as PublicSeriesSeason),
    episodes: episodes.docs.map((item) => item.data() as PublicSeriesEpisode),
  };
}

export async function submitProofOfPaymentToFirestore(
  payment: Omit<ProofOfPayment, 'id' | 'status' | 'submittedAt' | 'reviewerNotes' | 'audit'>
): Promise<ProofOfPayment> {
  const user = assertAuthenticated();
  if (payment.readerId !== user.uid) throw new Error('Reader identity does not match the authenticated user.');
  const response = await fetch('/api/pop-submit', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'POP submission was rejected.');
  return body as ProofOfPayment;
}

export async function getMyProofsOfPayment(readerId: string): Promise<ProofOfPayment[]> {
  const user = assertAuthenticated();
  if (readerId !== user.uid) throw new Error('Reader identity does not match the authenticated user.');
  const snapshot = await getDocs(query(collection(db, 'proofsOfPayment'), where('readerId', '==', readerId)));
  return snapshot.docs.map((item) => item.data() as ProofOfPayment);
}

export async function getMyEntitlements(readerId: string): Promise<ReaderEntitlement[]> {
  const user = assertAuthenticated();
  if (readerId !== user.uid) throw new Error('Reader identity does not match the authenticated user.');
  const snapshot = await getDocs(query(collection(db, 'readerEntitlements'), where('readerId', '==', readerId)));
  return snapshot.docs.map((item) => item.data() as ReaderEntitlement);
}

export async function getPublisherProofsOfPayment(): Promise<ProofOfPayment[]> {
  assertAuthenticated();
  const snapshot = await getDocs(collection(db, 'proofsOfPayment'));
  return snapshot.docs.map((item) => item.data() as ProofOfPayment);
}

export async function reviewProofOfPaymentViaBackend(
  paymentId: string,
  action: 'start-review' | 'verify' | 'reject' | 'request-correction',
  note: string
): Promise<{ payment: ProofOfPayment; entitlement?: ReaderEntitlement }> {
  assertAuthenticated();
  const response = await fetch('/api/pop-review', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, action, note }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'POP review was rejected by the server.');
  return body;
}

export async function requestSecurePackageFromApi(request: PackageIssueRequest): Promise<PackageDownloadToken> {
  assertAuthenticated();
  const response = await fetch('/api/package-download-request', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Secure package request was rejected.');
  return body as PackageDownloadToken;
}
