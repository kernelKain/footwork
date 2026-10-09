import { useState } from "react";

export function StatePicker<T extends string>({
  legend,
  note,
  options,
  value,
  onChange,
}: {
  legend: string;
  note: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="state-picker">
      <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {legend}
      </button>
      {open ? (
        <div className="state-picker-body">
          <p className="muted">{note}</p>
          <div className="state-picker-options">
            {options.map((option) => {
              const selected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(option.id)}
                >
                  {option.label}
                  {selected ? " Showing" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
