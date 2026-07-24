import { describe, expect, it } from 'vitest';
import type { Book, SeriesEpisode, SeriesProject, SeriesSeason } from '../types';
import type { IssuedDataPack, PublicSeriesBundle, ReaderEntitlement } from '../types/publicDistribution';
import { projectPublicSeries } from '../types/publicDistribution';
import {
  createDistributionStore, DevelopmentPackageIssuer, DistributionError,
  entitlementCoversEpisode, publishSeriesProjection, requestSecurePackage,
  reviewProofOfPayment, submitProofOfPayment, unpublishSeriesProjection,
  reissueEntitlement, revokeEntitlement,
} from '../lib/publicDistribution';

const project = {
  id:'series-1', title:'Safe Series', subtitle:'Public subtitle', description:'Public description',
  genre:'Drama', subGenres:['Mystery'], targetAudience:'Adult', language:'en',
  publisherId:'publisher-1', continuityNotes:'NEVER PUBLIC', premise:'private premise',
} as unknown as SeriesProject;
const seasons = [
  { id:'season-1', seriesId:'series-1', seasonNumber:1, title:'One', subtitle:'', synopsis:'Season one', status:'active' },
  { id:'season-2', seriesId:'series-1', seasonNumber:2, title:'Two', subtitle:'', synopsis:'Season two', status:'planned' },
] as SeriesSeason[];
const episodes = [
  { id:'episode-1', seriesId:'series-1', seasonId:'season-1', episodeNumber:1, title:'Pilot', subtitle:'', logline:'Begin', synopsis:'Public when released', previousEpisodeRecap:'', nextEpisodeTeaser:'Next', linkedBookId:'book-1', status:'published', releaseDate:'2026-07-01', continuityObligations:['PRIVATE'] },
  { id:'episode-2', seriesId:'series-1', seasonId:'season-1', episodeNumber:2, title:'Future', subtitle:'', logline:'Soon', synopsis:'Private outline', previousEpisodeRecap:'Previously', nextEpisodeTeaser:'', linkedBookId:'book-2', status:'scheduled', releaseDate:'2099-01-01', continuityObligations:['PRIVATE'] },
  { id:'episode-3', seriesId:'series-1', seasonId:'season-2', episodeNumber:1, title:'Season Two', subtitle:'', logline:'Later', synopsis:'Private', previousEpisodeRecap:'', nextEpisodeTeaser:'', linkedBookId:'book-3', status:'planned', continuityObligations:['PRIVATE'] },
] as SeriesEpisode[];
const books = [
  { id:'book-1', title:'Pilot', price:5, isPublished:true, chapters:[{ id:'c', title:'Private manuscript', blocks:[] }] },
  { id:'book-2', title:'Future', price:5, isPublished:false, chapters:[{ id:'c2', title:'Secret', blocks:[] }] },
] as unknown as Book[];

const bundle = (): PublicSeriesBundle => projectPublicSeries(project,seasons,episodes,books,{
  seriesPrice:20, seasonPrices:{'season-1':10,'season-2':12},
  episodePrices:{'episode-1':5,'episode-2':5,'episode-3':6}, currency:'USD',
});
const paymentInput = () => ({
  readerId:'reader-1', readerPhone:'+263 77 000 0000', scope:'episode' as const,
  seriesId:'series-1', seasonId:'season-1', episodeId:'episode-1', bookId:'book-1',
  amount:5, currency:'USD', paymentMethod:'bank', transactionReference:'TX-001',
  receiptStoragePath:'pop-receipts/reader-1/pop/receipt.pdf',
});
const verifiedStore = () => {
  const store=createDistributionStore(); publishSeriesProjection(store,bundle());
  const pop=submitProofOfPayment(store,paymentInput());
  const result=reviewProofOfPayment(store,pop.id,'verified','verifier-1');
  return {store,pop:result.payment,entitlement:result.entitlement!};
};
const pack = (status:'active'|'revoked'='active'): IssuedDataPack => ({
  id:'pack-1',entitlementId:'ent',readerId:'reader-1',bookId:'book-1',
  seriesId:'series-1',seasonId:'season-1',episodeId:'episode-1',
  storagePath:'protected-packages/reader-1/pack-1/book.zip',checksum:'abc',
  signatureKeyId:'publisher-key-1',status,issuedAt:new Date().toISOString(),
  expiresAt:new Date(Date.now()+86400000).toISOString(),
});
const issuer = (value=pack()) => new DevelopmentPackageIssuer(new Map([['book-1',value]]));

describe('public series projection',()=>{
  it('1. publishes a safe series projection',()=>{const s=createDistributionStore();expect(publishSeriesProjection(s,bundle()).series.title).toBe('Safe Series');});
  it('2. excludes private data and manuscripts',()=>{const text=JSON.stringify(bundle());expect(text).not.toContain('NEVER PUBLIC');expect(text).not.toContain('Private manuscript');expect(text).not.toContain('continuityObligations');});
  it('3. publishes seasons',()=>expect(bundle().seasons).toHaveLength(2));
  it('4. publishes released episode metadata',()=>expect(bundle().episodes[0]).toMatchObject({releaseStatus:'released',bookId:'book-1'}));
  it('5. keeps coming-soon episodes non-downloadable',()=>expect(bundle().episodes[1]).toMatchObject({releaseStatus:'coming-soon',bookId:undefined,synopsis:''}));
  it('hides unfinished planned episode outlines entirely',()=>expect(bundle().episodes.some((item)=>item.id==='episode-3')).toBe(false));
  it('unpublishes the public projection without touching source data',()=>{const s=createDistributionStore();publishSeriesProjection(s,bundle());unpublishSeriesProjection(s,'series-1');expect(s.publicBundles.size).toBe(0);expect(project.title).toBe('Safe Series');});
});

