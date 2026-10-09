import { useOnstage } from "./motionGuard";

export type WalkerPose = "ready" | "stride" | "still" | "playback";

export function WalkerMark({ pose }: { pose: WalkerPose }) {
  return (
    <g className={`walker walker-${pose}`}>
      <circle className="walker-head" cx="12" cy="5" r="3" />
      <path className="walker-body" d="M12 8 L12 18" />
      <path className="walker-arm walker-arm-a" d="M12 12 L7 16" />
      <path className="walker-arm walker-arm-b" d="M12 12 L17 16" />
      <path className="walker-leg walker-leg-a" d="M12 18 L8 28" />
      <path className="walker-leg walker-leg-b" d="M12 18 L16 28" />
    </g>
  );
}

export function Walker({ pose }: { pose: WalkerPose }) {
  const ref = useOnstage<SVGSVGElement>();
  return (
    <svg
      ref={ref}
      className="walker-frame"
      viewBox="0 0 24 32"
      width="24"
      height="32"
      aria-hidden="true"
    >
      <WalkerMark pose={pose} />
    </svg>
  );
}
