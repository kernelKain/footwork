import { useState } from "react";
import { Button } from "../ui/Button";

type MomentId = "turn" | "pause" | "pace";

const MOMENTS: Record<MomentId, { label: string; line: string; visual: string; bars: number[] }> = {
  turn: {
    label: "Turn",
    line: "A sharp turn is meant to change the melody's direction. This change is planned.",
    visual: "A route corner with a musical beat",
    bars: [8, 14, 10, 18, 6, 16],
  },
  pause: {
    label: "Pause",
    line: "A pause is meant to become a musical break. This change is planned.",
    visual: "A route with a gap for a musical break",
    bars: [12, 8, 4, 2, 4, 8],
  },
  pace: {
    label: "Speed",
    line: "A change in pace is meant to change the energy of the piece. This change is planned.",
    visual: "A steadier route with a taller waveform",
    bars: [10, 16, 22, 18, 24, 14],
  },
};

type Navigate = (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;

export function LandingView({
  onStart,
  onNavigate,
}: {
  onStart: () => void;
  onNavigate: Navigate;
}) {
  const [moment, setMoment] = useState<MomentId>("turn");
  const current = MOMENTS[moment];
  return (
    <div className="journey">
      <section className="journey-hero" aria-labelledby="hero-title">
        <div className="journey-copy">
          <h1 id="hero-title">Turn a walk into music.</h1>
          <p>
            Walk outside, and Footwork turns the shape of that walk into a short piece of music.
          </p>
          <div className="actions">
            <Button onClick={onStart}>Start walking</Button>
            <a className="ui-button ui-button-secondary" href="/studio" onClick={onNavigate}>
              Hear an example
            </a>
          </div>
        </div>
        <figure className="hero-figure">
          <svg viewBox="0 0 320 140" role="img" aria-label="A walk route becoming a short waveform">
            <title>A walk route becoming a short waveform</title>
            <path className="ui-route-line" d="M16 108 C 52 108 64 40 112 40 H 156" />
            <circle className="ui-waypoint" cx="16" cy="108" r="6" />
            <rect className="ui-beat" x="148" y="32" width="14" height="14" rx="2" />
            {[18, 28, 16, 36, 22, 32, 14, 26].map((height, index) => (
              <rect
                key={height + index}
                x={186 + index * 16}
                y={108 - height}
                width="8"
                height={height}
                rx="2"
                className="ui-wave-bar"
              />
            ))}
          </svg>
          <figcaption>The route is the score.</figcaption>
        </figure>
      </section>

      <section id="how-it-works" aria-labelledby="steps-title">
        <h2 id="steps-title">Your walk becomes music</h2>
        <ol className="bento">
          <li>
            <h3>Walk naturally</h3>
            <p>Go outside the way you already would. You do not need a special pace.</p>
          </li>
          <li>
            <h3>Footwork notices meaningful movement</h3>
            <p>A sharp turn, a pause, or a change in speed can become a musical moment.</p>
          </li>
          <li>
            <h3>Those moments become your track</h3>
            <p>
              The piece follows the walk. A planned change is not the same as music you have heard.
            </p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="moment-title">
        <h2 id="moment-title">Hear what a moment does</h2>
        <div className="moment-controls" role="group" aria-label="Musical moments">
          {(Object.keys(MOMENTS) as MomentId[]).map((id) => (
            <button
              key={id}
              type="button"
              className="ui-button ui-button-secondary"
              aria-pressed={moment === id}
              onClick={() => setMoment(id)}
            >
              {MOMENTS[id].label}
              {moment === id ? " Showing" : ""}
            </button>
          ))}
        </div>
        <figure className="moment-figure">
          <svg viewBox="0 0 220 72" role="img" aria-label={current.visual}>
            <title>{current.visual}</title>
            {moment === "pause" ? (
              <path className="ui-route-line" d="M12 48 H 70 M 130 48 H 190" />
            ) : (
              <path
                className="ui-route-line"
                d={moment === "turn" ? "M12 56 H 70 V 20 H 140" : "M12 40 C 50 40 80 28 140 28"}
              />
            )}
            <circle className="ui-waypoint" cx="12" cy={moment === "pace" ? 40 : 48} r="5" />
            <rect className="ui-beat" x="132" y="12" width="12" height="12" rx="2" />
            {current.bars.map((height, index) => (
              <rect
                key={height + index}
                x={156 + index * 10}
                y={60 - height}
                width="6"
                height={height}
                rx="2"
                className="ui-wave-bar"
              />
            ))}
          </svg>
          <figcaption>{current.line}</figcaption>
        </figure>
      </section>

      <section aria-labelledby="before-title">
        <h2 id="before-title">Before you go</h2>
        <div className="bento">
          <article>
            <h3>Location</h3>
            <p>
              A real walk asks this browser for your location. This practice explains that first and
              does not ask yet.
            </p>
          </article>
          <article>
            <h3>What is recorded</h3>
            <p>
              A real walk stays on this phone until you end it. This practice does not read or save
              your location.
            </p>
          </article>
          <article>
            <h3>Outside</h3>
            <p>Watch the path, not the screen. Stop if you need to cross a road or rest.</p>
          </article>
          <article>
            <h3>Phone and browser</h3>
            <p>
              Keep this tab open. A real walk needs a browser that can share location, and the phone
              may still sleep.
            </p>
          </article>
        </div>
      </section>

      <section className="journey-close" aria-labelledby="close-title">
        <h2 id="close-title">Ready when you are</h2>
        <p>Start a practice walk, or hear the labeled example.</p>
        <div className="actions">
          <Button onClick={onStart}>Start walking</Button>
          <a className="ui-button ui-button-secondary" href="/studio" onClick={onNavigate}>
            Hear an example
          </a>
        </div>
      </section>
      <footer className="journey-footer">
        <p>Footwork practice. A real walk is not saved on this page.</p>
      </footer>
    </div>
  );
}
