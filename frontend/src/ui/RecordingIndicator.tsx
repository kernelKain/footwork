import { useOnstage } from "./motionGuard";

export function RecordingIndicator() {
  const ref = useOnstage<HTMLParagraphElement>();
  return (
    <p ref={ref} className="ui-recording">
      <span className="ui-recording-dot" aria-hidden="true" />
      Recording
    </p>
  );
}
