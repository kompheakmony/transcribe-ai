import { useRef, useEffect } from 'react';

interface AudioWaveformProps {
  /** Normalized peak amplitudes (0–1) */
  peaks: Float32Array;
  /** Total width in pixels (duration × zoom) */
  width: number;
  /** Track height in pixels */
  height: number;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
}

export function AudioWaveform({ peaks, width, height, currentTime, duration }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const barCount = peaks.length;
    const barWidth = width / barCount;
    const playedX = duration > 0 ? (currentTime / duration) * width : 0;

    const centerY = height / 2;

    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth;
      const amplitude = peaks[i];
      const barH = Math.max(1, amplitude * (height * 0.8));

      const isPast = x < playedX;
      ctx.fillStyle = isPast ? '#8B8B60' : '#444';

      // Draw symmetrical bar from center
      ctx.fillRect(
        x,
        centerY - barH / 2,
        Math.max(1, barWidth - 0.5),
        barH,
      );
    }
  }, [peaks, width, height, currentTime, duration]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
}
