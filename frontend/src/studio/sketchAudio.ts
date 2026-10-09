export type TimedEvent = {
  type: "turn" | "pace_change" | "pause" | "loop";
  audio_offset_ms: number;
};

const SAMPLE_RATE = 16000;

export function pauseWindow(
  events: TimedEvent[],
  durationMs: number,
): { startMs: number; endMs: number } | null {
  const pause = events.find((event) => event.type === "pause");
  if (!pause) return null;
  const next = events
    .map((event) => event.audio_offset_ms)
    .filter((offset) => offset > pause.audio_offset_ms)
    .sort((left, right) => left - right)[0];
  const endMs = Math.min(durationMs, next ?? pause.audio_offset_ms + 10_000);
  return { startMs: pause.audio_offset_ms, endMs };
}

export function sketchFrequencyHz(
  timeMs: number,
  turnMs: number,
  pauseStartMs: number,
  pauseEndMs: number,
): number {
  if (timeMs >= pauseStartMs && timeMs < pauseEndMs) return 0;
  if (timeMs < turnMs) {
    const progress = turnMs === 0 ? 1 : timeMs / turnMs;
    return 523 - progress * (523 - 330);
  }
  if (timeMs < pauseStartMs) {
    const span = Math.max(pauseStartMs - turnMs, 1);
    const progress = Math.min((timeMs - turnMs) / span, 1);
    return 330 + progress * (523 - 330);
  }
  return 392;
}

export function synthesizeSketchWav(durationMs: number, events: TimedEvent[]): ArrayBuffer {
  const turnMs = events.find((event) => event.type === "turn")?.audio_offset_ms ?? durationMs;
  const pause = pauseWindow(events, durationMs) ?? { startMs: durationMs, endMs: durationMs };
  const sampleCount = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, sampleCount * 2, true);

  let phase = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const timeMs = (index / SAMPLE_RATE) * 1000;
    const frequency = sketchFrequencyHz(timeMs, turnMs, pause.startMs, pause.endMs);
    const amplitude = frequency === 0 ? 0 : Math.sin(phase) * 0.35;
    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
    view.setInt16(44 + index * 2, Math.round(amplitude * 32767), true);
  }
  return buffer;
}

export function meanAbsoluteSample(wav: ArrayBuffer, startMs: number, endMs: number): number {
  const view = new DataView(wav);
  const start = Math.max(0, Math.floor((SAMPLE_RATE * startMs) / 1000));
  const end = Math.min(Math.floor((SAMPLE_RATE * endMs) / 1000), (wav.byteLength - 44) / 2);
  if (end <= start) return 0;
  let total = 0;
  for (let index = start; index < end; index += 1) {
    total += Math.abs(view.getInt16(44 + index * 2, true));
  }
  return total / (end - start);
}

function writeAscii(bytes: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}
