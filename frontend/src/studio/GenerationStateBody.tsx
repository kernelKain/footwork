import { StateMessage } from "../components/StateMessage";

export const GENERATION_STATES = [
  { id: "fixture", label: "Synthetic fixture" },
  { id: "loading", label: "Processing" },
  { id: "partial", label: "Partial" },
  { id: "quota", label: "Quota" },
  { id: "provider", label: "Provider failure" },
] as const;

export type GenerationStateId = (typeof GENERATION_STATES)[number]["id"];

export function GenerationStateBody({
  state,
  onShowFixture,
}: {
  state: Exclude<GenerationStateId, "fixture">;
  onShowFixture: () => void;
}) {
  if (state === "loading") {
    return (
      <StateMessage title="Processing" tone="status">
        <p>This preview is not running generation and did not call a provider.</p>
        <ol>
          <li>Processing movement</li>
          <li>Arranging</li>
          <li>Composing</li>
        </ol>
      </StateMessage>
    );
  }
  if (state === "partial") {
    return (
      <StateMessage title="Partial" tone="status">
        <p>
          Partial result. The trace can be shown, but it does not contain enough event variety.
          Absent mappings stay absent. This is not a completed Studio Track.
        </p>
        <p>
          <button className="action" type="button" onClick={onShowFixture}>
            Show the synthetic example
          </button>
        </p>
      </StateMessage>
    );
  }
  if (state === "quota") {
    return (
      <StateMessage title="Quota" tone="alert">
        <p>
          Daily generation limit reached. Try again after the limit resets. No account balance is
          shown. A Route Sketch and the separate example stay available.
        </p>
        <p>
          <button className="action" type="button" onClick={onShowFixture}>
            Show the synthetic example
          </button>
        </p>
      </StateMessage>
    );
  }
  return (
    <StateMessage title="Provider failure" tone="alert">
      <p>Arrangement service unavailable; creating Route Sketch.</p>
      <p>Studio generation unavailable; your movement sketch is ready.</p>
      <p>This preview did not call Gemma or ElevenLabs, and it did not produce a Studio Track.</p>
      <p>
        <button className="action" type="button" onClick={onShowFixture}>
          Show the synthetic example
        </button>
      </p>
    </StateMessage>
  );
}
