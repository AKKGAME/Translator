import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SubtitleItem } from '../types';
import { msToTimeSRT } from '../utils/subtitleParser';
import { ZoomIn, ZoomOut, RotateCcw, Clock } from 'lucide-react';
import { StudioContextMenu, ContextMenuState } from './StudioContextMenu';

interface StudioTimelineProps {
  items: SubtitleItem[];
  currentTimeMs: number;
  durationSec: number;
  activeItem: SubtitleItem | null;
  onSeek: (ms: number) => void;
  onSelectSubItem: (item: SubtitleItem) => void;
  onUpdateItem?: (id: number, fields: Partial<SubtitleItem>) => void;
  onSplitAtPlayhead?: (itemId: number) => void;
  onAddSubtitleAtTime?: (timeMs: number) => void;
  onMergeItem?: (id: number) => void;
  onDeleteItem?: (id: number) => void;
  onTranslateSingle?: (item: SubtitleItem) => void;
  displayMode: 'bilingual' | 'main' | 'second';
  isPlaying: boolean;
}

export const StudioTimeline: React.FC<StudioTimelineProps> = ({
  items,
  currentTimeMs,
  durationSec,
  activeItem,
  onSeek,
  onSelectSubItem,
  onUpdateItem,
  onSplitAtPlayhead,
  onAddSubtitleAtTime,
  onMergeItem,
  onDeleteItem,
  onTranslateSingle,
  displayMode,
  isPlaying,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  // Time window view settings (seconds visible in the viewport)
  const [zoomSec, setZoomSec] = useState<number>(24); // 24 seconds visible across width
  const [viewStartSec, setViewStartSec] = useState<number>(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // Dragging edge or body of subtitle block
  const [draggingBlock, setDraggingBlock] = useState<{
    itemId: number;
    mode: 'move' | 'resize-start' | 'resize-end';
    originalStartMs: number;
    originalEndMs: number;
    startClientX: number;
  } | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  // Keep view centered on playhead during playback
  useEffect(() => {
    const curSec = currentTimeMs / 1000;
    const halfZoom = zoomSec / 2;
    // Auto-scroll when playhead approaches edge
    if (curSec < viewStartSec + 1 || curSec > viewStartSec + zoomSec - 1) {
      setViewStartSec(Math.max(0, curSec - halfZoom));
    }
  }, [currentTimeMs, zoomSec, viewStartSec]);

  // Handle timeline horizontal mouse wheel for panning / zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // Zoom
      const newZoom = Math.max(6, Math.min(120, zoomSec + (e.deltaY > 0 ? 3 : -3)));
      setZoomSec(newZoom);
    } else {
      // Pan
      e.preventDefault();
      const deltaSec = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * 0.04;
      setViewStartSec((prev) =>
        Math.max(0, Math.min(Math.max(0, durationSec - zoomSec), prev + deltaSec))
      );
    }
  };

  // Convert clientX to milliseconds
  const getMsFromClientX = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return currentTimeMs;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const secInView = (offsetX / rect.width) * zoomSec;
      const targetSec = Math.max(0, Math.min(durationSec || 9999, viewStartSec + secInView));
      return Math.round(targetSec * 1000);
    },
    [zoomSec, viewStartSec, durationSec, currentTimeMs]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    setIsDraggingPlayhead(true);
    const ms = getMsFromClientX(e.clientX);
    onSeek(ms);
  };

  // Right-click context menu handler
  const handleContextMenu = (e: React.MouseEvent, item?: SubtitleItem) => {
    e.preventDefault();
    e.stopPropagation();
    const timeMs = getMsFromClientX(e.clientX);
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetItem: item || activeItem,
      targetTimeMs: timeMs,
    });
  };

  // Dragging handlers for playhead and block resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        const ms = getMsFromClientX(e.clientX);
        onSeek(ms);
      } else if (draggingBlock && containerRef.current && onUpdateItem) {
        const rect = containerRef.current.getBoundingClientRect();
        const deltaX = e.clientX - draggingBlock.startClientX;
        const deltaSec = (deltaX / rect.width) * zoomSec;
        const deltaMs = Math.round(deltaSec * 1000);

        if (draggingBlock.mode === 'move') {
          const durMs = draggingBlock.originalEndMs - draggingBlock.originalStartMs;
          const newStart = Math.max(0, draggingBlock.originalStartMs + deltaMs);
          const newEnd = newStart + durMs;
          onUpdateItem(draggingBlock.itemId, {
            startMs: newStart,
            endMs: newEnd,
            startTime: msToTimeSRT(newStart),
            endTime: msToTimeSRT(newEnd),
          });
        } else if (draggingBlock.mode === 'resize-start') {
          const newStart = Math.max(0, Math.min(draggingBlock.originalEndMs - 300, draggingBlock.originalStartMs + deltaMs));
          onUpdateItem(draggingBlock.itemId, {
            startMs: newStart,
            startTime: msToTimeSRT(newStart),
          });
        } else if (draggingBlock.mode === 'resize-end') {
          const newEnd = Math.max(draggingBlock.originalStartMs + 300, draggingBlock.originalEndMs + deltaMs);
          onUpdateItem(draggingBlock.itemId, {
            endMs: newEnd,
            endTime: msToTimeSRT(newEnd),
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (isDraggingPlayhead) {
        setIsDraggingPlayhead(false);
      }
      if (draggingBlock) {
        setDraggingBlock(null);
      }
    };

    if (isDraggingPlayhead || draggingBlock) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, draggingBlock, getMsFromClientX, onSeek, zoomSec, onUpdateItem]);

  // Generate seconds marks for ruler
  const viewEndSec = viewStartSec + zoomSec;
  const startIntSec = Math.floor(viewStartSec);
  const endIntSec = Math.ceil(viewEndSec);
  const secondMarks: number[] = [];
  for (let s = startIntSec; s <= endIntSec; s++) {
    if (s >= 0) secondMarks.push(s);
  }

  // Draw audio waveform canvas
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Subtle dark background
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, width, height);

    // Center baseline
    const centerY = height / 2;
    ctx.strokeStyle = '#1d2133';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Generate simulated audio wave peaks aligned with subtitle presence
    const barWidth = 3;
    const barGap = 1.5;
    const totalBars = Math.floor(width / (barWidth + barGap));

    for (let i = 0; i < totalBars; i++) {
      const barX = i * (barWidth + barGap);
      const timeAtBarSec = viewStartSec + (barX / width) * zoomSec;
      const timeAtBarMs = timeAtBarSec * 1000;

      // Check if inside a subtitle block
      const insideSub = items.some((it) => timeAtBarMs >= it.startMs && timeAtBarMs <= it.endMs);

      // Pseudo-random speech amplitude
      let amp = 0.08;
      if (insideSub) {
        // High vocal energy
        const seed = Math.sin(i * 12.345 + timeAtBarSec * 5);
        amp = 0.35 + Math.abs(seed) * 0.55;
      } else {
        // Quiet ambient noise
        const seed = Math.sin(i * 4.5);
        amp = 0.06 + Math.abs(seed) * 0.08;
      }

      const barH = Math.max(3, amp * (height * 0.75));

      // Gradient color: brighter purple for spoken voice, muted slate for pauses
      if (insideSub) {
        ctx.fillStyle = '#7c3aed';
      } else {
        ctx.fillStyle = '#262a40';
      }

      ctx.fillRect(barX, centerY - barH / 2, barWidth, barH);
    }
  }, [items, viewStartSec, zoomSec]);

  // Format time for ruler (MM:SS)
  const formatRulerTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Calculate playhead % position within the visible window
  const playheadPercent = Math.max(
    -2,
    Math.min(102, ((currentTimeMs / 1000 - viewStartSec) / zoomSec) * 100)
  );

  // Overview track calculations
  const totalDur = durationSec || 1437;
  const overviewStartPct = (viewStartSec / totalDur) * 100;
  const overviewWidthPct = Math.min(100, (zoomSec / totalDur) * 100);
  const overviewPlayheadPct = (currentTimeMs / 1000 / totalDur) * 100;

  // Overview track scrubbing
  const handleOverviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = clickPct * totalDur;
    onSeek(Math.round(targetSec * 1000));
    setViewStartSec(Math.max(0, targetSec - zoomSec / 2));
  };

  return (
    <div
      onWheel={handleWheel}
      onContextMenu={(e) => handleContextMenu(e)}
      className="h-[148px] bg-[#0c0d16] border-t border-[#1a1c2b] flex flex-col select-none relative"
    >
      {/* Mini Overview Track with draggable window matching professional DAW/NLE */}
      <div
        onClick={handleOverviewClick}
        className="h-3 bg-[#08090f] border-b border-[#161824] relative cursor-pointer group"
        title="Click to jump across full timeline"
      >
        {/* Render small colored dots for subtitle positions across entire video */}
        {items.map((it) => {
          const l = (it.startMs / 1000 / totalDur) * 100;
          const w = Math.max(0.4, ((it.endMs - it.startMs) / 1000 / totalDur) * 100);
          return (
            <div
              key={it.id}
              style={{ left: `${l}%`, width: `${w}%` }}
              className="absolute top-0.5 bottom-0.5 bg-purple-500/50 rounded-xs"
            />
          );
        })}

        {/* Current View Window box */}
        <div
          style={{
            left: `${overviewStartPct}%`,
            width: `${Math.max(2, overviewWidthPct)}%`,
          }}
          className="absolute top-0 bottom-0 bg-white/10 border-x border-white/30 rounded-xs transition-none"
        />

        {/* Mini playhead marker */}
        <div
          style={{ left: `${overviewPlayheadPct}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
        />
      </div>

      {/* Main Interactive Waveform & Ruler Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="flex-1 relative overflow-hidden cursor-pointer"
      >
        {/* Waveform Canvas */}
        <canvas
          ref={waveformCanvasRef}
          width={1400}
          height={65}
          className="w-full h-[65px] block pointer-events-none opacity-80"
        />

        {/* Timeline Seconds Ruler */}
        <div className="absolute top-0 left-0 right-0 h-5 border-b border-[#1c1e2d] pointer-events-none">
          {secondMarks.map((s) => {
            const leftPct = ((s - viewStartSec) / zoomSec) * 100;
            if (leftPct < -5 || leftPct > 105) return null;
            return (
              <div
                key={s}
                style={{ left: `${leftPct}%` }}
                className="absolute top-0 bottom-0 flex flex-col items-center"
              >
                <div className="h-2 w-px bg-slate-600" />
                <span className="text-[9px] font-mono text-slate-400 mt-0.5 whitespace-nowrap">
                  {formatRulerTime(s)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Subtitle Blocks Track */}
        <div className="absolute top-[68px] left-0 right-0 bottom-0 overflow-hidden">
          {items.map((it) => {
            const startSec = it.startMs / 1000;
            const endSec = it.endMs / 1000;
            const leftPct = ((startSec - viewStartSec) / zoomSec) * 100;
            const widthPct = ((endSec - startSec) / zoomSec) * 100;

            // Don't render out of visible view
            if (leftPct + widthPct < -10 || leftPct > 110) return null;

            const isActive = activeItem?.id === it.id;
            const displayText =
              displayMode === 'second'
                ? it.originalText
                : it.translatedText || it.originalText;

            return (
              <div
                key={it.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSubItem(it);
                  onSeek(it.startMs);
                }}
                onContextMenu={(e) => handleContextMenu(e, it)}
                onMouseDown={(e) => {
                  if (e.button === 0 && !e.defaultPrevented) {
                    // Start dragging whole block to move
                    setDraggingBlock({
                      itemId: it.id,
                      mode: 'move',
                      originalStartMs: it.startMs,
                      originalEndMs: it.endMs,
                      startClientX: e.clientX,
                    });
                  }
                }}
                style={{
                  left: `${leftPct}%`,
                  width: `${Math.max(1.8, widthPct)}%`,
                }}
                className={`absolute top-1 bottom-2 rounded px-2 py-1 text-xs cursor-grab active:cursor-grabbing truncate transition-colors border shadow-sm group select-none ${
                  isActive
                    ? 'bg-[#4c1d95] text-white border-purple-400 ring-1 ring-purple-400/60 z-20 font-medium'
                    : 'bg-[#151722] hover:bg-[#1f2233] text-slate-300 border-[#2b2e44] z-10'
                }`}
                title={`#${it.index}: ${it.translatedText || it.originalText} (${it.startTime} -> ${it.endTime})`}
              >
                {/* Left Resize Handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingBlock({
                      itemId: it.id,
                      mode: 'resize-start',
                      originalStartMs: it.startMs,
                      originalEndMs: it.endMs,
                      startClientX: e.clientX,
                    });
                  }}
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-purple-300/50 rounded-l"
                  title="Drag to adjust start time"
                />

                {/* Subtitle Content */}
                <div className="flex items-center space-x-1 truncate leading-tight pointer-events-none px-1">
                  <span
                    className={`text-[10px] font-mono shrink-0 ${
                      isActive ? 'text-purple-200 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {it.index}
                  </span>
                  <span className="truncate text-[11px] font-sans">
                    {displayText}
                  </span>
                </div>

                {/* Right Resize Handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingBlock({
                      itemId: it.id,
                      mode: 'resize-end',
                      originalStartMs: it.startMs,
                      originalEndMs: it.endMs,
                      startClientX: e.clientX,
                    });
                  }}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-purple-300/50 rounded-r"
                  title="Drag to adjust end time"
                />
              </div>
            );
          })}
        </div>

        {/* Red Playhead Line with glowing indicator */}
        <div
          style={{ left: `${playheadPercent}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
        >
          {/* Top red playhead handle arrow */}
          <div className="w-2.5 h-2.5 bg-red-500 rotate-45 -translate-x-1 -translate-y-1 rounded-xs" />
        </div>
      </div>

      {/* Bottom Status & Controls Bar */}
      <div className="h-6 bg-[#08090e] border-t border-[#181a26] px-3 flex items-center justify-between text-[11px] text-slate-400 font-sans">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 hidden sm:inline">
            Tips: Space to toggle play, Right Click for quick menu
          </span>
          <span className="text-slate-500 sm:hidden">Right-click for options</span>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400">
          {/* Zoom In / Out Buttons */}
          <div className="flex items-center space-x-1 bg-[#131520] border border-[#23273a] px-1 py-0.5 rounded">
            <button
              onClick={() => setZoomSec((prev) => Math.min(120, prev + 6))}
              className="p-0.5 hover:text-white transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1 text-[9px] text-slate-300 font-mono">{zoomSec}s</span>
            <button
              onClick={() => setZoomSec((prev) => Math.max(6, prev - 6))}
              className="p-0.5 hover:text-white transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoomSec(24)}
              className="p-0.5 hover:text-white transition text-slate-500 hover:text-slate-300"
              title="Reset Zoom (24s)"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-slate-300">{formatRulerTime(currentTimeMs / 1000)}</span>
          </div>
        </div>
      </div>

      {/* Right Click Context Menu */}
      <StudioContextMenu
        menuState={contextMenu}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        onPlayFromHere={(ms) => {
          onSeek(ms);
        }}
        onSetStartTimeToPlayhead={(id) => {
          onUpdateItem?.(id, {
            startMs: currentTimeMs,
            startTime: msToTimeSRT(currentTimeMs),
          });
        }}
        onSetEndTimeToPlayhead={(id) => {
          onUpdateItem?.(id, {
            endMs: currentTimeMs,
            endTime: msToTimeSRT(currentTimeMs),
          });
        }}
        onSplitAtPlayhead={onSplitAtPlayhead}
        onAddSubtitleAtTime={onAddSubtitleAtTime}
        onTranslateSingle={onTranslateSingle}
        onMergeWithNext={onMergeItem}
        onDeleteItem={onDeleteItem}
      />
    </div>
  );
};
