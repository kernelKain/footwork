export function RouteMarks() {
  return (
    <figure className="ui-route">
      <svg viewBox="0 0 120 48" role="img" aria-label="Route line with a start and a musical beat">
        <title>Route line with a start and a musical beat</title>
        <path className="ui-route-line" d="M8 36 C 28 36 36 12 64 12 H 108" />
        <circle className="ui-waypoint" cx="8" cy="36" r="4" />
        <rect className="ui-beat" x="102" y="6" width="8" height="8" rx="1.5" />
      </svg>
      <figcaption>The circle starts the walk. The square is a musical beat.</figcaption>
    </figure>
  );
}

export function Waveform() {
  const bars = [8, 16, 12, 22, 10, 18, 14, 24, 11, 16];
  return (
    <figure className="ui-wave">
      <svg viewBox="0 0 120 32" role="img" aria-label="Quiet waveform">
        <title>Quiet waveform</title>
        {bars.map((height, index) => (
          <rect
            key={`wave-bar-${index}`}
            x={6 + index * 11}
            y={28 - height}
            width="6"
            height={height}
            rx="2"
          />
        ))}
      </svg>
      <figcaption>A quiet waveform sketch. It is not a recording.</figcaption>
    </figure>
  );
}
