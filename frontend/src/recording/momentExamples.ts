import { synthesizeSketchWav, type TimedEvent } from "../studio/sketchAudio";

export const PREVIEW_MS = 2_400;
export const TURN_AT_MS = 1_200;
export const PACE_AT_MS = 1_200;
export const PAUSE_GAP_MS = { startMs: 800, endMs: 1_600 };

export type MomentExampleId = "turn" | "pause" | "pace";

export type MomentBar = { x: number; height: number };

export type MomentExample = {
  id: MomentExampleId;
  title: string;
  copy: string;
  figureLabel: string;
  previewLabel: string;
  stopLabel: string;
  align: number;
  routes: string[];
  contour: string | null;
  silence: { x1: number; x2: number } | null;
  samples: number[];
  bars: MomentBar[];
};

const TURN_EVENTS: TimedEvent[] = [{ type: "turn", audio_offset_ms: TURN_AT_MS }];
const PACE_EVENTS: TimedEvent[] = [{ type: "pace_change", audio_offset_ms: PACE_AT_MS }];

export const momentExamples: readonly MomentExample[] = [
  {
    id: "turn",
    title: "Turn",
    copy: "A sharp corner changes the melody's direction.",
    figureLabel: "A sharp route corner aligned with a pitch line that falls, then rises.",
    previewLabel: "Preview turn illustration",
    stopLabel: "Stop turn illustration",
    align: 120,
    routes: ["M16 52H120V16H248"],
    contour: "M16 88L120 120L248 84",
    silence: null,
    samples: [],
    bars: [],
  },
  {
    id: "pause",
    title: "Pause",
    copy: "A pause becomes silence.",
    figureLabel: "Two disconnected route segments aligned with a silent break in the waveform.",
    previewLabel: "Preview pause illustration",
    stopLabel: "Stop pause illustration",
    align: 136,
    routes: ["M16 40H96", "M176 40H248"],
    contour: null,
    silence: { x1: 96, x2: 176 },
    samples: [],
    bars: [
      { x: 24, height: 28 },
      { x: 44, height: 22 },
      { x: 64, height: 30 },
      { x: 84, height: 18 },
      { x: 188, height: 20 },
      { x: 208, height: 28 },
      { x: 228, height: 24 },
    ],
  },
  {
    id: "pace",
    title: "Pace change",
    copy: "A change in pace makes the pulse taller.",
    figureLabel: "Route marks get closer as the musical pulse gets taller.",
    previewLabel: "Preview pace illustration",
    stopLabel: "Stop pace illustration",
    align: 100,
    routes: [],
    contour: null,
    silence: null,
    samples: [18, 48, 78, 114, 132, 150, 168, 186, 204, 222, 240],
    bars: [
      { x: 22, height: 12 },
      { x: 50, height: 14 },
      { x: 78, height: 12 },
      { x: 114, height: 30 },
      { x: 138, height: 34 },
      { x: 162, height: 32 },
      { x: 186, height: 36 },
      { x: 210, height: 34 },
      { x: 234, height: 32 },
    ],
  },
];

export function momentEvents(id: MomentExampleId): TimedEvent[] {
  if (id === "turn") return TURN_EVENTS;
  if (id === "pace") return PACE_EVENTS;
  return [];
}

/** A short browser illustration. Turn and pace use the sketch. Pause writes silence into that tone. */
export function momentPreviewWav(id: MomentExampleId): ArrayBuffer {
  if (id === "pause") {
    return silenceGap(
      synthesizeSketchWav(PREVIEW_MS, []),
      PAUSE_GAP_MS.startMs,
      PAUSE_GAP_MS.endMs,
    );
  }
  return synthesizeSketchWav(PREVIEW_MS, momentEvents(id));
}

function silenceGap(wav: ArrayBuffer, startMs: number, endMs: number): ArrayBuffer {
  const copy = wav.slice(0);
  const view = new DataView(copy);
  const rate = view.getUint32(24, true);
  const start = Math.floor((rate * startMs) / 1000);
  const end = Math.min(Math.floor((rate * endMs) / 1000), (copy.byteLength - 44) / 2);
  for (let index = start; index < end; index += 1) view.setInt16(44 + index * 2, 0, true);
  return copy;
}
