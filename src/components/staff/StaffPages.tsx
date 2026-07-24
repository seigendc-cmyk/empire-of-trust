import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, LogIn, LogOut, RefreshCw, ShieldX, UserPlus } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { getStaffAuthErrorMessage, signInStaffWithGoogle, signOutStaff } from '../../lib/staffAuth';
import {
  approveStaffAccessRequest, cancelStaffAccessRequest, listStaffAccessRequests, rejectStaffAccessRequest,
  STAFF_APPROVAL_PERMISSIONS, submitStaffAccessRequest,
} from '../../lib/staffAccess';
import { exportStaffAuditLogs, listStaffAuditLogs } from '../../lib/staffAudit';
import type {
  StaffAccessApproval, StaffAccessRequest, StaffAuditFilters, StaffAuditLog,
  StaffPermission,
} from '../../types/staff';

export const StaffLoginPage: React.FC = () => {
  const { phase, error, refresh } = useStaffAuth();
  const location = useLocation();
  const [message, setMessage] = useState('');
  const destination = (location.state as { from?: string } | null)?.from || '/staff';
  if (phase === 'authorized') return <Navigate to={destination} replace />;
  if (phase === 'request-needed') return <Navigate to="/staff/request-access" replace />;
  if (phase === 'pending') return <Navigate to="/staff/pending" replace />;
  if (phase === 'rejected') return <Navigate to="/staff/access-rejected" replace />;
  const phaseMessage = {
    'non-staff': 'This approved request does not yet have a valid staff record. Refresh or contact an administrator.',
    suspended: 'This staff account is suspended. Contact an administrator to restore access.',
    invited: 'This staff invitation has not been activated yet.',
    disabled: 'This staff account is disabled. Contact an administrator for assistance.',
  }[phase] || '';
  const signIn = async () => {
    setMessage('');
    try {
      await signInStaffWithGoogle();
    } catch (cause) {
      if (import.meta.env.DEV) {
        console.error('Staff Google sign-in failed:', cause);
      }
      setMessage(getStaffAuthErrorMessage(cause));
    }
  };
  const retryVerification = async () => {
    setMessage('');
    await refresh();
  };
  return <div className="grid min-h-screen place-items-center bg-[#202428] p-4 text-white">
    <section className="w-full max-w-md border border-white/15 bg-[#292e33] p-7">
      <p className="text-xs font-extrabold uppercase text-[#ff8b59]">Protected staff portal</p>
      <h1 className="mt-2 text-2xl font-extrabold">Staff sign in</h1>
      <p className="mt-2 text-sm text-gray-300">Sign in with your approved staff Google account. New staff members may submit an access request for review by the system administrator.</p>
      <button onClick={() => void signIn()} className="mt-5 w-full bg-[#ff6321] px-4 py-3 text-sm font-bold"><LogIn className="mr-2 inline h-4 w-4" />Continue with Google</button>
      {(message || error || phaseMessage) && <p role="alert" className="mt-3 border border-red-400 bg-red-950/40 p-3 text-xs">{message || error || phaseMessage}</p>}
      {phase === 'error' && <button onClick={() => void retryVerification()} className="mt-3 w-full border border-white/30 px-4 py-2 text-xs font-bold">Retry staff verification</button>}
      <Link to="/books" className="mt-4 block text-center text-xs font-bold text-gray-300">Return to Book Store</Link>
    </section>
  </div>;
};

export const StatusPage: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="grid min-h-[65vh] place-items-center p-5">
    <section className="max-w-lg border bg-white p-8 text-center">
      <ShieldX className="mx-auto h-9 w-9 text-[#ff6321]" />
      <h1 className="mt-3 text-xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm text-[#666]">{message}</p>
      <Link to="/books" className="mt-5 inline-block border px-4 py-2 text-xs font-bold">Book Store</Link>
    </section>
  </div>
);

