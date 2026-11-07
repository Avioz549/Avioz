"use client";
import type { KeyboardEvent, ReactNode } from "react";
export function SectionTabs<T extends string>({
  id,
  label,
  value,
  items,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  items: readonly { key: T; label: string }[];
  onChange: (value: T) => void;
}) {
  function keydown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const rtl = document.documentElement.dir === "rtl";
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "ArrowRight")
      next = (index + (rtl ? -1 : 1) + items.length) % items.length;
    else if (event.key === "ArrowLeft")
      next = (index + (rtl ? 1 : -1) + items.length) % items.length;
    else return;
    event.preventDefault();
    onChange(items[next].key);
    document.getElementById(`${id}-tab-${items[next].key}`)?.focus();
  }
  return (
    <div className="section-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.key}
          id={`${id}-tab-${item.key}`}
          role="tab"
          aria-selected={value === item.key}
          tabIndex={value === item.key ? 0 : -1}
          aria-controls={`${id}-panel-${item.key}`}
          onKeyDown={(event) => keydown(event, index)}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
export function SectionPanel({
  id,
  value,
  active,
  children,
}: {
  id: string;
  value: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <section
      className="section-panel"
      id={`${id}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${id}-tab-${value}`}
      hidden={active !== value}
    >
      {active === value ? children : null}
    </section>
  );
}
