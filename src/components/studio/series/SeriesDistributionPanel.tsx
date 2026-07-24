import React, { useMemo, useState } from 'react';
import { Copy, ExternalLink, Globe, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import type { Book, SeriesEpisode, SeriesProject, SeriesSeason } from '../../../types';
import type { ProofOfPayment, PublicSeriesEpisode } from '../../../types/publicDistribution';
import type { SeriesPermission } from '../../../types/seriesProduction';
import { projectPublicSeries } from '../../../types/publicDistribution';
import {
  getPublisherProofsOfPayment, publishPublicEpisode, publishPublicSeason,
  reviewProofOfPaymentViaBackend, unpublishPublicEpisode,
  unpublishPublicSeason, unpublishPublicSeries, updatePublicSeries,
} from '../../../lib/publicDistributionFirestore';

interface Props {
  project: SeriesProject;
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[];
  books: Book[];
  authorize: (permission: SeriesPermission) => void;
}

export const SeriesDistributionPanel: React.FC<Props> = ({ project, seasons, episodes, books, authorize }) => {
  const [payments, setPayments] = useState<ProofOfPayment[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reviewNote, setReviewNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [prices, setPrices] = useState({ series: 0, currency: 'USD' });
  const bundle = useMemo(() => projectPublicSeries(project, seasons, episodes, books, {
    seriesPrice: prices.series, currency: prices.currency,
  }), [books, episodes, prices, project, seasons]);
  const publicUrl = `${location.origin}/?view=portal&series=${encodeURIComponent(project.id)}`;
  const run = async (operation: () => Promise<void>, success: string, permission: SeriesPermission = 'publish') => {
    setBusy(true); setMessage('');
    try { authorize(permission); await operation(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Distribution operation failed.'); }
    finally { setBusy(false); }
  };
  const loadPayments = () => void run(async () => setPayments(await getPublisherProofsOfPayment()), 'POP queue refreshed.', 'approve');
  const visiblePayments = payments.filter((item) =>
    (statusFilter === 'ALL' || item.status === statusFilter) &&
    `${item.readerPhone} ${item.transactionReference} ${item.seriesId} ${item.seasonId} ${item.episodeId}`
      .toLowerCase().includes(query.toLowerCase())
  );
  const publishEpisode = (episode: PublicSeriesEpisode, release: boolean) => {
    const next = { ...episode, releaseStatus: release ? 'released' as const : episode.releaseAt ? 'coming-soon' as const : 'locked' as const };
    return publishPublicEpisode(next);
  };

  return <div className="space-y-5">
    <section className="border border-[#d8dcdf] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-[#ff6321]">Public projection</p><h3 className="text-lg font-extrabold">Publishing & distribution</h3><p className="text-xs text-[#666]">Only the public whitelist is copied. Manuscripts, deadlines, continuity notes, secrets and signing material remain private.</p></div>{busy && <RefreshCw className="h-4 w-4 animate-spin" />}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Series pass price<input type="number" min={0} value={prices.series} onChange={(e) => setPrices({...prices,series:Number(e.target.value)})} className="mt-1 w-full border p-2" /></label><label className="text-xs font-bold">Currency<input value={prices.currency} onChange={(e) => setPrices({...prices,currency:e.target.value.toUpperCase()})} className="mt-1 w-full border p-2" /></label></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => void run(() => updatePublicSeries(bundle.series),'Series profile published.')} className="inline-flex items-center gap-1 bg-[#ff6321] px-3 py-2 text-xs font-bold text-white"><UploadCloud className="h-4 w-4" /> Publish Series Profile</button>
        <button onClick={() => void run(() => updatePublicSeries(bundle.series),'Public series updated.')} className="border px-3 py-2 text-xs font-bold">Update Public Series</button>
        <button onClick={() => window.confirm('Unpublish the public series profile?') && void run(() => unpublishPublicSeries(project.id),'Series unpublished.')} className="border border-red-300 px-3 py-2 text-xs font-bold text-red-700">Unpublish Series</button>
        <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border px-3 py-2 text-xs font-bold"><ExternalLink className="h-3.5 w-3.5" /> View Public Page</a>
        <button onClick={() => void navigator.clipboard.writeText(publicUrl).then(() => setMessage('Public link copied.'))} className="inline-flex items-center gap-1 border px-3 py-2 text-xs font-bold"><Copy className="h-3.5 w-3.5" /> Copy Public Link</button>
      </div>
      {message && <p role="status" className="mt-3 border bg-[#f7f8f8] p-3 text-xs">{message}</p>}
    </section>

    <section className="border border-[#d8dcdf] bg-white p-4"><h3 className="font-extrabold">Season publication</h3><div className="mt-3 grid gap-2">{bundle.seasons.map((season) => <div key={season.id} className="flex flex-wrap items-center justify-between gap-2 border p-3"><span className="text-sm font-bold">Season {season.seasonNumber}: {season.title}</span><div className="flex gap-2"><button onClick={() => void run(() => publishPublicSeason(season),'Season published.')} className="border px-2 py-1 text-xs font-bold">Publish Season</button><button onClick={() => void run(() => unpublishPublicSeason(project.id,season.id),'Season unpublished.')} className="border px-2 py-1 text-xs">Unpublish</button></div></div>)}</div></section>

    <section className="border border-[#d8dcdf] bg-white p-4"><h3 className="font-extrabold">Episode metadata & release</h3><div className="mt-3 grid gap-2">{bundle.episodes.map((episode) => <div key={episode.id} className="border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold">E{episode.episodeNumber} · {episode.title}</span><span className="text-[10px] font-bold uppercase">{episode.releaseStatus}</span></div><div className="mt-2 flex flex-wrap gap-2"><button onClick={() => void run(() => publishPublicEpisode(episode),'Episode metadata published.')} className="border px-2 py-1 text-xs font-bold">Publish Metadata</button><button onClick={() => void run(() => publishEpisode(episode,false),'Episode scheduled/locked.')} className="border px-2 py-1 text-xs">Schedule Episode</button><button disabled={!episode.bookId} onClick={() => void run(() => publishEpisode(episode,true),'Episode released.')} className="border px-2 py-1 text-xs disabled:opacity-40">Release Episode</button><button onClick={() => void run(() => unpublishPublicEpisode(project.id,episode.id),'Episode unpublished.')} className="border px-2 py-1 text-xs text-red-700">Unpublish</button></div></div>)}</div></section>

    <section className="border border-[#d8dcdf] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase text-[#ff6321]">Publisher-only</p><h3 className="font-extrabold">Proof of Payment dashboard</h3></div><button onClick={loadPayments} className="inline-flex items-center gap-1 border px-3 py-2 text-xs font-bold"><ShieldCheck className="h-4 w-4" /> Load queue</button></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px]"><input aria-label="Search POP queue" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search phone, transaction, series, season or episode" className="w-full border p-2 text-sm" /><select aria-label="POP status filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border p-2 text-sm"><option>ALL</option>{['submitted','under-review','verified','rejected','cancelled'].map((value)=><option key={value}>{value}</option>)}</select></div><textarea aria-label="POP review notes" value={reviewNote} onChange={(e)=>setReviewNote(e.target.value)} placeholder="Review notes or correction request" className="mt-2 w-full border p-2 text-sm" />
      <div className="mt-3 space-y-2">{visiblePayments.map((payment) => <article key={payment.id} className="border p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><strong>{payment.transactionReference} · {payment.readerPhone}</strong><span className="font-bold uppercase">{payment.status}</span></div><p className="mt-1">{payment.amount} {payment.currency} · {payment.scope}</p>{payment.audit.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-bold">Audit history ({payment.audit.length})</summary><ul className="mt-1 space-y-1">{payment.audit.map((entry,index)=><li key={`${entry.at}-${index}`}>{entry.at} · {entry.action} · {entry.actorId}{entry.note ? ` · ${entry.note}` : ''}</li>)}</ul></details>}<div className="mt-2 flex flex-wrap gap-2">{(['start-review','verify','reject','request-correction'] as const).map((action) => <button key={action} onClick={() => void run(async () => { await reviewProofOfPaymentViaBackend(payment.id,action,reviewNote); setPayments(await getPublisherProofsOfPayment()); },`POP action: ${action}`,'approve')} className="border px-2 py-1 capitalize">{action.replace('-',' ')}</button>)}</div></article>)}</div>
    </section>
  </div>;
};
