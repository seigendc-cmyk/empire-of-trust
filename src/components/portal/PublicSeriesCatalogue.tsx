import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, Download, Filter, Lock, Search } from 'lucide-react';
import type {
  ProofOfPayment, PublicSeries, PublicSeriesBundle, PublicSeriesEpisode, ReaderEntitlement,
} from '../../types/publicDistribution';
import {
  fetchPublicSeriesBundle, fetchPublicSeriesCatalogue, getMyEntitlements,
  getMyProofsOfPayment, requestSecurePackageFromApi, submitProofOfPaymentToFirestore,
  uploadProofOfPaymentReceipt,
} from '../../lib/publicDistributionFirestore';
import { getOrCreateDeviceId, hashBuffer } from '../../lib/dataPack';

interface Props {
  readerId?: string;
  readerPhone?: string;
  onPackageDownloaded?: (file: File) => Promise<void>;
}

export const PublicSeriesCatalogue: React.FC<Props> = ({ readerId, readerPhone = '', onPackageDownloaded }) => {
  const [catalogue, setCatalogue] = useState<PublicSeries[]>([]);
  const [bundle, setBundle] = useState<PublicSeriesBundle>();
  const [seasonId, setSeasonId] = useState('');
  const [episode, setEpisode] = useState<PublicSeriesEpisode>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [payments, setPayments] = useState<ProofOfPayment[]>([]);
  const [entitlements, setEntitlements] = useState<ReaderEntitlement[]>([]);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<File>();
  const [pop, setPop] = useState({ amount: '', currency: 'USD', method: '', reference: '', phone: readerPhone });

  useEffect(() => {
    void fetchPublicSeriesCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
    if (readerId) {
      void Promise.all([getMyProofsOfPayment(readerId), getMyEntitlements(readerId)])
        .then(([nextPayments, nextEntitlements]) => {
          setPayments(nextPayments);
          setEntitlements(nextEntitlements);
        }).catch(() => undefined);
    }
  }, [readerId]);

  const filtered = useMemo(() => catalogue.filter((item) =>
    (category === 'ALL' || item.category === category) &&
    `${item.title} ${item.description} ${item.genre}`.toLowerCase().includes(search.toLowerCase())
  ), [catalogue, category, search]);
  const selectedEpisodes = bundle?.episodes
    .filter((item) => !seasonId || item.seasonId === seasonId)
    .sort((a, b) => a.episodeNumber - b.episodeNumber) || [];
  const entitlementFor = (item: PublicSeriesEpisode) => entitlements.find((entitlement) =>
    entitlement.status === 'active' && entitlement.seriesId === item.seriesId &&
    (entitlement.type === 'series' ||
      (entitlement.type === 'season' && entitlement.seasonId === item.seasonId) ||
      (entitlement.type === 'episode' && entitlement.episodeId === item.id))
  );

  const submitPop = async () => {
    if (!readerId || !bundle || !episode) return setMessage('Sign in before submitting proof of payment.');
    try {
      const receiptStoragePath = receipt ? await uploadProofOfPaymentReceipt(receipt) : undefined;
      const payment = await submitProofOfPaymentToFirestore({
        readerId, readerPhone: pop.phone, scope: 'episode', seriesId: bundle.series.id,
        seasonId: episode.seasonId, episodeId: episode.id, bookId: episode.bookId,
        amount: Number(pop.amount), currency: pop.currency, paymentMethod: pop.method,
        transactionReference: pop.reference, receiptStoragePath,
      });
      setPayments((current) => [...current, payment]);
      setMessage('Proof of payment submitted for verification.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed.');
    }
  };

  const download = async (item: PublicSeriesEpisode) => {
    const entitlement = entitlementFor(item);
    if (!readerId || !entitlement || !item.bookId) return;
    try {
      const token = await requestSecurePackageFromApi({
        entitlementId: entitlement.id, bookId: item.bookId,
        readerPhone: entitlement.readerPhone, deviceId: getOrCreateDeviceId(),
      });
      const response = await fetch(token.downloadUrl);
      if (!response.ok) throw new Error('Protected package download failed.');
      const bytes = await (await response.blob()).arrayBuffer();
      if (await hashBuffer(bytes) !== token.checksum) throw new Error('Downloaded package checksum does not match issuance metadata.');
      const file = new File([bytes], `${item.title}.datapack.zip`, { type: 'application/zip' });
      await onPackageDownloaded?.(file);
      setMessage('Signed package downloaded and handed to the verified Reader import flow.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download failed.');
    }
  };

  if (bundle) return (
    <section className="border border-[#d8dcdf] bg-white p-4 sm:p-6">
      <button onClick={() => { setBundle(undefined); setEpisode(undefined); }} className="mb-4 inline-flex items-center gap-1 text-xs font-bold"><ArrowLeft className="h-4 w-4" /> Series catalogue</button>
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside><h2 className="text-2xl font-extrabold">{bundle.series.title}</h2><p className="mt-2 text-sm text-[#666]">{bundle.series.description}</p>
          <div className="mt-4 space-y-1">{bundle.seasons.sort((a,b) => a.seasonNumber-b.seasonNumber).map((season) =>
            <button key={season.id} onClick={() => setSeasonId(season.id)} className={`block w-full border px-3 py-2 text-left text-xs font-bold ${seasonId === season.id ? 'border-[#ff6321]' : 'border-[#ddd]'}`}>Season {season.seasonNumber}: {season.title}</button>)}</div>
        </aside>
        <div className="space-y-3">{selectedEpisodes.map((item) => {
          const owned = entitlementFor(item);
          const payment = payments.find((entry) => entry.episodeId === item.id);
          return <article key={item.id} className="border border-[#d8dcdf] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-[#ff6321]">Episode {item.episodeNumber}</p><h3 className="font-extrabold">{item.title}</h3><p className="mt-1 text-xs text-[#666]">{item.logline}</p></div>
              <span className="inline-flex items-center gap-1 text-xs font-bold">{item.releaseStatus === 'released' ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : item.releaseStatus === 'coming-soon' ? <CalendarClock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{owned ? 'Purchased' : item.releaseStatus}</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setEpisode(item)} disabled={item.releaseStatus !== 'released'} className="border px-3 py-1.5 text-xs font-bold disabled:opacity-40">Purchase / POP</button>
              {owned && <button onClick={() => void download(item)} className="inline-flex items-center gap-1 bg-[#24282c] px-3 py-1.5 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" /> Secure download</button>}
              {payment && <span className="px-2 py-1.5 text-xs">POP: {payment.status}</span>}
            </div>
          </article>;
        })}</div>
      </div>
      {episode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md bg-white p-5"><h3 className="font-extrabold">Submit POP · {episode.title}</h3><div className="mt-4 grid gap-3">
        <input aria-label="Reader phone" value={pop.phone} onChange={(e) => setPop({...pop,phone:e.target.value})} placeholder="Phone" className="border p-2 text-sm" />
        <input aria-label="Amount" value={pop.amount} onChange={(e) => setPop({...pop,amount:e.target.value})} placeholder={`Amount (${episode.price} ${episode.currency})`} className="border p-2 text-sm" />
        <input aria-label="Payment method" value={pop.method} onChange={(e) => setPop({...pop,method:e.target.value})} placeholder="Payment method" className="border p-2 text-sm" />
        <input aria-label="Transaction reference" value={pop.reference} onChange={(e) => setPop({...pop,reference:e.target.value})} placeholder="Transaction reference" className="border p-2 text-sm" />
        <label className="text-xs font-bold">Receipt image or PDF<input aria-label="Receipt attachment" type="file" accept="image/*,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0])} className="mt-1 block w-full border p-2 font-normal" /></label>
        <div className="flex gap-2"><button onClick={() => void submitPop()} className="bg-[#ff6321] px-3 py-2 text-xs font-bold text-white">Submit</button><button onClick={() => setEpisode(undefined)} className="border px-3 py-2 text-xs font-bold">Cancel</button></div>
      </div></div></div>}
      {message && <p role="status" className="mt-3 border p-3 text-xs">{message}</p>}
    </section>
  );

  const categories = ['ALL', ...new Set(catalogue.map((item) => item.category))];
  return <section className="border border-[#d8dcdf] bg-white p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-[#ff6321]">Public Series</p><h2 className="text-xl font-extrabold">Series catalogue</h2></div><div className="flex gap-2"><label className="flex items-center gap-1 border px-2"><Search className="h-4 w-4" /><input aria-label="Search series" value={search} onChange={(e) => setSearch(e.target.value)} className="p-2 text-xs outline-none" /></label><label className="flex items-center gap-1 border px-2"><Filter className="h-4 w-4" /><select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="p-2 text-xs">{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <button key={item.id} onClick={() => void fetchPublicSeriesBundle(item.id).then((next) => next && setBundle(next))} className="border border-[#d8dcdf] p-4 text-left hover:border-[#ff6321]"><h3 className="font-extrabold">{item.title}</h3><p className="mt-1 line-clamp-3 text-xs text-[#666]">{item.description}</p><p className="mt-3 text-[10px] font-bold uppercase">{item.category} · {item.price} {item.currency}</p></button>)}</div>
    {filtered.length === 0 && <p className="mt-4 border border-dashed p-6 text-center text-sm text-[#777]">No published series match these filters.</p>}
  </section>;
};
