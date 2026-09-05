import React, { useEffect, useRef } from 'react';

interface AnimeSceneCanvasProps {
  isPlaying: boolean;
  currentTimeMs: number;
}

/**
 * Professional Studio Video/Audio Canvas Monitor
 * Replaces the hardcoded demo anime character drawing with a clean studio monitor,
 * audio visualizer waveform, timecode guides, and 16:9 cinematic framing.
 */
export const AnimeSceneCanvas: React.FC<AnimeSceneCanvasProps> = ({
  isPlaying,
  currentTimeMs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Dark Studio Gradient Background
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#090a12');
    bg.addColorStop(0.5, '#0e101c');
    bg.addColorStop(1, '#08090f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle Grid Lines (Studio Viewport alignment lines)
    ctx.strokeStyle = '#181b2e';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Subtitle Safe Area Border Guide (dotted subtle frame)
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.strokeRect(width * 0.05, height * 0.08, width * 0.9, height * 0.84);
    ctx.setLineDash([]);

    // 4. Center Audio Spectrum / Waveform Visualizer
    const t = (currentTimeMs / 1000);
    const barsCount = 64;
    const barWidth = (width * 0.7) / barsCount;
    const startX = width * 0.15;
    const centerY = height * 0.46;

    const waveGrad = ctx.createLinearGradient(0, centerY - 60, 0, centerY + 60);
    waveGrad.addColorStop(0, '#a855f7');
    waveGrad.addColorStop(0.5, '#6366f1');
    waveGrad.addColorStop(1, '#ec4899');

    ctx.fillStyle = waveGrad;

    for (let i = 0; i < barsCount; i++) {
      const x = startX + i * barWidth;
      // Calculate dynamic bar height
      let magnitude = 0;
      if (isPlaying) {
        const s1 = Math.sin(t * 7 + i * 0.25);
        const s2 = Math.cos(t * 11 + i * 0.4);
        const s3 = Math.sin(t * 3 - i * 0.1);
        magnitude = Math.abs(s1 * 0.5 + s2 * 0.35 + s3 * 0.25);
      } else {
        magnitude = Math.abs(Math.sin(i * 0.35)) * 0.2 + 0.05;
      }

      const barHeight = Math.max(3, magnitude * 70);
      const radius = 2;

      // Draw rounded top/bottom bar centered vertically
      const topY = centerY - barHeight / 2;
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(x, topY, Math.max(2, barWidth - 3), barHeight, radius)
        : ctx.rect(x, topY, Math.max(2, barWidth - 3), barHeight);
      ctx.fill();
    }

    // 5. Center Monitor Label & Status
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STUDIO VIDEO MONITOR • 16:9 PREVIEW', width / 2, height * 0.3);

    // Subtle Live / Standby badge
    ctx.fillStyle = isPlaying ? '#10b981' : '#64748b';
    ctx.beginPath();
    ctx.arc(width / 2 - 42, height * 0.3 - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 6. Timecode Overlay in top left
    const totalSec = Math.floor(currentTimeMs / 1000);
    const ms = String(currentTimeMs % 1000).padStart(3, '0');
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    const tcStr = `TC ${hh}:${mm}:${ss}.${ms}`;

    ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(tcStr, width * 0.06, height * 0.13);

    // Top Right Aspect Badge
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(isPlaying ? 'PLAYING [AUDIO SYNC]' : 'PAUSED', width * 0.94, height * 0.13);

  }, [isPlaying, currentTimeMs]);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={540}
      className="w-full h-full object-contain pointer-events-none"
    />
  );
};
