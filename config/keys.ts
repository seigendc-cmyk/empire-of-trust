// Public verification keys are safe to bundle. Private signing keys are not.
// Add a new entry before issuing packs with its keyId; retain old entries until
// every package signed by that key has expired.
export const DATA_PACK_PUBLIC_KEYS: Readonly<Record<string, string>> = {
  'key-202607': `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9nQfHrh+2+iFAQj2s9KgLnK+SIkL
T+10i4Dxa+3L2V6GARep+YhVmXzMxkjxgC+XyEEXgZHIGsqh0SyahgZNhw==
-----END PUBLIC KEY-----`,
};
