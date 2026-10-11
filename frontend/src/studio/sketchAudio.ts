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

const HIGH_HZ = 523;
const LOW_HZ = 330;
const LOOP_MS = 6_000;
const PAUSE_MS = 10_000;
const BASE_AMP = 0.35;
const PACE_GAIN = 1.4;
const MAX_AMP = 0.72;
const FIFTH = 0.28;

export type SketchMelody = { hz: number; amplitude: number; harmonic: number };

export function sketchMelody(
  timeMs: number,
  durationMs: number,
  events: TimedEvent[],
): SketchMelody {
  const ordered = [...events].sort((left, right) => left.audio_offset_ms - right.audio_offset_ms);
  for (const window of silenceWindows(ordered, durationMs)) {
    if (timeMs >= window.startMs && timeMs < window.endMs) {
      return { hz: 0, amplitude: 0, harmonic: 0 };
    }
  }
  const paces = ordered.filter(
    (event) => event.type === "pace_change" && event.audio_offset_ms <= timeMs,
  ).length;
  const amplitude = Math.min(MAX_AMP, BASE_AMP * PACE_GAIN ** paces);
  const harmonic = paces > 0 ? FIFTH : 0;
  const loop = loopWindow(timeMs, ordered, durationMs);
  if (loop) {
    const span = Math.max(loop.endMs - loop.startMs, 1);
    const progress = Math.min((timeMs - loop.startMs) / span, 1);
    return { hz: HIGH_HZ - progress * (HIGH_HZ - LOW_HZ), amplitude, harmonic };
  }
  return { hz: pitchHz(timeMs, durationMs, ordered), amplitude, harmonic };
}

export function synthesizeSketchWav(durationMs: number, events: TimedEvent[]): ArrayBuffer {
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
  let fifth = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const timeMs = (index / SAMPLE_RATE) * 1000;
    const tone = sketchMelody(timeMs, durationMs, events);
    const sample =
      tone.hz === 0 || tone.amplitude === 0
        ? 0
        : Math.sin(phase) * tone.amplitude + Math.sin(fifth) * tone.amplitude * tone.harmonic;
    if (tone.hz !== 0 && tone.amplitude !== 0) {
      phase += (2 * Math.PI * tone.hz) / SAMPLE_RATE;
      fifth += (2 * Math.PI * tone.hz * 1.5) / SAMPLE_RATE;
    }
    view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true);
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

function silenceWindows(
  events: TimedEvent[],
  durationMs: number,
): { startMs: number; endMs: number }[] {
  return events.flatMap((event) => {
    if (event.type !== "pause") return [];
    const later = events
      .map((item) => item.audio_offset_ms)
      .filter((offset) => offset > event.audio_offset_ms);
    const endMs = Math.min(
      durationMs,
      later.length > 0 ? Math.min(...later) : event.audio_offset_ms + PAUSE_MS,
    );
    return endMs > event.audio_offset_ms ? [{ startMs: event.audio_offset_ms, endMs }] : [];
  });
}

function loopWindow(
  timeMs: number,
  events: TimedEvent[],
  durationMs: number,
): { startMs: number; endMs: number } | null {
  const started = events.filter(
    (event) => event.type === "loop" && event.audio_offset_ms <= timeMs,
  );
  if (started.length === 0) return null;
  const startMs = started[started.length - 1].audio_offset_ms;
  const later = events.map((event) => event.audio_offset_ms).filter((offset) => offset > startMs);
  let endMs = Math.min(durationMs, startMs + LOOP_MS);
  if (later.length > 0) endMs = Math.min(endMs, Math.min(...later));
  if (endMs <= startMs || timeMs >= endMs) return null;
  return { startMs, endMs };
}

function pitchHz(timeMs: number, durationMs: number, events: TimedEvent[]): number {
  const turns = events
    .filter((event) => event.type === "turn")
    .map((event) => event.audio_offset_ms);
  const pauses = events
    .filter((event) => event.type === "pause")
    .map((event) => event.audio_offset_ms);
  const firstTurn = turns[0] ?? durationMs;
  const firstPause = pauses[0] ?? durationMs;
  const later = events
    .map((event) => event.audio_offset_ms)
    .filter((offset) => offset > firstPause);
  let firstPauseEnd = durationMs;
  if (pauses.length > 0) {
    firstPauseEnd = Math.min(
      durationMs,
      later.length > 0 ? Math.min(...later) : firstPause + PAUSE_MS,
    );
    if (firstPauseEnd <= firstPause) firstPauseEnd = durationMs;
  }
  const laterTurns = turns.filter((offset) => offset > firstTurn && offset <= timeMs);
  if (laterTurns.length === 0) {
    return sketchFrequencyHz(timeMs, firstTurn, firstPause, firstPauseEnd);
  }
  const startMs = laterTurns[laterTurns.length - 1];
  const following = events
    .map((event) => event.audio_offset_ms)
    .filter((offset) => offset > startMs);
  const endMs = following.length > 0 ? Math.min(...following) : durationMs;
  const progress = Math.min((timeMs - startMs) / Math.max(endMs - startMs, 1), 1);
  const falling = (laterTurns.length - 1) % 2 === 0;
  if (falling) return HIGH_HZ - progress * (HIGH_HZ - LOW_HZ);
  return LOW_HZ + progress * (HIGH_HZ - LOW_HZ);
}

function writeAscii(bytes: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}
