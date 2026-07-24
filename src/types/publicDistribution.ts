import type { Book, SeriesEpisode, SeriesProject, SeriesSeason } from '../types';

export type PublicPublicationStatus = 'draft' | 'scheduled' | 'published' | 'unpublished';
export type PublicEpisodeReleaseStatus = 'locked' | 'coming-soon' | 'released' | 'unpublished';
export type PurchaseScope = 'episode' | 'season' | 'series';
export type ProofOfPaymentStatus = 'submitted' | 'under-review' | 'verified' | 'rejected' | 'cancelled';
export type EntitlementStatus = 'active' | 'expired' | 'revoked';
export type PackageStatus = 'active' | 'revoked';

export interface PublicSeries {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  genre: string;
  subGenres: string[];
  targetAudience: string;
  language: string;
  publisherId: string;
  coverUrl: string;
  bannerUrl: string;
  category: string;
  price: number;
  currency: string;
  status: PublicPublicationStatus;
  publishedAt?: string;
  updatedAt: string;
}

export interface PublicSeriesSeason {
  id: string;
  seriesId: string;
  seasonNumber: number;
  title: string;
  subtitle: string;
  synopsis: string;
  price: number;
  currency: string;
  status: PublicPublicationStatus;
  publishedAt?: string;
  updatedAt: string;
}

export interface PublicSeriesEpisode {
  id: string;
  seriesId: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  subtitle: string;
  logline: string;
  synopsis: string;
  coverUrl: string;
  price: number;
  currency: string;
  releaseStatus: PublicEpisodeReleaseStatus;
  releaseAt?: string;
  bookId?: string;
  previousEpisodeRecap?: string;
  nextEpisodeTeaser?: string;
  updatedAt: string;
}

export interface ProofOfPaymentAudit {
  action: 'submitted' | 'review-started' | 'verified' | 'rejected' | 'correction-requested' | 'cancelled';
  actorId: string;
  at: string;
  note: string;
}

export interface ProofOfPayment {
  id: string;
  readerId: string;
  readerPhone: string;
  scope: PurchaseScope;
  seriesId: string;
  seasonId?: string;
  episodeId?: string;
  bookId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionReference: string;
  receiptStoragePath?: string;
  status: ProofOfPaymentStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerNotes: string;
  complimentaryApprovedBy?: string;
  audit: ProofOfPaymentAudit[];
}

export interface ReaderEntitlement {
  id: string;
  readerId: string;
  readerPhone: string;
  type: PurchaseScope;
  seriesId: string;
  seasonId?: string;
  episodeId?: string;
  proofOfPaymentId?: string;
  status: EntitlementStatus;
  maxDevices: number;
  deviceIds: string[];
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

export interface PackageIssueRequest {
  entitlementId: string;
  bookId: string;
  readerPhone: string;
  deviceId: string;
}

export interface IssuedDataPack {
  id: string;
  entitlementId: string;
  readerId: string;
  bookId: string;
  seriesId: string;
  seasonId: string;
  episodeId: string;
  storagePath: string;
  checksum: string;
  signatureKeyId: string;
  status: PackageStatus;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
}

export interface PackageDownloadToken {
  packageId: string;
  downloadUrl: string;
  expiresAt: string;
  checksum: string;
}

export interface PackageDownloadAudit {
  id: string;
  packageId: string;
  entitlementId: string;
  readerId: string;
  bookId: string;
  deviceId: string;
  requestedAt: string;
  outcome: 'issued' | 'rejected';
  reason: string;
}

export interface PublicSeriesBundle {
  series: PublicSeries;
  seasons: PublicSeriesSeason[];
  episodes: PublicSeriesEpisode[];
}

export interface PublicProjectionOptions {
  seriesPrice?: number;
  seasonPrices?: Record<string, number>;
  episodePrices?: Record<string, number>;
  currency?: string;
  category?: string;
  coverUrl?: string;
  bannerUrl?: string;
}

export function projectPublicSeries(
  project: SeriesProject,
  seasons: SeriesSeason[],
  episodes: SeriesEpisode[],
  books: Book[],
  options: PublicProjectionOptions = {}
): PublicSeriesBundle {
  const now = new Date().toISOString();
  const currency = options.currency || 'USD';
  const publicSeries: PublicSeries = {
    id: project.id,
    title: project.title,
    subtitle: project.subtitle,
    description: project.description,
    genre: project.genre,
    subGenres: [...project.subGenres],
    targetAudience: project.targetAudience,
    language: project.language,
    publisherId: project.publisherId,
    coverUrl: options.coverUrl || '',
    bannerUrl: options.bannerUrl || '',
    category: options.category || project.genre || 'General',
    price: options.seriesPrice || 0,
    currency,
    status: 'published',
    publishedAt: now,
    updatedAt: now,
  };
  const publicSeasons = seasons.map((season): PublicSeriesSeason => ({
    id: season.id,
    seriesId: project.id,
    seasonNumber: season.seasonNumber,
    title: season.title,
    subtitle: season.subtitle,
    synopsis: season.synopsis,
    price: options.seasonPrices?.[season.id] || 0,
    currency,
    status: 'published',
    publishedAt: now,
    updatedAt: now,
  }));
  const publicEpisodes = episodes
    .filter((episode) => ['ready', 'scheduled', 'published'].includes(episode.status))
    .map((episode): PublicSeriesEpisode => {
    const book = books.find((item) => item.id === episode.linkedBookId);
    const released = episode.status === 'published' && !!book?.isPublished;
    const scheduled = !released && !!episode.releaseDate;
    return {
      id: episode.id,
      seriesId: project.id,
      seasonId: episode.seasonId,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      subtitle: episode.subtitle,
      logline: episode.logline,
      synopsis: released ? episode.synopsis : '',
      coverUrl: '',
      price: options.episodePrices?.[episode.id] ?? book?.price ?? 0,
      currency,
      releaseStatus: released ? 'released' : scheduled ? 'coming-soon' : 'locked',
      releaseAt: episode.releaseDate || undefined,
      bookId: released ? episode.linkedBookId : undefined,
      previousEpisodeRecap: released ? episode.previousEpisodeRecap : undefined,
      nextEpisodeTeaser: released ? episode.nextEpisodeTeaser : undefined,
      updatedAt: now,
    };
    });
  return { series: publicSeries, seasons: publicSeasons, episodes: publicEpisodes };
}
