import { signOut } from "firebase/auth";
import { NavLink } from "react-router-dom";
import { auth } from "../lib/firebase";
import type { StudioPermission } from "../lib/staffPermissions";
import { useAuth } from "../state/AuthContext";
import { useTheme } from "../state/ThemeContext";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { OfflineStatusBadge } from "./OfflineStatusBadge";
import { ThemeToggle } from "./ThemeToggle";
import { ThreeDotMenu } from "./ThreeDotMenu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const menuItems: Array<{ label: string; href?: string; onSelect?: () => void; permission?: StudioPermission }> = [
    { label: "Reader", href: "/reader" },
    { label: "Library", href: "/library" },
    { label: "Participation", href: "/participation" },
    { label: "Rankings", href: "/participation/rankings" },
    { label: "Import Booklet", href: "/library/import" },
    { label: "Reader Profile", href: "/reader/profile" },
    { label: "Rewards", href: "/reader/rewards" },
    { label: "Participation", href: "/reader/participation" },
    { label: "Licence", href: "/licence" },
    { label: "Activate Licence", href: "/licence/activate" },
    { label: "Characters", href: "/characters" },
    { label: "Actors", href: "/actors" },
    { label: "Properties", href: "/properties" },
    { label: "Vehicles", href: "/vehicles" },
    { label: "Character Graph", href: "/characters/relationships" },
    { label: "Character Timeline", href: "/characters/timeline" },
    { label: "Universe Search", href: "/universe/search" },
    { label: "Family Tree", href: "/family-tree" },
    { label: "Corporate Network", href: "/corporate-network" },
    { label: "iTred Mall", href: "/mall", permission: "mall.read" },
    { label: "Mall Vendors", href: "/mall/vendors", permission: "mall.read" },
    { label: "Mall Search", href: "/mall/search", permission: "mall.read" },
    { label: "Staff Dashboard", href: "/staff/dashboard", permission: "studio.access" },
    { label: "Staff Library", href: "/staff/library", permission: "library.read" },
    { label: "Studio", href: "/studio", permission: "staff.manage" },
    { label: "Studio Library", href: "/studio/library", permission: "library.read" },
    { label: "Studio Properties", href: "/studio/properties", permission: "properties.read" },
    { label: "Studio Vehicles", href: "/studio/vehicles", permission: "vehicles.read" },
    { label: "Studio Actors", href: "/studio/actors", permission: "actors.read" },
    { label: "Casting Board", href: "/studio/casting/board", permission: "casting.read" },
    { label: "Scene Builder", href: "/studio/scenes", permission: "scenes.read" },
    { label: "Asset Library", href: "/studio/assets/library", permission: "assets.read" },
    { label: "Asset Upload", href: "/studio/assets/upload", permission: "assets.upload" },
    { label: "Asset Prompts", href: "/studio/assets/prompts", permission: "assets.prompts.manage" },
    { label: "Timeline", href: "/studio/timeline", permission: "timeline.read" },
    { label: "Continuity", href: "/studio/continuity", permission: "continuity.read" },
    { label: "Staff Access", href: "/studio/staff", permission: "staff.manage" },
    { label: "Production Test", href: "/studio/production-test", permission: "studio.access" },
    { label: "Community", href: "/studio/community", permission: "reader.analytics.read" },
    { label: "Story Engine", href: "/studio/story-engine", permission: "story.read" },
    { label: "Episode Planner", href: "/studio/story-engine/episode-planner", permission: "story.write" },
    { label: "Prompt Builder", href: "/studio/story-engine/prompt-builder", permission: "story.write" },
    { label: "Studio Licensing", href: "/studio/licensing", permission: "licensing.read" },
    { label: "Studio Agents", href: "/studio/agents", permission: "agents.manage" },
    { label: "Scratch Cards", href: "/studio/scratch-cards", permission: "scratchcards.manage" },
    { label: "Import Pack", href: "/reader/import" },
    { label: theme === "dark" ? "Light Theme" : "Dark Theme", onSelect: toggleTheme },
    ...(user ? [{ label: "Sign out", onSelect: () => signOut(auth) }] : [{ label: "Studio Login", href: "/studio/login" }]),
  ];
  const visibleMenuItems = menuItems.filter((item) => !item.permission || (user && hasPermission(item.permission)));

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
            <div className="hidden min-[460px]:block">
              <ThemeToggle compact />
            </div>
            <ThreeDotMenu
              items={visibleMenuItems}
            />
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
