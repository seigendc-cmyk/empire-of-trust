import { Link } from "react-router-dom";
import { ThreeDotMenu, type ThreeDotMenuItem } from "./ThreeDotMenu";

interface Action {
  label: string;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
}

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: Action[];
  menuItems?: ThreeDotMenuItem[];
}

export function PageHeader({ eyebrow, title, subtitle, actions = [], menuItems = [] }: Props) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">{eyebrow}</p>}
        <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 line-clamp-2 text-sm leading-6 text-paper/65">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden gap-2 sm:flex">
          {actions.map((action) =>
            action.to ? (
              <Link key={action.label} className={`btn ${action.primary ? "btn-primary" : ""}`} to={action.to}>
                {action.label}
              </Link>
            ) : (
              <button key={action.label} className={`btn ${action.primary ? "btn-primary" : ""}`} onClick={action.onClick}>
                {action.label}
              </button>
            ),
          )}
        </div>
        {(menuItems.length > 0 || actions.length > 0) && (
          <ThreeDotMenu
            items={[
              ...actions.map((action) => ({
                label: action.label,
                href: action.to,
                onSelect: action.onClick,
              })),
              ...menuItems,
            ]}
          />
        )}
      </div>
    </header>
  );
}
