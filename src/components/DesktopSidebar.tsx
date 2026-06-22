import { NavLink } from "react-router-dom";
import type { StudioPermission } from "../lib/staffPermissions";
import { useAuth } from "../state/AuthContext";
import { OfflineStatusBadge } from "./OfflineStatusBadge";
import { ThemeToggle } from "./ThemeToggle";

const items = [
  { to: "/reader", label: "Reader" },
  { to: "/library", label: "Library" },
  { to: "/participation", label: "Participation" },
  { to: "/participation/rankings", label: "Rankings" },
  { to: "/library/import", label: "Import Booklet" },
  { to: "/reader/profile", label: "Reader Profile" },
  { to: "/reader/rewards", label: "Rewards" },
  { to: "/reader/participation", label: "Participation" },
  { to: "/licence", label: "Licence" },
  { to: "/characters", label: "Universe" },
  { to: "/actors", label: "Actors" },
  { to: "/properties", label: "Properties" },
  { to: "/vehicles", label: "Vehicles" },
  { to: "/characters/relationships", label: "Character Graph" },
  { to: "/characters/appearances", label: "Story Presence" },
  { to: "/mall", label: "iTred Mall", permission: "mall.read" },
  { to: "/mall/vendors", label: "Vendors", permission: "mall.read" },
  { to: "/staff/dashboard", label: "Staff", permission: "studio.access" },
  { to: "/staff/library", label: "Staff Library", permission: "library.read" },
  { to: "/studio", label: "Studio", permission: "staff.manage" },
  { to: "/studio/library", label: "Studio Library", permission: "library.read" },
  { to: "/studio/properties", label: "Studio Properties", permission: "properties.read" },
  { to: "/studio/vehicles", label: "Studio Vehicles", permission: "vehicles.read" },
  { to: "/studio/actors", label: "Studio Actors", permission: "actors.read" },
  { to: "/studio/casting/board", label: "Casting Board", permission: "casting.read" },
  { to: "/studio/scenes", label: "Scene Builder", permission: "scenes.read" },
  { to: "/studio/assets/library", label: "Asset Library", permission: "assets.read" },
  { to: "/studio/assets/prompts", label: "Asset Prompts", permission: "assets.prompts.manage" },
  { to: "/studio/timeline", label: "Timeline", permission: "timeline.read" },
  { to: "/studio/continuity", label: "Continuity", permission: "continuity.read" },
  { to: "/studio/staff", label: "Staff Access", permission: "staff.manage" },
  { to: "/studio/story-engine", label: "Story Engine", permission: "story.read" },
  { to: "/studio/production", label: "Production", permission: "production.read" },
  { to: "/studio/production-test", label: "Production Test", permission: "studio.access" },
  { to: "/studio/community", label: "Community", permission: "reader.analytics.read" },
  { to: "/studio/licensing", label: "Studio Licensing", permission: "licensing.read" },
  { to: "/packs", label: "Packs", permission: "packs.build" },
  { to: "/settings", label: "Settings" },
] satisfies Array<{ to: string; label: string; permission?: StudioPermission }>;

export function DesktopSidebar() {
  const { user, hasPermission } = useAuth();
  const visibleItems = items.filter((item) => !item.permission || (user && hasPermission(item.permission)));

  return (
    <aside className="desktop-sidebar">
      <div className="border-b border-white/10 p-5">
        <div className="grid h-12 w-12 place-items-center border border-signal bg-signal text-base font-black text-ink">EOT</div>
        <h1 className="mt-4 text-lg font-black leading-tight">EOT Firebase Studio</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-paper/45">Empire of Trust</p>
      </div>
      <nav className="grid gap-1 p-3" aria-label="Primary desktop navigation">
        {visibleItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link ${isActive ? "side-link-active" : ""}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 p-4">
        <div className="grid gap-2">
          <OfflineStatusBadge />
          <ThemeToggle compact />
        </div>
      </div>
    </aside>
  );
}
