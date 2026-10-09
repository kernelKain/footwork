import { useState, type ReactNode } from "react";

export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="ui-disclosure">
      <button
        type="button"
        className="ui-button ui-button-secondary"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {title}
      </button>
      {open ? <div className="ui-disclosure-panel">{children}</div> : null}
    </section>
  );
}
