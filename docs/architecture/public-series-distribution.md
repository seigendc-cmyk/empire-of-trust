# Public Series, POP, Entitlement and Offline Distribution

## Purpose and trust boundary

This layer publishes a deliberately small projection of Series Studio data and distributes paid offline books without moving signing authority into the browser. The React application can publish metadata when the authenticated user has a Firebase `publisher` or `admin` custom claim, submit evidence, and request a package. It cannot verify payments, create entitlements, sign archives, write download logs, or read protected Storage objects directly.

Production signing belongs in Cloud Functions, Cloud Run, or a protected publisher service. No production private key may be placed in `src`, Vite environment variables, public assets, Firestore, or browser storage.

## Publication lifecycle and projection

Private SQLite records remain authoritative for planning. `projectPublicSeries` creates new objects by whitelisting fields:

- `publicSeries/{seriesId}` stores identity, description, public assets, category, price, currency and publication state.
- `publicSeries/{seriesId}/seasons/{seasonId}` stores public season identity, synopsis, price and state.
- `publicSeries/{seriesId}/episodes/{episodeId}` stores episode identity, safe marketing copy, price and release state.

The projector never spreads a Series Studio object into Firestore. Continuity obligations, deadlines, character secrets, outlines, private manuscripts, internal Story Bible fields and signing material are therefore absent. Synopsis, recap, teaser and `bookId` are projected only for a released, published linked book. Unpublishing removes the public projection; it does not delete the private project.

Release states are `locked`, `coming-soon`, `released`, and `unpublished`. Catalogue queries return only published series/seasons and explicitly public episode states.

## Proof of Payment workflow

`ProofOfPayment` contains reader UID/phone, purchase scope, target IDs, amount, currency, method, transaction reference, optional protected receipt path, status, reviewer fields and an append-only audit view.

1. An authenticated reader calls `POST /api/pop-submit`.
2. The service transaction reserves a normalized transaction-reference document before creating the POP record.
3. The service compares amount/currency with the current public publication and rejects unreleased targets.
4. A verifier/admin calls `POST /api/pop-review`.
5. `verified` creates one entitlement in the same backend transaction. `rejected` creates none.

The browser cannot write POP decisions or transaction-reference reservations. Receipt objects live under `pop-receipts/{readerUid}/...`; they are readable only by that reader and publishers. Complimentary access requires the backend to record publisher approval rather than fabricating a verified payment.

## Entitlements and season passes

`ReaderEntitlement` scopes access to an `episode`, `season`, or `series`, and records active/expired/revoked status, device IDs, maximum-device count and optional expiry/revocation fields.

An episode entitlement covers one episode. A season entitlement covers every released episode whose `seasonId` matches, including episodes released after purchase. A series entitlement covers every released episode in the series. Future episodes may be displayed as locked or coming soon, but their manuscript/book identifiers and packages remain inaccessible until release. Reissue does not silently reactivate a revoked entitlement; it creates or authorizes a deliberate server-side replacement.

## Package issuance and signing boundary

The browser sends:

```http
POST /api/package-download-request
Content-Type: application/json

{
  "entitlementId": "...",
  "bookId": "...",
  "readerPhone": "...",
  "deviceId": "..."
}
```

On success it receives `packageId`, a short-lived `downloadUrl`, `expiresAt`, and `checksum`.

The production issuer must:

1. authenticate the caller and load an owned active entitlement;
2. verify its POP or explicit complimentary approval;
3. enforce phone, expiry, revocation and maximum-device limits transactionally;
4. fetch the published book and matching released public episode;
5. create a signed v3 archive in the protected service environment;
6. bind the manifest to phone/device using the v3 contract;
7. upload it below `protected-packages/{readerUid}/...`;
8. store checksum, signing key ID, expiry, release IDs and revocation state;
9. append a download audit and return a URL lasting no more than 15 minutes.

The endpoint rejects missing/unverified/revoked/expired entitlements, wrong phone, device overflow, unreleased or missing content, and missing/revoked packages. Protected package objects have no public Firebase Storage URL.

`DevelopmentPackageIssuer` contains no signer. It can expose only explicitly injected, already-signed fixtures and otherwise fails closed. This makes local UI work possible without normalizing unsafe development keys.

## Reader import and offline operation

The public catalogue displays publication, price, purchase/POP state and locked/coming-soon/released episodes. After a secure download, the file is handed to the existing Reader import path:

1. extract the ZIP;
2. call `verifyImportedBookDataPack` with the trusted public-key registry, phone and device ID;
3. reject invalid signature, hash, binding, expiry or schema;
4. save the verified book to SQLite;
5. create/update the local Reader library item.

No network or entitlement lookup is needed to read a successfully verified, unexpired local package. Previous/next navigation uses only available local books; future public episodes remain informational and locked.

## Revocation

Entitlement and package revocation is enforced before every new URL is issued. Existing local packages retain the signed package’s bounded offline lifetime; immediate remote deletion is intentionally impossible while offline. Use short package expiries for higher-risk material. Reissued packages receive new issuance records and audits.

## Firestore and Storage rules

`firestore.rules` is default-deny. Public reads apply only to the public projection. Publisher writes require Auth custom claims. Readers can query only their own POP, entitlement, and issued-package metadata. POP submission/review, entitlement/package/log/reference writes are service-controlled.

`storage.rules` scopes receipt upload/read to the reader and publisher, denies all client access to protected packages, and permits public reads only for explicitly public series assets.

The rules are configured for Enterprise Native database `ai-studio-57118877-ceb5-4cf7-9e31-c5f548597a37`; deployments must pass the database explicitly and be reviewed against actual custom-claim provisioning.

## Privacy and security limitations

- Firestore Rules cannot make selected fields private within one document, so public and private models must remain separate.
- A client UI is not authorization. `/api/pop-submit`, `/api/pop-review`, and `/api/package-download-request` require server-side ID-token verification and role checks.
- Transaction-reference uniqueness, pricing comparison, issuance and device registration require backend transactions.
- Signed URLs can be shared until they expire; keep them short-lived and record each issue.
- Offline revocation cannot pre-empt an already-downloaded package before its signed expiry.

## Deployment checklist

1. Configure Firebase Auth and bootstrap publisher/verifier/admin custom claims outside the client.
2. Deploy and test Firestore/Storage rules against the named database and bucket.
3. Provision protected receipt/package buckets with retention and audit policy.
4. Deploy the three API handlers with Firebase ID-token verification and App Check where appropriate.
5. Store signing keys in a managed secret/HSM facility and grant only the issuer runtime access.
6. Configure key rotation and ship only public verification keys to the frontend.
7. Test replay, price/currency mismatch, release, ownership, expiry, revocation and device-limit failures.
8. Verify production bundles contain no private key or signing endpoint credential.
9. Exercise signed download, `verifyImportedBookDataPack`, SQLite persistence and offline reload.
10. Monitor rejected downloads and abnormal transaction-reference reuse.
