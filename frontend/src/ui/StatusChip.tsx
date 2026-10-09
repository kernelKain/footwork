export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "music" | "live" | "event" | "pause";
}) {
  return <p className={`ui-chip ui-chip-${tone}`}>{label}</p>;
}
