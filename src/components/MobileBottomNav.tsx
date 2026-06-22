import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Home", glyph: "H" },
  { to: "/reader", label: "Read", glyph: "R" },
  { to: "/mall", label: "Mall", glyph: "M" },
  { to: "/studio", label: "Studio", glyph: "S" },
];

export function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `mobile-tab ${isActive ? "mobile-tab-active" : ""}`}>
          <span className="mobile-tab-glyph">{item.glyph}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