export const StaffAuthErrorPage: React.FC = () => {
  const { error, phase, refresh } = useStaffAuth();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);
  const destination = (location.state as { from?: string } | null)?.from || '/staff';
  if (phase === 'authorized') return <Navigate to={destination} replace />;
  if (phase === 'unauthenticated') {
    return <Navigate to="/staff/login" replace state={{ from: destination }} />;
  }
  if (phase === 'suspended') return <Navigate to="/staff/suspended" replace />;
  if (['non-staff', 'invited', 'disabled'].includes(phase)) {
    return <Navigate to="/access-denied" replace />;
  }
  const retry = async () => {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  };
  return (
    <div className="grid min-h-[65vh] place-items-center p-5">
      <section className="max-w-lg border bg-white p-8 text-center">
        <ShieldX className="mx-auto h-9 w-9 text-[#ff6321]" />
        <h1 className="mt-3 text-xl font-extrabold">Staff verification unavailable</h1>
        <p role="alert" className="mt-2 text-sm text-[#666]">
          {error || 'The app could not verify this staff account.'}
        </p>
        <button
          onClick={() => void retry()}
          disabled={retrying}
          className="mt-5 bg-[#24282c] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          <RefreshCw className={`mr-1 inline h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Retrying…' : 'Retry staff verification'}
        </button>
        <Link to="/books" className="mt-3 block text-xs font-bold">Return to Book Store</Link>
      </section>
    </div>
  );
};

const AccessShell: React.FC<React.PropsWithChildren<{ title: string; eyebrow: string }>> = ({
  children, title, eyebrow,
}) => (
  <div className="grid min-h-screen place-items-center bg-[#eef0f2] p-4">
    <section className="w-full max-w-xl border bg-white p-7">
      <p className="text-xs font-extrabold uppercase text-[#ff6321]">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
      {children}
    </section>
  </div>
);

export const StaffRequestAccessPage: React.FC = () => {
  const { phase, firebaseUser, refresh } = useStaffAuth();
  const navigate = useNavigate();
  const [requestedRole, setRequestedRole] = useState('editor');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (phase === 'unauthenticated') return <Navigate to="/staff/login" replace />;
  if (phase === 'authorized') return <Navigate to="/staff" replace />;
  if (phase === 'pending') return <Navigate to="/staff/pending" replace />;
  if (phase === 'rejected') return <Navigate to="/staff/access-rejected" replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      await submitStaffAccessRequest({ requestedRole, reason });
      await refresh();
      navigate('/staff/pending', { replace: true });
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Access request failed.');
    } finally {
      setSubmitting(false);
    }
  };
  return <AccessShell eyebrow="Protected staff portal" title="Request staff access">
    <p className="mt-2 text-sm text-[#666]">Signed in as <strong>{firebaseUser?.email}</strong>. Your request will be reviewed before any staff permissions are granted.</p>
    <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4">
      <label className="text-xs font-bold">Requested role
        <select value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)} className="mt-1 w-full border p-3">
          <option value="viewer">Viewer</option><option value="editor">Editor</option>
          <option value="producer">Producer</option><option value="publisher">Publisher</option>
        </select>
      </label>
      <label className="text-xs font-bold">Reason for access
        <textarea required minLength={10} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-28 w-full border p-3" />
      </label>
      {message && <p role="alert" className="border border-red-300 bg-red-50 p-3 text-xs text-red-800">{message}</p>}
      <button disabled={submitting} className="bg-[#ff6321] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><UserPlus className="mr-2 inline h-4 w-4" />{submitting ? 'Submitting…' : 'Submit access request'}</button>
    </form>
  </AccessShell>;
};

