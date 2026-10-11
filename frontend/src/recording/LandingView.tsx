import { Button } from "../ui/Button";
import { WalkerMark } from "../ui/Walker";
import { MomentExamples } from "./MomentExamples";

type Navigate = (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;

/** Render the walking introduction, moment previews, and optional saved-draft deletion. */
export function LandingView({
  onStart,
  onNavigate,
  onDeleteSavedWalk,
  deleteSavedWalkError,
}: {
  onStart: () => void;
  onNavigate: Navigate;
  onDeleteSavedWalk?: () => void;
  deleteSavedWalkError?: string | null;
}) {
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
          {onDeleteSavedWalk ? (
            <div className="actions">
              <Button variant="destructive" onClick={onDeleteSavedWalk}>
                Delete saved walk
              </Button>
            </div>
          ) : null}
          {deleteSavedWalkError ? <p role="alert">{deleteSavedWalkError}</p> : null}
        </div>
        <figure className="hero-figure">
          <svg viewBox="0 0 320 140" role="img" aria-label="A walk route becoming a short waveform">
            <title>A walk route becoming a short waveform</title>
            <defs>
              <linearGradient id="hero-trace" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--color-route)" />
                <stop offset="0.55" stopColor="var(--color-music)" />
                <stop offset="1" stopColor="var(--color-event)" />
              </linearGradient>
            </defs>
            <path
              className="ui-route-line trace-signature"
              d="M16 108 C 52 108 64 40 112 40 H 156"
            />
            <circle className="ui-waypoint" cx="16" cy="108" r="6" />
            <g transform="translate(2 78) scale(0.7)">
              <WalkerMark pose="ready" />
            </g>
            <rect className="ui-beat" x="148" y="32" width="14" height="14" rx="2" />
            {[18, 28, 16, 36, 22, 32, 14, 26].map((height, index) => (
              <rect
                key={`hero-bar-${index}`}
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

      <MomentExamples />

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
    </div>
  );
}
