# Premium Advertising & Business Spotlight System

## Purpose

Advertising in Empire of Trust is treated as trusted business discovery inside the Digital Commerce ecosystem. Placements must feel like verified business recommendations, not disruptive network ads.

## Database Schema

Firestore collections:

- `advertisers`: vendor identity, business profile, logo/banner URLs, contact fields, verification, status, audit metadata.
- `advertising_campaigns`: package, placement types, schedule, budget, priority, target region/category, moderation state, creative URLs.
- `advertising_impressions`: local-first impression records synced opportunistically to Firestore.
- `advertising_clicks`: local-first lead/click/contact records synced opportunistically to Firestore.
- `business_spotlights`: approved daily and chapter spotlight records.
- `episode_sponsors`: approved sponsor records for global or episode-specific pre-roll cards.
- `campaign_analytics`: optional aggregate snapshots for admin reporting.

Dexie mirrors these tables with:

- `advertisers`
- `advertisingCampaigns`
- `advertisingImpressions`
- `advertisingClicks`
- `businessSpotlights`
- `episodeSponsors`
- `campaignAnalytics`

## Service Endpoints

This Firebase-only app does not add Express, Cloud Functions, or HTTP API endpoints. The service boundary is `src/lib/advertisingRepository.ts`.

Repository functions:

- `listAdvertisers`, `getAdvertiser`, `saveAdvertiser`
- `listAdvertisingCampaigns`, `getAdvertisingCampaign`, `saveAdvertisingCampaign`
- `setAdvertisingCampaignStatus`
- `getDailyBusinessSpotlight`, `getEpisodeSponsorForEpisode`, `getChapterSpotlight`
- `trackAdImpression`, `trackAdClick`
- `getAdvertisingAnalytics`

## Placements

- Daily Business Spotlight modal: once per local calendar day, auto-expires after five seconds, stored with `eotDailyBusinessSpotlightDate`.
- Episode Sponsor Card: shown before episode detail content for up to three seconds.
- Chapter Business Spotlight: shown only between chapters, no more than once every twenty minutes, suppressed for dialogue, emotional, romance, and cliffhanger chapter tones.
- Marketplace Labels: Featured, Sponsored, Verified, Premium Partner labels in mall home, vendor listings, product listings, category results, search results, and detail pages.

## Packages

- Starter Promotion: category visibility boost.
- Growth Promotion: featured listings and search boost.
- Pro Promotion: homepage placement and spotlight inclusion.
- Enterprise Promotion: homepage placement, spotlight inclusion, episode sponsorship, scheduling, and priority ranking.

## Moderation

Campaign copy is screened before save for blocked categories:

- gambling
- adult content
- political advertising
- fraudulent investment claims
- misleading claims
- illegal products

Only `approved` or `active` campaigns should be used for live placement. Firestore Security Rules should enforce who can create, approve, pause, and publish campaigns.

## Offline Strategy

- The app always remains usable if advertising cannot load.
- Seed campaign content provides a local fallback for UI testing.
- Impressions and clicks are written to Dexie first.
- Firestore writes are attempted only when Firebase is configured and the browser is online.
- Banners and logos use normal lazy-loaded images.
- Missing media falls back to lightweight text placeholders.

## Admin And Vendor Surfaces

- Admin Advertising Desk: `/studio/advertising`
- New/Edit Campaign: `/studio/advertising/new`, `/studio/advertising/:campaignId/edit`
- Admin Analytics: `/studio/advertising/analytics`
- Vendor Advertising Dashboard: `/vendor/advertising`

## Production Plan

1. Add Firestore Security Rules for the advertising collections.
2. Restrict campaign approval to `advertising.manage`.
3. Require advertiser verification before publishing.
4. Add Firebase Storage upload controls for logo and banner assets.
5. Replace local aggregate analytics with scheduled export or trusted admin aggregation when backend services are allowed.
