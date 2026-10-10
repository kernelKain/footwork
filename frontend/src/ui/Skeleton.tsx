export function Skeleton({ label }: { label: string }) {
  return (
    <div className="ui-skeleton" aria-busy="true">
      <span className="ui-visually-hidden">{label}</span>
    </div>
  );
}
