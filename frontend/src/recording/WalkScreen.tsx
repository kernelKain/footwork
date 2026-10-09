type WalkScreenProps = {
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
};

export function WalkScreen({ onNavigate }: WalkScreenProps) {
  return (
    <div className="stack">
      <section className="stack" aria-labelledby="walk-title">
        <h1 id="walk-title">Footwork</h1>
        <p className="lede">
          A recorded walk becomes a short instrumental piece and a Soundprint that moves with it. A
          sharp turn is meant to change the melody&apos;s direction. A pause is meant to become a
          musical break.
        </p>
        <div className="actions">
          <a className="action" href="/studio" onClick={onNavigate}>
            Play example
          </a>
          <a className="action secondary" href="/about" onClick={onNavigate}>
            How it works
          </a>
        </div>
      </section>
      <section className="panel" aria-labelledby="recording-title">
        <h2 id="recording-title">Recording</h2>
        <p>No walk is stored on this device.</p>
        <p className="muted">
          Duration and signal quality appear here only after a real recording starts. This preview
          does not request location access.
        </p>
      </section>
    </div>
  );
}
