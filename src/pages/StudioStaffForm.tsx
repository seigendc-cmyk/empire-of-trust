import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import {
  DASHBOARD_PERMISSION,
  deactivateStudioStaff,
  getStudioStaff,
  removeStudioStaff,
  saveStudioStaff,
  STUDIO_PERMISSIONS,
  type StaffDashboard,
  type StudioPermission,
  type StudioStaff,
} from "../lib/staffPermissions";
import { useAuth } from "../state/AuthContext";

const dashboards = Object.keys(DASHBOARD_PERMISSION) as StaffDashboard[];

export default function StudioStaffForm() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editing = Boolean(staffId);
  const decodedStaffId = staffId ? decodeURIComponent(staffId) : "";
  const [staff, setStaff] = useState<StudioStaff | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!decodedStaffId) return;
    getStudioStaff(decodedStaffId)
      .then((row) => setStaff(row))
      .finally(() => setLoading(false));
  }, [decodedStaffId]);

  const initialPermissions = useMemo(() => new Set(staff?.permissions ?? ["studio.access"]), [staff]);

  async function submit(formData: FormData) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const permissions = formData.getAll("permissions").map(String) as StudioPermission[];
      await saveStudioStaff({
        email: String(formData.get("email") ?? ""),
        displayName: String(formData.get("displayName") ?? ""),
        role: String(formData.get("role") ?? ""),
        active: formData.get("active") === "on",
        permissions,
        dashboard: String(formData.get("dashboard") ?? "dashboard") as StaffDashboard,
      }, user?.email ?? "");
      setMessage("Staff access saved.");
      window.setTimeout(() => navigate("/studio/staff"), 500);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save staff access.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading staff record..." />;
  if (editing && !staff) return <ErrorState title="Staff record not found" message="The requested staff record does not exist." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Super admin" title={editing ? "Edit Staff Access" : "Register Staff"} subtitle="Assign role, active status, default dashboard, and permissions." actions={[{ label: "Staff List", to: "/studio/staff" }]} />
      <form
        className="panel grid gap-4 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
      >
        <section className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Email</span>
            <input className="field" name="email" type="email" required readOnly={editing} defaultValue={staff?.email ?? ""} />
          </label>
          <label>
            <span className="label">Display name</span>
            <input className="field" name="displayName" required defaultValue={staff?.displayName ?? ""} />
          </label>
          <label>
            <span className="label">Role</span>
            <input className="field" name="role" required defaultValue={staff?.role ?? "episode_editor"} />
          </label>
          <label>
            <span className="label">Default dashboard</span>
            <select className="field" name="dashboard" defaultValue={staff?.dashboard ?? "dashboard"}>
              {dashboards.map((dashboard) => <option key={dashboard} value={dashboard}>{dashboard}</option>)}
            </select>
          </label>
          <label className="flex min-h-12 items-center justify-between border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold">
            Active
            <input name="active" type="checkbox" defaultChecked={staff?.active ?? true} />
          </label>
        </section>

        <section>
          <h2 className="text-lg font-black">Permissions</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STUDIO_PERMISSIONS.map((permission) => (
              <label key={permission} className="flex min-h-12 items-center justify-between gap-3 border border-white/10 bg-black/20 p-3 text-sm font-semibold">
                <span>{permission}</span>
                <input name="permissions" type="checkbox" value={permission} defaultChecked={initialPermissions.has(permission)} />
              </label>
            ))}
          </div>
        </section>

        {message && <p className="border border-ledger bg-ledger/10 p-3 text-sm font-bold text-ledger">{message}</p>}
        {error && <p className="border border-ember bg-ember/10 p-3 text-sm font-bold text-ember">{error}</p>}

        <div className="sticky-actions grid gap-2 sm:flex">
          <button className="btn btn-primary flex-1" type="submit" disabled={saving}>{saving ? "Saving..." : "Save staff access"}</button>
          {editing && (
            <>
              <button className="btn flex-1" type="button" disabled={saving} onClick={() => void deactivateStudioStaff(decodedStaffId, user?.email ?? "").then(() => navigate("/studio/staff"))}>Deactivate</button>
              <button className="btn border-ember bg-ember/20 text-paper hover:bg-ember hover:text-paper" type="button" disabled={saving} onClick={() => window.confirm("Remove this staff access record?") && void removeStudioStaff(decodedStaffId, user?.email ?? "").then(() => navigate("/studio/staff"))}>Remove access</button>
            </>
          )}
          <Link className="btn" to="/studio/staff">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
