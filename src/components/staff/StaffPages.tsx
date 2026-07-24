import React, { useEffect, useMemo, useState } from 'react';
import { Download, LogIn, RefreshCw, ShieldX } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { getStaffAuthErrorMessage, signInStaffWithGoogle } from '../../lib/staffAuth';
import { exportStaffAuditLogs, listStaffAuditLogs } from '../../lib/staffAudit';
import type { StaffAuditFilters, StaffAuditLog } from '../../types/staff';

export const StaffLoginPage: React.FC = () => {
  const { phase, error } = useStaffAuth();
  const location = useLocation();
  const [message, setMessage] = useState('');
  const destination = (location.state as { from?: string } | null)?.from || '/staff';
  if (phase === 'authorized') return <Navigate to={destination} replace />;
  const phaseMessage = {
    'non-staff': 'Google sign-in succeeded, but no staff record exists for this account.',
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
  return <div className="grid min-h-screen place-items-center bg-[#202428] p-4 text-white">
    <section className="w-full max-w-md border border-white/15 bg-[#292e33] p-7">
      <p className="text-xs font-extrabold uppercase text-[#ff8b59]">Protected staff portal</p>
      <h1 className="mt-2 text-2xl font-extrabold">Staff sign in</h1>
      <p className="mt-2 text-sm text-gray-300">Use a genuine Firebase Google account with an active staff record. Reader fallback profiles are never accepted.</p>
      <button onClick={() => void signIn()} className="mt-5 w-full bg-[#ff6321] px-4 py-3 text-sm font-bold"><LogIn className="mr-2 inline h-4 w-4" />Continue with Google</button>
      {(message || error || phaseMessage) && <p role="alert" className="mt-3 border border-red-400 bg-red-950/40 p-3 text-xs">{message || error || phaseMessage}</p>}
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
const timestampText = (value: unknown) => {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString();
  }
  return value ? new Date(String(value)).toLocaleString() : 'Pending server timestamp';
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
