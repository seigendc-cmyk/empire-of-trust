import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export interface ThreeDotMenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
}

export function ThreeDotMenu({ items }: { items: ThreeDotMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button className="icon-button" type="button" aria-label="More actions" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true" className="text-lg leading-none">...</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 max-h-[min(32rem,calc(100dvh-6rem))] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto border border-white/10 bg-graphite shadow-2xl shadow-black/40">
          {items.map((item) =>
            item.href ? (
              <Link key={item.label} className="menu-item" to={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                className="menu-item w-full text-left"
                type="button"
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
