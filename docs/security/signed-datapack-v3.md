# Signed data-pack v3.0.0

## Overview

Version 3.0.0 replaces the temporary custom-hash trust model with cryptographically signed manifests. The Reader verifies with a configured public key only. Signing is an external publisher operation; browser-side Studio and Portal export is disabled until a signing service is connected.

## Threat model

- **Book content tampering**: A reader or attacker modifies the book content after export.
- **Licence extension**: A reader alters `expiresAt` to extend access.
- **Binding transfer**: A reader changes the bound phone or device to share or steal a licence.
- **Package forgery**: An attacker creates a fake package claiming to be from the publisher.

Signed manifests bind the content hash, licence dates, binding values, and issuer identity together. Any alteration invalidates the signature.

## Trust boundaries

- **Publisher**: Holds the private signing key. Signs manifests before distribution.
- **Reader application**: Holds only the public key(s). Verifies signatures locally.
- **Transport**: ZIP packages travel over any channel. Integrity is verified after receipt, not during transport.

## Signed manifest structure

```json
{
  "packVersion": "3.0.0",
  "appSignature": "EMPIRE_OF_TRUST_MY_LIBRARY_V3",
  "packageId": "PKG-...",
  "bookId": "...",
  "bookVersion": "1.0.0",
  "issuedAt": "2026-07-23T14:00:00.000Z",
  "expiresAt": "2026-08-22T14:00:00.000Z",
  "bindingMode": "phone-and-device",
  "boundPhoneHash": "<SHA-256 hex>",
  "boundDeviceHash": "<SHA-256 hex>",
  "contentHash": "<SHA-256 hex>",
  "licenceId": "LIC-...",
  "issuer": "Empire Of Trust Publisher",
  "signatureAlgorithm": "ECDSA-P256-SHA256"
}
```

The signature is stored separately:

```json
{
  "algorithm": "ECDSA-P256-SHA256",
  "keyId": "key-202607",
  "signature": "<base64 Web Crypto ECDSA signature>"
}
```

`canonicalizeManifest()` serializes all signed fields with recursively sorted object keys. `book.json` is hashed as deterministic JSON with SHA-256. Phone and device values are trimmed and SHA-256 hashed before being placed in the manifest. The manifest signature binds the content hash, dates, binding mode and hashes, licence identifiers, issuer, version, and algorithm.

## Key generation

Generate a development key pair outside the browser application with:

```bash
npm run datapack:generate-keys -- --key-id dev-202607
```

This writes:

- a private JWK to `keys/private/<keyId>.private.jwk` (gitignored);
- a public PEM to `keys/public/<keyId>.public.pem` (gitignored staging output).

Copy only the public PEM into `DATA_PACK_PUBLIC_KEYS` in `config/keys.ts`, keyed by the exact same `keyId`. The generator refuses to overwrite existing key material.

### Production key management

- Generate keys on an air-gapped machine or secure CI runner.
- Store the private key in a secrets manager or HSM.
- Distribute the public key through the application configuration or a trusted endpoint.
- Never embed the private key in frontend source, environment variables, Firebase Hosting, GitHub, localStorage, or IndexedDB.

## Key storage

| Location | Purpose | Visibility |
| --- | --- | --- |
| `keys/private/*.private.jwk` | Private signing key | Excluded from git |
| `config/keys.ts` | Public verification-key registry | Committed |
| Reader application | Re-exported public key only | Bundled or fetched at runtime |
| Secrets manager / HSM | Production private key | Not in repository |

Private keys must never be placed in `src/`, Vite environment variables, Firebase Hosting files, GitHub, `localStorage`, or IndexedDB. Development keys under `keys/private/` are for local testing only. Production signing should use a secrets manager, KMS, or HSM and should not export the private key where avoidable.

## Key rotation

Multiple public keys may be present in `DATA_PACK_PUBLIC_KEYS` at once, keyed by `keyId`. When rotating:

