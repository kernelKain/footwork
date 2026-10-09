export function TimerDisplay({ label, value }: { label: string; value: string }) {
  return (
    <p className="ui-timer">
      <span className="ui-visually-hidden">{label}</span>
      {value}
    </p>
  );
}
