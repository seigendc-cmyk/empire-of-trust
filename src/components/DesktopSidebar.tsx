import { NavLink } from "react-router-dom";
import { OfflineStatusBadge } from "./OfflineStatusBadge";

const items = [
  { to: "/reader", label: "Reader" },
  { to: "/reader/profile", label: "Reader Profile" },
  { to: "/reader/rewards", label: "Rewards" },
  { to: "/reader/participation", label: "Participation" },
  { to: "/licence", label: "Licence" },
  { to: "/characters", label: "Universe" },
  { to: "/mall", label: "iTred Mall" },
  { to: "/mall/vendors", label: "Vendors" },
  { to: "/studio", label: "Studio" },
  { to: "/studio/story-engine", label: "Story Engine" },
  { to: "/studio/production", label: "Production" },
  { to: "/studio/licensing", label: "Studio Licensing" },
  { to: "/packs", label: "Packs" },
  { to: "/settings", label: "Settings" },
];

export function DesktopSidebar() {
  return (
    <aside className="desktop-sidebar">
      <div className="border-b border-white/10 p-5">
        <div className="grid h-12 w-12 place-items-center border border-signal bg-signal text-base font-black text-ink">EOT</div>
        <h1 className="mt-4 text-lg font-black leading-tight">EOT Firebase Studio</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-paper/45">Empire of Trust</p>
      </div>
      <nav className="grid gap-1 p-3" aria-label="Primary desktop navigation">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link ${isActive ? "side-link-active" : ""}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 p-4">
        <OfflineStatusBadge />
      </div>
    </aside>
  );
}
