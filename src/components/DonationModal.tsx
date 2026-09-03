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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-[#0e1219] border border-[#212734] rounded-lg max-w-md w-full overflow-hidden shadow-2xl relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#07090e] border-b border-[#212734] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-[#1a202c] transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-9 h-9 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                ကူညီထောက်ပံ့ရန် (Support & Donate)
              </h2>
              <p className="text-[11px] text-emerald-400 font-medium">
                AnimeGabar AI Subtitle Translator
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-300 mt-2 bg-[#12161f] p-2.5 rounded-md border border-[#212734]">
            {config.note}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* KBZPay Card */}
          <div className="bg-[#07090e] border border-blue-500/30 rounded-md p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  KPay
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    KBZPay (KPay)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    အကောင့်အမည်: <span className="text-slate-200 font-medium">{config.kpayName || 'Admin'}</span>
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                KBZ Pay
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#12161f] rounded-md p-2.5 border border-[#212734]">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-100 tracking-wider">
                  {config.kpayPhone || '09xxxxxxxx'}
                </span>
              </div>
              <button
                onClick={() => handleCopy(config.kpayPhone, 'kpay')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                  copiedKey === 'kpay'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
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
          <div className="bg-[#07090e] border border-amber-500/30 rounded-md p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xs">
                  Wave
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    Wave Money
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    အကောင့်အမည်: <span className="text-slate-200 font-medium">{config.waveName || 'Admin'}</span>
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                WavePay
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#12161f] rounded-md p-2.5 border border-[#212734]">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-100 tracking-wider">
                  {config.wavePhone || '09xxxxxxxx'}
                </span>
              </div>
              <button
                onClick={() => handleCopy(config.wavePhone, 'wave')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                  copiedKey === 'wave'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
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

          <div className="p-3 bg-[#07090e] rounded-md border border-[#212734] flex items-center space-x-2.5">
            <Coffee className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-slate-400 leading-snug">
              အသေးစား ကူညီမှုလေးဖြစ်စေ စေတနာထက်သန်စွာ ကူညီပေးခြင်းသည် Server နှင့် AI API သုံးစွဲခများအတွက် များစွာ အထောက်အကူပြုပါသည်!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#07090e] border-t border-[#212734] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#12161f] hover:bg-[#1a202c] border border-[#212734] text-slate-200 text-xs font-semibold transition"
          >
            ပိတ်မည် (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