describe('proof of payment and entitlements',()=>{
  it('6. submits POP',()=>{const s=createDistributionStore();publishSeriesProjection(s,bundle());expect(submitProofOfPayment(s,paymentInput()).status).toBe('submitted');});
  it('7. rejects duplicate transaction references',()=>{const s=createDistributionStore();publishSeriesProjection(s,bundle());submitProofOfPayment(s,paymentInput());expect(()=>submitProofOfPayment(s,{...paymentInput(),transactionReference:'tx-001'})).toThrowError(DistributionError);});
  it('8. rejects wrong amount',()=>{const s=createDistributionStore();publishSeriesProjection(s,bundle());expect(()=>submitProofOfPayment(s,{...paymentInput(),amount:4.99})).toThrow(/below/);});
  it('9. rejects wrong currency',()=>{const s=createDistributionStore();publishSeriesProjection(s,bundle());expect(()=>submitProofOfPayment(s,{...paymentInput(),currency:'ZAR'})).toThrow(/currency/);});
  it('10. verifies POP with audit',()=>expect(verifiedStore().pop.audit.at(-1)?.action).toBe('verified'));
  it('11. rejects POP without entitlement',()=>{const s=createDistributionStore();publishSeriesProjection(s,bundle());const p=submitProofOfPayment(s,paymentInput());const r=reviewProofOfPayment(s,p.id,'rejected','verifier','bad receipt');expect(r.entitlement).toBeUndefined();expect(r.payment.status).toBe('rejected');});
  it('12. creates entitlement only after verification',()=>expect(verifiedStore().entitlement.status).toBe('active'));
  it('13. creates no entitlement before verification',()=>{const s=createDistributionStore();publishSeriesProjection(s,bundle());submitProofOfPayment(s,paymentInput());expect(s.entitlements.size).toBe(0);});
  it('14. covers an episode entitlement',()=>expect(entitlementCoversEpisode(verifiedStore().entitlement,bundle().episodes[0])).toBe(true));
  it('15. covers a season entitlement',()=>{const e={...verifiedStore().entitlement,type:'season',seasonId:'season-1',episodeId:undefined} as ReaderEntitlement;expect(entitlementCoversEpisode(e,bundle().episodes[0])).toBe(true);});
  it('16. season passes cover future episodes in that season',()=>{const e={...verifiedStore().entitlement,type:'season',seasonId:'season-1',episodeId:undefined} as ReaderEntitlement;expect(entitlementCoversEpisode(e,bundle().episodes[1])).toBe(true);});
  it('supports deliberate entitlement revocation and clean reissue',()=>{const {store,entitlement}=verifiedStore();expect(revokeEntitlement(store,entitlement.id,'publisher','refund').status).toBe('revoked');const next=reissueEntitlement(store,entitlement.id,'publisher');expect(next.status).toBe('active');expect(next.deviceIds).toEqual([]);});
});

describe('secure package contract',()=>{
  const request=(entitlementId:string)=>({entitlementId,bookId:'book-1',readerPhone:'+263770000000',deviceId:'device-1'});
  it('17. blocks revoked entitlement',async()=>{const {store,entitlement}=verifiedStore();entitlement.status='revoked';store.entitlements.set(entitlement.id,entitlement);await expect(requestSecurePackage(store,request(entitlement.id),'reader-1',issuer())).rejects.toMatchObject({code:'revoked-entitlement'});});
  it('18. blocks expired entitlement',async()=>{const {store,entitlement}=verifiedStore();entitlement.expiresAt='2020-01-01T00:00:00Z';store.entitlements.set(entitlement.id,entitlement);await expect(requestSecurePackage(store,request(entitlement.id),'reader-1',issuer())).rejects.toMatchObject({code:'expired-entitlement'});});
  it('19. blocks wrong phone',async()=>{const {store,entitlement}=verifiedStore();await expect(requestSecurePackage(store,{...request(entitlement.id),readerPhone:'+1'},'reader-1',issuer())).rejects.toMatchObject({code:'wrong-phone'});});
  it('20. blocks excess devices',async()=>{const {store,entitlement}=verifiedStore();entitlement.maxDevices=1;entitlement.deviceIds=['old'];store.entitlements.set(entitlement.id,entitlement);await expect(requestSecurePackage(store,request(entitlement.id),'reader-1',issuer())).rejects.toMatchObject({code:'device-limit'});});
  it('21. issues a secure package request',async()=>{const {store,entitlement}=verifiedStore();expect((await requestSecurePackage(store,request(entitlement.id),'reader-1',issuer())).packageId).toBe('pack-1');});
  it('22. generates a short-lived URL',async()=>{const {store,entitlement}=verifiedStore();const token=await requestSecurePackage(store,request(entitlement.id),'reader-1',issuer());expect(Date.parse(token.expiresAt)-Date.now()).toBeLessThanOrEqual(15*60_000);expect(token.downloadUrl).not.toContain('firebasestorage.googleapis.com');});
  it('27. blocks a revoked package',async()=>{const {store,entitlement}=verifiedStore();await expect(requestSecurePackage(store,request(entitlement.id),'reader-1',issuer(pack('revoked')))).rejects.toMatchObject({code:'revoked-package'});});
  it('29. records download audits',async()=>{const {store,entitlement}=verifiedStore();await requestSecurePackage(store,request(entitlement.id),'reader-1',issuer());expect(store.downloads[0]).toMatchObject({outcome:'issued',readerId:'reader-1'});});
  it('development issuer never signs or invents a package',async()=>{await expect(new DevelopmentPackageIssuer().issueSignedPackage({request:request('e')} as never)).rejects.toMatchObject({code:'issuer-unavailable'});});
});
