export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "music" | "live";
}) {
  return <p className={`ui-chip ui-chip-${tone}`}>{label}</p>;
}
