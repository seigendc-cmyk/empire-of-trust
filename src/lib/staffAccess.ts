import { auth } from './firebase';
import type {
  StaffAccessApproval, StaffAccessRequest, StaffPermission,
} from '../types/staff';
import { getStaffSessionId } from './staffAudit';

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('A genuine Google sign-in is required.');
  const token = await user.getIdToken();
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Staff-Session-Id': getStaffSessionId(),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || 'Staff access service request failed.');
  return body;
};

export const getMyStaffAccessRequest = () =>
  request<{ request: StaffAccessRequest | null }>('/api/staff/access-request/me')
    .then((body) => body.request);

export const submitStaffAccessRequest = (input: {
  requestedRole: string;
  reason: string;
}) => request<{ request: StaffAccessRequest }>('/api/staff/access-request', {
  method: 'POST',
  body: JSON.stringify(input),
}).then((body) => body.request);

export const cancelStaffAccessRequest = () =>
  request<{ request: StaffAccessRequest }>('/api/staff/access-request/cancel', {
    method: 'POST',
    body: JSON.stringify({}),
  }).then((body) => body.request);

export const listStaffAccessRequests = () =>
  request<{ requests: StaffAccessRequest[] }>('/api/staff/access-requests')
    .then((body) => body.requests);

export const approveStaffAccessRequest = (uid: string, approval: StaffAccessApproval) =>
  request<{ request: StaffAccessRequest }>(
    `/api/staff/access-requests/${encodeURIComponent(uid)}/approve`,
    {
      method: 'POST',
      body: JSON.stringify(approval),
    },
  ).then((body) => body.request);

export const rejectStaffAccessRequest = (uid: string, reviewerNotes: string) =>
  request<{ request: StaffAccessRequest }>(
    `/api/staff/access-requests/${encodeURIComponent(uid)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ reviewerNotes }),
    },
  ).then((body) => body.request);

export const STAFF_APPROVAL_PERMISSIONS: StaffPermission[] = [
  'staff.portal.view',
  'books.view',
  'books.edit',
  'series.view',
  'series.edit',
  'payments.review',
  'publishing.manage',
  'audit.view',
  'team.view',
  'team.manage',
  'team.approve',
];
