import React, { useState } from 'react';
import { DonationConfig } from '../types';
import {
  Heart,
  X,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Smartphone,
  CreditCard,
  Coffee,
} from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationConfig?: DonationConfig;
}

const DEFAULT_DONATION: DonationConfig = {
  kpayPhone: '09770033353',
  kpayName: 'Aung Kyaw Khant',
  wavePhone: '09668888555',
  waveName: 'Aung Kyaw Khant',
  note: 'Server ဖိုးနှင့် AI ဘာသာပြန်စရိတ် ကူညီထောက်ပံ့ပေးသော စိတ်ကောင်းစေတနာရှင်များအားလုံးကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်။',
};

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  donationConfig,
}) => {
  const config = { ...DEFAULT_DONATION, ...donationConfig };
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Background Accent */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Heart className="w-6 h-6 fill-current text-rose-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                ကူညီထောက်ပံ့ရန် (Support & Donate)
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                AnimeGabar AI Subtitle Translator
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-100/90 mt-2 bg-black/15 p-2.5 rounded-xl border border-white/10">
            {config.note}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* KBZPay Card */}
          <div className="bg-slate-950 border border-blue-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-500/20">
                  KPay
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    KBZPay (KPay)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    အကောင့်အမည်: <span className="text-slate-200 font-medium">{config.kpayName || 'Admin'}</span>
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                KBZ Pay
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-mono font-bold text-slate-100 tracking-wider">
                  {config.kpayPhone || '09xxxxxxxx'}
                </span>
              </div>
              <button
                onClick={() => handleCopy(config.kpayPhone, 'kpay')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  copiedKey === 'kpay'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                }`}
              >
                {copiedKey === 'kpay' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>ကူးပြီးပါပြီ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>နံပါတ်ကူးမည်</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Wave Money Card */}
          <div className="bg-slate-950 border border-amber-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-amber-500/20">
                  Wave
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    Wave Money
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    အကောင့်အမည်: <span className="text-slate-200 font-medium">{config.waveName || 'Admin'}</span>
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                WavePay
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-mono font-bold text-slate-100 tracking-wider">
                  {config.wavePhone || '09xxxxxxxx'}
                </span>
              </div>
              <button
                onClick={() => handleCopy(config.wavePhone, 'wave')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  copiedKey === 'wave'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                }`}
              >
                {copiedKey === 'wave' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>ကူးပြီးပါပြီ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>နံပါတ်ကူးမည်</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-3">
            <Coffee className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-slate-400 leading-snug">
              အသေးစား ကူညီမှုလေးဖြစ်စေ စေတနာထက်သန်စွာ ကူညီပေးခြင်းသည် Server နှင့် AI API သုံးစွဲခများအတွက် များစွာ အထောက်အကူပြုပါသည်!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            ပိတ်မည် (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