1. Generate a new key pair.
2. Add the new public PEM to `config/keys.ts` under the new `keyId` and deploy the Reader first.
3. Update the issuer pipeline to sign new manifests with that exact `keyId`.
4. Keep the old public key in the map until all previously issued licences expire.
5. Remove the old public key entry only after confirming no valid packages reference it.

## Package creation

Package creation and signing are separate operations. The shared functions accept a `CryptoKey`, but the browser application never calls the signing path and never receives a private key. Production should call the same flow in a controlled backend or issuer worker.

Creation steps:

1. `createUnsignedManifest()`: assemble metadata, compute content hash, hash binding values.
2. `signManifest()`: canonicalize the manifest, sign with ECDSA P-256 SHA-256.
3. `createSignedBookDataPack()`: combine manifest, signature, and book into a package.
4. `downloadBookDataPackFile()`: ZIP into `manifest.json`, `book.json`, `signature.json`, and `README.txt`.

For local development, sign a JSON book outside the browser:

```bash
npm run datapack:sign -- \
  --book ./book.json \
  --private-key ./keys/private/dev-202607.private.jwk \
  --key-id dev-202607 \
  --binding phone-and-device \
  --phone +263700000000 \
  --device DEVICE-ID \
  --licence-id LIC-123 \
  --output ./signed-book.datapack.zip
```

`--binding` accepts only `phone`, `device`, or `phone-and-device`. The corresponding `--phone` and/or `--device` values are required. Optional flags include `--package-id`, `--issuer`, `--issued-at`, `--expires-at`, and `--book-version`.

### Failure conditions

Creation fails if:
- the book lacks required fields;
- the signing key is unavailable;
- the binding mode is unsupported;
- required binding or licence fields are absent;
- dates are invalid, reversed, or exceed 30 days;
- the content hash cannot be generated.

The ZIP README explicitly describes signing and does not claim encryption.

## Reader verification

Reader verification order for v3.0.0:

1. Parse the package.
2. Validate schema and version (`3.0.0` required).
3. Validate dates.
4. Validate that `keyId` exists in the configured registry.
5. Import only the public key mapped to that `keyId`.
6. Recalculate the content hash.
7. Verify the ECDSA signature.
8. Validate the binding mode.
9. Validate expiry.
10. Return the verified book.

Any failure rejects the package with a clear message.

## Legacy migration

- Existing, intact 2.5.0 packs remain importable until their original expiry.
- No new 2.5.0 packs are generated.
- Renewal of a 2.5.0 pack requires conversion and publisher re-issuance as 3.0.0.
- New exports use 3.0.0 signed manifests only.
- The temporary browser-side Studio, Portal, and direct-download issuance paths fail closed until an external signer is connected.

## Limitations of browser DRM

- The reader controls the browser environment. A determined attacker can bypass client-side checks.
- The public key is visible in the application bundle and can be extracted.
- Unsalted phone/device hashes can be guessed when their input space is small; they are bindings, not secret storage.
- Licensing is best-effort protection, not unbreakable DRM.
- Key rotation depends on the user reloading the application.
- Web Crypto operations are asynchronous and may fail on very old or restricted browsers.
- Signed packages provide integrity and authenticity, not confidentiality. Book content is not encrypted.

## Production deployment checklist

- [ ] Private key stored outside version control and CI artifacts.
- [ ] Public key distributed through a tamper-resistant configuration path.
- [ ] Key rotation plan documented and tested.
- [ ] CI pipeline does not expose private keys.
- [ ] Production signing happens outside the browser and Hosting artifacts.
- [ ] Reader deployment containing a new public key precedes issuer rotation to that key.
- [ ] Application bundles audited for accidental private key inclusion.
- [ ] Signed ZIP contains exactly the required manifest, book, signature, and README files.
- [ ] Studio/Portal issuance remains disabled until the external signer is authenticated and authorized.
- [ ] Fallback behaviour defined if signature verification fails due to network or storage issues.
