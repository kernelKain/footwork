export function TimerDisplay({
  label,
  value,
  clock,
}: {
  label: string;
  value: string;
  clock?: string;
}) {
  return (
    <p className="ui-timer" data-clock={clock}>
      <span className="ui-visually-hidden">{label}</span>
      {value}
    </p>
  );
}
