import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { listStudioStaff, type StudioStaff } from "../lib/staffPermissions";

export default function StudioStaffList() {
  const [staff, setStaff] = useState<StudioStaff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStudioStaff().then(setStaff).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading staff..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Super admin" title="Staff Access" subtitle="Register staff emails, roles, dashboards, and module permissions." actions={[{ label: "New Staff", to: "/studio/staff/new", primary: true }]} />
      <section className="panel divide-y divide-white/10">
        {staff.length === 0 && <p className="p-4 text-sm text-paper/60">No staff records yet.</p>}
        {staff.map((member) => (
          <Link key={member.email} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[1fr_auto] sm:items-center" to={`/studio/staff/${encodeURIComponent(member.email)}/edit`}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`status-badge ${member.active ? "border-ledger text-ledger" : "border-ember text-ember"}`}>{member.active ? "Active" : "Inactive"}</span>
                <span className="status-badge border-signal text-signal">{member.role}</span>
              </div>
              <h2 className="mt-2 text-lg font-black">{member.displayName || member.email}</h2>
              <p className="mt-1 break-words text-sm text-paper/60">{member.email}</p>
            </div>
            <p className="text-sm font-bold text-paper/60">{member.permissions.length} permissions / {member.dashboard}</p>
          </Link>
        ))}
      </section>
    </section>
  );
}
