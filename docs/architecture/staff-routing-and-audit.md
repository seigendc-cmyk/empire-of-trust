# Staff routing and audit architecture

## Route map

React Router owns navigation and Firebase Hosting rewrites every navigation to
`index.html`, so direct URLs and refreshes resolve through the same route tree.

| Audience | Routes |
| --- | --- |
| Public | `/` → `/books`, `/books`, `/books/:bookId`, `/series`, `/series/:seriesId`, `/login` |
| Reader | `/my-library` |
| Staff entry | `/staff/login` |
| Protected staff | `/staff`, `/staff/books`, `/staff/books/:bookId`, `/staff/series`, `/staff/series/:seriesId`, `/staff/series/:seriesId/production`, `/staff/payments`, `/staff/publishing`, `/staff/audit-log`, `/staff/team` |
| Guard outcomes | `/access-denied`, `/staff/suspended`, `/staff/forbidden` |

The public layout contains only Book Store, Series, My Library, Install App and
Reader Login. The reader layout contains only reader-facing controls. Studio
links and tools exist exclusively inside the protected staff layout.

## Authentication and authorization

Reader identity and staff identity intentionally have different trust levels.
The reader modal may create a browser-local fallback profile to support offline
reading. That profile never enters the staff authorization context.

`StaffAuthProvider` observes the real Firebase Auth session, rejects anonymous
and browser-fallback identifiers, then reads exactly
`staffUsers/{firebaseUser.uid}`. Access resolves to one of:

- unauthenticated: redirect to `/staff/login`;
- authenticated without a valid staff record: `/access-denied`;
- suspended staff: `/staff/suspended`;
- active staff: continue to permission and assignment checks.

`RequirePermission` checks the permissions in the active record.
`RequireSeriesAssignment` checks the URL series ID against assignments, with
global access for owner, administrator and publisher roles. Protected
components are not mounted while authorization is loading.

Staff records contain:

`uid`, `email`, `displayName`, `status`, `roles`, `permissions`,
`assignedSeriesIds`, `assignedSeasonIds`, `assignedEpisodeIds`, `createdAt`,
`createdBy`, and `lastLoginAt`.

Clients can read only their own staff record. They cannot create, edit, or
delete it—including their own roles. Invitations and role changes must be
administrator-authorized server operations.

## Audit schema

`staffAuditLogs/{eventId}` is append-only and contains:

- authenticated staff UID and display name;
- action, entity type, entity ID and hierarchy IDs;
- changed fields and bounded before/after snapshots;
- reason, session ID, device ID, source;
- a server timestamp.

`createAuditDiff` deterministically derives changed field names.
`writeStaffAuditLog` sends ordinary audit requests to the authenticated backend.
`withAuditedMutation` sends the mutation and audit envelope together so the
backend can commit both atomically. The browser never supplies an authoritative
staff identity or timestamp.

The following actions use or require audited server contracts: authentication
events, invitations/role changes, production changes, book/chapter/scene/block
changes, character/casting/assets/possessions, covers and editorial approvals,
POP review, entitlements, package issuance/download/revocation, publishing,
deletion and restore.

Sensitive operations use:

- `POST /api/staff/auth-events`;
- `POST /api/staff/audit-logs`;
- `GET /api/staff/audit-logs` and `/export`;
- `POST /api/staff/audited-mutations`;
- `POST /api/staff/publishing`;
- `POST /api/staff/publish-book`;
- existing POP and package server endpoints.

The backend must verify the Firebase ID token, reload the active staff record,
authorize the permission and hierarchy assignment, validate payloads, use a
server timestamp, and commit the business write plus audit event in one
transaction/batch. Admin SDK writes bypass client rules, so these validations
are mandatory server responsibilities.

## Firestore boundary

The configured Enterprise Native-mode database is
`ai-studio-57118877-ceb5-4cf7-9e31-c5f548597a37`.

- `publicBooks` contains only deliberately projected published metadata.
- `publicSeries` contains the existing public series/season/episode projection.
- `books` remains private; source chapters, blocks, access codes, characters,
  assets and production notes are never returned publicly.
- readers can access only their own cloud library, POPs and entitlements.
- staff access is based on the caller's active `staffUsers` record and explicit
  permissions.
- client writes to staff records, audit logs, public publishing projections,
  entitlements and protected packages are denied.
- audit records cannot be edited or deleted by normal staff.
- unspecified documents are default-deny.

The audit page delegates compound filtering, pagination and export authorization
to the backend. Export is rendered only for `audit.export`, and the server must
repeat that authorization check.

## Offline Reader boundary

`/my-library` initializes the existing SQLite reader without staff
authorization. Signed-package verification still happens before SQLite writes,
and device binding, renewal, reading progress and offline access remain reader
concerns. Signing keys and protected package bytes never move into the staff
routing layer.

## Deployment URLs

For the Firebase Hosting origin, public URLs are
`https://<hosting-origin>/books`, `/series`, and `/my-library`; the staff entry
is `https://<hosting-origin>/staff/login`. The catch-all hosting rewrite enables
refresh on every route. API URLs remain same-origin `/api/*` endpoints and must
be connected to trusted server functions before production launch.

## Security review

The rules were reviewed against public-list leakage, unauthorized access,
update bypass, ownership hijacking, immutable fields, type confusion, oversized
payloads, missing fields, privilege escalation, schema pollution, invalid
workflow transitions, timestamp manipulation, mixed PII exposure, orphaned
subcollections and query/rule mismatches.

Result:

```json
{
  "score": 4,
  "summary": "Least-privilege prototype with public projections, owner-only reader data, private staff PII, server-only sensitive writes, append-only audit records, and default deny.",
  "findings": [
    {
      "check": "Backend enforcement",
      "severity": "minor",
      "issue": "The frontend repository defines server endpoint contracts but does not contain their deployment implementation.",
      "recommendation": "Implement and integration-test the documented endpoints with Admin SDK transactions before production launch."
    }
  ]
}
```
