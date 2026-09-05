import React, { useEffect, useRef } from 'react';
import {
  Play,
  Scissors,
  Plus,
  Trash2,
  Sparkles,
  GitMerge,
  Copy,
  Clock,
  ArrowRightToLine,
  ArrowLeftToLine,
} from 'lucide-react';
import { SubtitleItem } from '../types';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetItem?: SubtitleItem | null;
  targetTimeMs?: number;
}

interface StudioContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
  onPlayFromHere?: (ms: number) => void;
  onSetStartTimeToPlayhead?: (itemId: number) => void;
  onSetEndTimeToPlayhead?: (itemId: number) => void;
  onSplitAtPlayhead?: (itemId: number) => void;
  onAddSubtitleAtTime?: (timeMs: number) => void;
  onTranslateSingle?: (item: SubtitleItem) => void;
  onMergeWithNext?: (itemId: number) => void;
  onDeleteItem?: (itemId: number) => void;
}

export const StudioContextMenu: React.FC<StudioContextMenuProps> = ({
  menuState,
  onClose,
  onPlayFromHere,
  onSetStartTimeToPlayhead,
  onSetEndTimeToPlayhead,
  onSplitAtPlayhead,
  onAddSubtitleAtTime,
  onTranslateSingle,
  onMergeWithNext,
  onDeleteItem,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (menuState.isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.isOpen, onClose]);

  if (!menuState.isOpen) return null;

  // Keep menu within viewport bounds
  const x = Math.min(window.innerWidth - 240, Math.max(10, menuState.x));
  const y = Math.min(window.innerHeight - 340, Math.max(10, menuState.y));

  const item = menuState.targetItem;
  const timeMs = menuState.targetTimeMs ?? (item ? item.startMs : 0);

  const copyText = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 w-56 bg-[#141622] border border-[#2e324a] rounded-lg shadow-2xl py-1 text-xs text-slate-200 font-sans backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      {/* Target Item Title if any */}
      {item && (
        <div className="px-3 py-1.5 border-b border-[#23273a] text-[11px] text-purple-400 font-semibold flex items-center justify-between">
          <span>#{item.index} စာကြောင်း ပြင်ဆင်မှု</span>
          <span className="text-[10px] font-mono text-slate-500">{item.startTime}</span>
        </div>
      )}

      <div className="py-1">
        {/* Play from here */}
        <button
          onClick={() => {
            onPlayFromHere?.(timeMs);
            onClose();
          }}
          className="w-full px-3 py-1.5 text-left flex items-center space-x-2.5 hover:bg-purple-600/20 hover:text-purple-300 transition"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>ဤနေရာမှ စတင်ဖွင့်မည်</span>
        </button>

        {item && (
          <>
            {/* Set Start Time to Current Playhead */}
            <button
              onClick={() => {
                onSetStartTimeToPlayhead?.(item.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#1f2337] transition text-slate-300"
            >
              <div className="flex items-center space-x-2.5">
                <ArrowRightToLine className="w-3.5 h-3.5 text-amber-400" />
                <span>စမှတ်ကို လက်ရှိသို့ရွှေ့</span>
              </div>
              <kbd className="text-[9px] text-slate-500 font-mono">Alt+[</kbd>
            </button>

            {/* Set End Time to Current Playhead */}
            <button
              onClick={() => {
                onSetEndTimeToPlayhead?.(item.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#1f2337] transition text-slate-300"
            >
              <div className="flex items-center space-x-2.5">
                <ArrowLeftToLine className="w-3.5 h-3.5 text-cyan-400" />
                <span>ဆုံးမှတ်ကို လက်ရှိသို့ရွှေ့</span>
              </div>
              <kbd className="text-[9px] text-slate-500 font-mono">Alt+]</kbd>
            </button>

            {/* Split Subtitle at Playhead */}
            <button
              onClick={() => {
                onSplitAtPlayhead?.(item.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#1f2337] transition text-slate-300"
            >
              <div className="flex items-center space-x-2.5">
                <Scissors className="w-3.5 h-3.5 text-rose-400" />
                <span>လက်ရှိနေရာမှ ၂ ပိုင်းခွဲ</span>
              </div>
              <kbd className="text-[9px] text-slate-500 font-mono">Ctrl+K</kbd>
            </button>

            {/* Single Line AI Translate */}
            <button
              onClick={() => {
                onTranslateSingle?.(item);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center space-x-2.5 hover:bg-rose-500/20 hover:text-rose-300 transition text-rose-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>AI ဖြင့် ဘာသာပြန်မည်</span>
            </button>
          </>
        )}
      </div>

      <div className="border-t border-[#23273a] my-1" />

      <div className="py-1">
        {/* Insert Subtitle here */}
        <button
          onClick={() => {
            onAddSubtitleAtTime?.(timeMs);
            onClose();
          }}
          className="w-full px-3 py-1.5 text-left flex items-center space-x-2.5 hover:bg-[#1f2337] transition text-slate-300"
        >
          <Plus className="w-3.5 h-3.5 text-green-400" />
          <span>ဤနေရာတွင် စာကြောင်းသစ်ထည့်</span>
        </button>

        {item && (
          <>
            {/* Merge with next */}
            <button
              onClick={() => {
                onMergeWithNext?.(item.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center space-x-2.5 hover:bg-[#1f2337] transition text-slate-300"
            >
              <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
              <span>နောက်စာကြောင်းနှင့် ပေါင်းမည်</span>
            </button>

            {/* Copy Subtitle Text */}
            {item.translatedText && (
              <button
                onClick={() => copyText(item.translatedText)}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2.5 hover:bg-[#1f2337] transition text-slate-300"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>မြန်မာစာသား ကူးယူမည်</span>
              </button>
            )}

            {item.originalText && (
              <button
                onClick={() => copyText(item.originalText)}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2.5 hover:bg-[#1f2337] transition text-slate-300"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>မူရင်းစာသား ကူးယူမည်</span>
              </button>
            )}

            {/* Delete Line */}
            <button
              onClick={() => {
                onDeleteItem?.(item.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center space-x-2.5 hover:bg-red-500/20 hover:text-red-400 transition text-red-400 border-t border-[#23273a] mt-1 pt-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>စာကြောင်း ဖျက်မည်</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
