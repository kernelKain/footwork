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
  return (
    <fieldset className="state-picker">
      <legend>{legend}</legend>
      <p className="muted">{note}</p>
      <div className="state-picker-options">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
