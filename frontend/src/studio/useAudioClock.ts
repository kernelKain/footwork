import { useEffect, useRef, useState } from "react";

export function useAudioClock(source: string, durationMs: number) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let frame = 0;
    const readClock = () => setTimeMs(Math.round(audio.currentTime * 1000));
    const tick = () => {
      readClock();
      if (!audio.paused) frame = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      setPlaybackError(null);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(frame);
      readClock();
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
    };
  }, [source]);

  const seek = (nextMs: number) => {
    const bounded = Math.min(durationMs, Math.max(0, nextMs));
    const audio = audioRef.current;
    if (audio) audio.currentTime = bounded / 1000;
    setTimeMs(Math.round(bounded));
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => {
        setPlaybackError("Playback did not start. Press Play to try again.");
      });
      return;
    }
    audio.pause();
  };

  return { audioRef, timeMs, playing, playbackError, seek, toggle };
}