export const StaffPendingPage: React.FC = () => {
  const { phase, firebaseUser, refresh } = useStaffAuth();
  const [refreshing, setRefreshing] = useState(false);
  if (phase === 'unauthenticated') return <Navigate to="/staff/login" replace />;
  if (phase === 'authorized') return <Navigate to="/staff" replace />;
  if (phase === 'request-needed') return <Navigate to="/staff/request-access" replace />;
  if (phase === 'rejected') return <Navigate to="/staff/access-rejected" replace />;
  return <AccessShell eyebrow="Staff access request" title="Pending Approval">
    <p className="mt-3 text-sm text-[#666]">Your request for <strong>{firebaseUser?.email}</strong> is waiting for a system administrator.</p>
    <div className="mt-5 flex flex-wrap gap-2">
      <button onClick={() => void (async () => { setRefreshing(true); await refresh(); setRefreshing(false); })()} className="border px-4 py-2 text-xs font-bold"><RefreshCw className={`mr-1 inline h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh Status</button>
      <button onClick={() => void signOutStaff()} className="border px-4 py-2 text-xs font-bold"><LogOut className="mr-1 inline h-4 w-4" />Sign Out</button>
      <button onClick={() => void (async () => {
        if (!window.confirm('Cancel this staff access request?')) return;
        await cancelStaffAccessRequest();
        await refresh();
      })()} className="border border-red-300 px-4 py-2 text-xs font-bold text-red-800">Cancel Request</button>
    </div>
  </AccessShell>;
};

export const StaffAccessRejectedPage: React.FC = () => {
  const { phase, firebaseUser, accessRequest } = useStaffAuth();
  if (phase === 'unauthenticated') return <Navigate to="/staff/login" replace />;
  if (phase === 'authorized') return <Navigate to="/staff" replace />;
  if (phase === 'pending') return <Navigate to="/staff/pending" replace />;
  return <AccessShell eyebrow="Staff access request" title="Access Request Rejected">
    <p className="mt-3 text-sm text-[#666]">The request for <strong>{firebaseUser?.email}</strong> was not approved.</p>
    {accessRequest?.reviewerNotes && <p className="mt-4 border bg-[#f7f7f7] p-3 text-sm">{accessRequest.reviewerNotes}</p>}
    <button onClick={() => void signOutStaff()} className="mt-5 border px-4 py-2 text-xs font-bold"><LogOut className="mr-1 inline h-4 w-4" />Sign Out</button>
  </AccessShell>;
};

export const StaffDashboardPage: React.FC = () => {
  const { staffUser } = useStaffAuth();
  return <section>
    <p className="text-xs font-bold uppercase text-[#ff6321]">Dashboard</p>
    <h1 className="text-2xl font-extrabold">Welcome, {staffUser?.displayName}</h1>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">{[
      ['Roles', staffUser?.roles.join(', ') || 'None'],
      ['Permissions', String(staffUser?.permissions.length || 0)],
      ['Assigned series', String(staffUser?.assignedSeriesIds.length || 0)],
    ].map(([label, value]) => <div key={label} className="border bg-white p-4"><p className="text-xs font-bold uppercase text-[#777]">{label}</p><p className="mt-2 text-sm font-extrabold">{value}</p></div>)}</div>
  </section>;
};

export const StaffPlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <section className="border bg-white p-6"><p className="text-xs font-bold uppercase text-[#ff6321]">Staff workspace</p><h1 className="mt-1 text-2xl font-extrabold">{title}</h1><p className="mt-2 text-sm text-[#666]">{description}</p></section>
);

const field = 'border border-[#cfd3d7] bg-white px-2 py-2 text-xs';
const commaList = (value: string) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
const timestampText = (value: unknown) => {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString();
  }
  return value ? new Date(String(value)).toLocaleString() : 'Pending server timestamp';
};

const defaultApproval = (): StaffAccessApproval => ({
  roles: [],
  permissions: ['staff.portal.view'],
  assignedSeriesIds: [],
  assignedSeasonIds: [],
  assignedEpisodeIds: [],
  reviewerNotes: '',
});

export const StaffAccessRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<StaffAccessRequest[]>([]);
  const [approvals, setApprovals] = useState<Record<string, StaffAccessApproval>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const load = async () => {
    setMessage('');
    try {
      const pending = await listStaffAccessRequests();
      setRequests(pending);
      setApprovals((current) => Object.fromEntries(pending.map((item) => [
        item.uid, current[item.uid] || { ...defaultApproval(), roles: [item.requestedRole] },
      ])));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not load access requests.');
    }
  };
  useEffect(() => { void load(); }, []);
  const update = (uid: string, patch: Partial<StaffAccessApproval>) =>
    setApprovals((current) => ({ ...current, [uid]: { ...(current[uid] || defaultApproval()), ...patch } }));
  const approve = async (item: StaffAccessRequest) => {
    const approval = approvals[item.uid] || defaultApproval();
    if (!approval.roles.length || !approval.permissions.length) {
      setMessage('Approval requires at least one role and one explicit permission.');
      return;
    }
    if (!window.confirm(`Approve staff access for ${item.email}?`)) return;
    setBusy(item.uid); setMessage('');
    try {
      await approveStaffAccessRequest(item.uid, approval);
      setMessage(`${item.email} was approved.`);
      await load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Approval failed.');
    } finally { setBusy(''); }
  };
  const reject = async (item: StaffAccessRequest) => {
    const notes = rejectNotes[item.uid]?.trim() || '';
    if (!notes) { setMessage('Reviewer notes are required for rejection.'); return; }
    setBusy(item.uid); setMessage('');
    try {
      await rejectStaffAccessRequest(item.uid, notes);
      setMessage(`${item.email} was rejected.`);
      await load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Rejection failed.');
    } finally { setBusy(''); }
  };
  return <section>
    <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#ff6321]">Team administration</p><h1 className="text-2xl font-extrabold">Staff Access Requests</h1></div><button onClick={() => void load()} className="border bg-white px-3 py-2 text-xs font-bold"><RefreshCw className="mr-1 inline h-4 w-4" />Refresh</button></div>
    {message && <p role="status" className="mt-4 border bg-white p-3 text-sm">{message}</p>}
    <div className="mt-4 grid gap-4">{requests.map((item) => {
      const approval = approvals[item.uid] || defaultApproval();
      return <article key={item.uid} className="border bg-white p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-extrabold">{item.displayName}</h2><p className="text-sm text-[#666]">{item.email}</p></div><time className="text-xs text-[#666]">{timestampText(item.requestedAt)}</time></div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase">Requested role</dt><dd>{item.requestedRole}</dd></div><div><dt className="text-xs font-bold uppercase">Reason</dt><dd>{item.reason}</dd></div></dl>
        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
          <label className="text-xs font-bold">Approved roles<input aria-label={`Roles for ${item.email}`} value={approval.roles.join(', ')} onChange={(event) => update(item.uid, { roles: commaList(event.target.value) })} className={`${field} mt-1 w-full`} /></label>
          <label className="text-xs font-bold">Series IDs<input value={approval.assignedSeriesIds.join(', ')} onChange={(event) => update(item.uid, { assignedSeriesIds: commaList(event.target.value) })} className={`${field} mt-1 w-full`} /></label>
          <label className="text-xs font-bold">Season IDs<input value={approval.assignedSeasonIds.join(', ')} onChange={(event) => update(item.uid, { assignedSeasonIds: commaList(event.target.value) })} className={`${field} mt-1 w-full`} /></label>
          <label className="text-xs font-bold">Episode IDs<input value={approval.assignedEpisodeIds.join(', ')} onChange={(event) => update(item.uid, { assignedEpisodeIds: commaList(event.target.value) })} className={`${field} mt-1 w-full`} /></label>
        </div>
        <fieldset className="mt-3"><legend className="text-xs font-bold">Permissions</legend><div className="mt-2 grid gap-1 sm:grid-cols-3">{STAFF_APPROVAL_PERMISSIONS.map((permission) => <label key={permission} className="text-xs"><input type="checkbox" checked={approval.permissions.includes(permission)} onChange={(event) => update(item.uid, { permissions: event.target.checked ? [...approval.permissions, permission] : approval.permissions.filter((value) => value !== permission) as StaffPermission[] })} className="mr-1" />{permission}</label>)}</div></fieldset>
        <label className="mt-3 block text-xs font-bold">Reviewer notes<input value={rejectNotes[item.uid] || ''} onChange={(event) => setRejectNotes((current) => ({ ...current, [item.uid]: event.target.value }))} maxLength={2000} className={`${field} mt-1 w-full`} /></label>
        <div className="mt-4 flex gap-2"><button disabled={busy === item.uid} onClick={() => void approve(item)} className="bg-green-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><CheckCircle2 className="mr-1 inline h-4 w-4" />Approve</button><button disabled={busy === item.uid} onClick={() => void reject(item)} className="bg-red-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><ShieldX className="mr-1 inline h-4 w-4" />Reject</button></div>
      </article>;
    })}{requests.length === 0 && <p className="border bg-white p-8 text-center text-sm text-[#666]">No pending access requests.</p>}</div>
  </section>;
};

export const StaffAuditLogPage: React.FC = () => {
  const { staffUser } = useStaffAuth();
  const [filters, setFilters] = useState<StaffAuditFilters>({});
  const [logs, setLogs] = useState<StaffAuditLog[]>([]);
  const [message, setMessage] = useState('');
  const canExport = Boolean(staffUser?.permissions.includes('audit.export'));
  const load = async () => {
    setMessage('');
    try { setLogs(await listStaffAuditLogs(filters)); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Audit query failed.'); }
  };
  useEffect(() => { void load(); }, []);
  const entries = useMemo(() => Object.entries(filters), [filters]);
  const set = (key: keyof StaffAuditFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const exportLogs = async () => {
    const blob = await exportStaffAuditLogs(filters);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'staff-audit-log.csv'; anchor.click();
    URL.revokeObjectURL(url);
  };
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#ff6321]">Append-only records</p><h1 className="text-2xl font-extrabold">Activity Log</h1></div>{canExport && <button onClick={() => void exportLogs()} className="border bg-white px-3 py-2 text-xs font-bold"><Download className="mr-1 inline h-4 w-4" />Export</button>}</div>
    <div className="mt-4 grid gap-2 border bg-white p-3 sm:grid-cols-3 xl:grid-cols-5">
      {(['dateFrom','dateTo','staff','action','entityType','seriesId','seasonId','episodeId','bookId','sessionId'] as const).map((key) => <label key={key} className="text-[10px] font-bold uppercase">{key}<input type={key.startsWith('date') ? 'date' : 'text'} value={String(filters[key] || '')} onChange={(event) => set(key,event.target.value)} className={`${field} mt-1 w-full`} /></label>)}
      <button onClick={() => void load()} className="self-end bg-[#24282c] px-3 py-2 text-xs font-bold text-white"><RefreshCw className="mr-1 inline h-4 w-4" />Apply filters</button>
    </div>
    {message && <p role="alert" className="mt-3 border border-red-300 bg-red-50 p-3 text-xs text-red-800">{message}</p>}
    <div className="mt-4 overflow-x-auto border bg-white"><table className="min-w-full text-left text-xs"><thead className="bg-[#24282c] text-white"><tr>{['Timestamp','Staff','Action','Target','Changed fields','Before / After','Source','Device / Session'].map((item) => <th key={item} className="p-3">{item}</th>)}</tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t align-top"><td className="p-3">{timestampText(log.timestamp)}</td><td className="p-3"><strong>{log.staffDisplayName}</strong><br/>{log.staffUid}</td><td className="p-3 font-bold">{log.action}</td><td className="p-3">{log.entityType}<br/>{log.entityId}</td><td className="p-3">{log.changedFields.join(', ') || 'None'}</td><td className="max-w-sm p-3"><details><summary className="cursor-pointer font-bold">Compare</summary><pre className="mt-2 whitespace-pre-wrap text-[10px]">{JSON.stringify({before:log.before,after:log.after},null,2)}</pre></details></td><td className="p-3">{log.source}</td><td className="p-3">{log.deviceId}<br/>{log.sessionId}</td></tr>)}</tbody></table>{logs.length === 0 && <p className="p-6 text-center text-sm text-[#777]">No audit events match the active filters ({entries.filter(([,value]) => value).length} filters).</p>}</div>
  </section>;
};
