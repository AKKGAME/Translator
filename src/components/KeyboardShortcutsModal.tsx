import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'ဗီဒီယို ဖွင့်မည် / ရပ်မည် (Toggle Play/Pause)' },
    { key: '← / →', desc: '3 စက္ကန့် ရှေ့/နောက် ကျော်မည် (Seek ±3s)' },
    { key: '↑ / ↓', desc: 'ယခင် / နောက် စာကြောင်းသို့ သွားမည် (Jump Subtitle)' },
    { key: 'Ctrl + Z', desc: 'နောက်ဆုံး ပြင်ဆင်မှုကို ပြန်ဖျက်မည် (Undo)' },
    { key: 'Ctrl + Y', desc: 'ရှေ့သို့ ပြန်သွားမည် (Redo)' },
    { key: 'Alt + [', desc: 'လက်ရှိ ဗီဒီယိုနေရာကို စတင်ချိန် သတ်မှတ်မည်' },
    { key: 'Alt + ]', desc: 'လက်ရှိ ဗီဒီယိုနေရာကို ပြီးဆုံးချိန် သတ်မှတ်မည်' },
    { key: 'Ctrl + K', desc: 'လက်ရှိနေရာမှ စာတန်းကို ၂ ပိုင်းခွဲမည် (Split Subtitle)' },
    { key: 'Right Click', desc: 'အမြန်ပြင်ဆင်မှု မီနူး ဖွင့်မည် (Context Menu)' },
    { key: 'Esc', desc: 'ဖွင့်ထားသော ဝင်းဒိုးများ ပိတ်မည်' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-[#131522] border border-[#272a42] rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222538] bg-[#0e0f1a]">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-slate-100">
              ကီးဘုတ် ဖြတ်လမ်းများ (Keyboard Shortcuts)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 text-xs">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 border-b border-[#1f2235] last:border-0"
            >
              <span className="text-slate-300">{s.desc}</span>
              <kbd className="px-2 py-0.5 bg-[#0a0b12] text-purple-300 font-mono text-[11px] rounded border border-[#2d3148] shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 bg-[#0e0f1a] border-t border-[#222538] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#6d28d9] hover:bg-[#7c3aed] text-white rounded text-xs font-semibold transition"
          >
            နားလည်ပါပြီ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
