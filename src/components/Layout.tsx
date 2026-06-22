import { AppShell } from "./AppShell";

export function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
