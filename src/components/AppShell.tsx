import { signOut } from "firebase/auth";
import { NavLink } from "react-router-dom";
import { auth } from "../lib/firebase";
import { useAuth } from "../state/AuthContext";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { OfflineStatusBadge } from "./OfflineStatusBadge";
import { ThreeDotMenu } from "./ThreeDotMenu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="shell app-frame">
      <DesktopSidebar />
      <div className="app-main">
        <header className="app-header">
          <NavLink to="/" className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-signal bg-signal text-sm font-black text-ink">EOT</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">Empire of Trust</span>
              <span className="block truncate text-xs text-paper/50">Firebase Studio</span>
            </span>
          </NavLink>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden min-[380px]:block">
              <OfflineStatusBadge />
            </div>
            <ThreeDotMenu
              items={[
                { label: "Reader", href: "/reader" },
                { label: "Reader Profile", href: "/reader/profile" },
                { label: "Rewards", href: "/reader/rewards" },
                { label: "Participation", href: "/reader/participation" },
                { label: "Licence", href: "/licence" },
                { label: "Activate Licence", href: "/licence/activate" },
                { label: "Characters", href: "/characters" },
                { label: "Universe Search", href: "/universe/search" },
                { label: "Family Tree", href: "/family-tree" },
                { label: "Corporate Network", href: "/corporate-network" },
                { label: "iTred Mall", href: "/mall" },
                { label: "Mall Vendors", href: "/mall/vendors" },
                { label: "Mall Search", href: "/mall/search" },
                { label: "Studio", href: "/studio" },
                { label: "Story Engine", href: "/studio/story-engine" },
                { label: "Episode Planner", href: "/studio/story-engine/episode-planner" },
                { label: "Prompt Builder", href: "/studio/story-engine/prompt-builder" },
                { label: "Studio Licensing", href: "/studio/licensing" },
                { label: "Studio Agents", href: "/studio/agents" },
                { label: "Scratch Cards", href: "/studio/scratch-cards" },
                { label: "Import Pack", href: "/reader/import" },
                ...(user ? [{ label: "Sign out", onSelect: () => signOut(auth) }] : [{ label: "Studio Login", href: "/studio/login" }]),
              ]}
            />
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
