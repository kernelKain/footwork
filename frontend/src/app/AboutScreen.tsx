export function AboutScreen() {
  return (
    <div className="stack">
      <section className="stack" aria-labelledby="about-title">
        <h1 id="about-title">How it works</h1>
        <p>
          Footwork is meant to record a walk in the browser, detect turns, pace changes, pauses, and
          loops, then shape those events into a one-minute instrumental Soundprint.
        </p>
        <p>
          Gemma is meant to arrange anonymized movement events. Eleven Music is meant to render that
          arrangement. Render is meant to host the Python service. This preview does not call them.
        </p>
        <p>
          If a provider is unavailable, the same events are meant to fall back to a deterministic
          Route Sketch. A cached Studio example, when one exists, stays separate from that sketch
          and from this synthetic fixture.
        </p>
      </section>
      <section className="panel" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Privacy and limits</h2>
        <p>
          A later recording stays in the browser until it is sent for processing. Provider prompts
          are not supposed to include coordinates or wall-clock times. A route shape can still be
          identifying, so this is not complete anonymity.
        </p>
        <p className="muted">
          The example on the Soundprint screen is constructed geometry. It is not a person&apos;s
          walk.
        </p>
      </section>
      <p>
        <a href="https://github.com/kernelKain/footwork">Source code</a>
      </p>
    </div>
  );
}
