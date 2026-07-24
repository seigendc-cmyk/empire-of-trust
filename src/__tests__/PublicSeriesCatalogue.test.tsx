// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicSeriesBundle } from '../types/publicDistribution';

const fixture: PublicSeriesBundle = {
  series: {
    id:'series-1',title:'Public Saga',subtitle:'',description:'A safe public description',
    genre:'Drama',subGenres:[],targetAudience:'Adult',language:'en',publisherId:'publisher',
    coverUrl:'',bannerUrl:'',category:'Drama',price:20,currency:'USD',status:'published',
    publishedAt:'2026-07-24',updatedAt:'2026-07-24',
  },
  seasons:[{
    id:'season-1',seriesId:'series-1',seasonNumber:1,title:'Beginnings',subtitle:'',
    synopsis:'Public season',price:10,currency:'USD',status:'published',updatedAt:'2026-07-24',
  }],
  episodes:[{
    id:'episode-1',seriesId:'series-1',seasonId:'season-1',episodeNumber:1,title:'Arrival',
    subtitle:'',logline:'The story starts',synopsis:'Public synopsis',coverUrl:'',price:5,
    currency:'USD',releaseStatus:'released',bookId:'book-1',updatedAt:'2026-07-24',
  },{
    id:'episode-2',seriesId:'series-1',seasonId:'season-1',episodeNumber:2,title:'Tomorrow',
    subtitle:'',logline:'Coming later',synopsis:'',coverUrl:'',price:5,currency:'USD',
    releaseStatus:'coming-soon',releaseAt:'2099-01-01',updatedAt:'2026-07-24',
  }],
};

vi.mock('../lib/publicDistributionFirestore',()=>({
  fetchPublicSeriesCatalogue: vi.fn(async()=>[fixture.series]),
  fetchPublicSeriesBundle: vi.fn(async()=>fixture),
  getMyEntitlements: vi.fn(async()=>[]),
  getMyProofsOfPayment: vi.fn(async()=>[]),
  requestSecurePackageFromApi: vi.fn(),
  submitProofOfPaymentToFirestore: vi.fn(),
}));

import { PublicSeriesCatalogue } from '../components/portal/PublicSeriesCatalogue';

afterEach(()=>{document.body.innerHTML='';vi.clearAllMocks();});

describe('PublicSeriesCatalogue',()=>{
  it('28. renders catalogue, series landing, season navigation and locked release state',async()=>{
    const host=document.createElement('div');document.body.appendChild(host);
    const root=createRoot(host);
    await act(async()=>{root.render(<PublicSeriesCatalogue readerId="reader-1" readerPhone="+263770000000" />);});
    await act(async()=>{await Promise.resolve();});
    expect(host.textContent).toContain('Public Saga');
    const seriesButton=[...host.querySelectorAll('button')].find((button)=>button.textContent?.includes('Public Saga'))!;
    await act(async()=>{seriesButton.click();await Promise.resolve();});
    expect(host.textContent).toContain('Season 1: Beginnings');
    expect(host.textContent).toContain('Arrival');
    expect(host.textContent).toContain('Tomorrow');
    expect(host.textContent).toContain('coming-soon');
    root.unmount();
  });
});
