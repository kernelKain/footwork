import type { GenerationStageId } from "./generationContract";
import { WalkerMark } from "../ui/Walker";

export function GenerationFigure({ stageId }: { stageId: GenerationStageId }) {
  const pose = stageId === "reading_walk" ? "stride" : "still";
  return (
    <div className="generation-figure" data-stage={stageId}>
      <svg viewBox="0 0 160 56" aria-hidden="true">
        <g transform="translate(4 12)">
          <WalkerMark pose={pose} />
        </g>
        {stageId === "reading_walk" ? <RouteDots /> : null}
        {stageId === "finding_moments" ? (
          <>
            <RouteDots />
            <circle className="route-turn" cx="78" cy="24" r="3" />
            <rect className="route-pause" x="108" y="18" width="6" height="6" />
          </>
        ) : null}
        {stageId === "shaping_music" ? <WaveBars /> : null}
        {stageId === "recording_piece" ? <CoverFrame /> : null}
      </svg>
    </div>
  );
}

function RouteDots() {
  return (
    <g>
      <path className="route-path generation-route" d="M40 40 H72 V18 H128" pathLength={100} />
      <circle className="route-start" cx="40" cy="40" r="2.4" />
      <circle className="route-start" cx="72" cy="40" r="2" />
      <circle className="route-start" cx="72" cy="18" r="2" />
      <circle className="route-end" cx="128" cy="18" r="2.6" />
    </g>
  );
}

function WaveBars() {
  return (
    <g>
      {[10, 18, 12, 24, 16, 22, 8].map((height, index) => (
        <rect
          key={`generation-bar-${index}`}
          className="moment-wave"
          x={48 + index * 12}
          y={40 - height}
          width="6"
          height={height}
          rx="1"
        />
      ))}
    </g>
  );
}

function CoverFrame() {
  return (
    <g>
      <rect className="generation-cover" x="52" y="8" width="40" height="40" rx="4" />
      <path className="route-path" d="M60 38 H72 V18 H84" pathLength={100} />
    </g>
  );
}
