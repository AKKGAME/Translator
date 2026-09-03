import React, { useState } from 'react';
import {
  AlertTriangle,
  KeyRound,
  Zap,
  Heart,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Check,
  Trash2,
} from 'lucide-react';
import { UserAccessStatus } from '../types';
import {
  validateAccessKeyLocally,
  setSavedAccessCode,
  getLocalUsageConfig,
} from '../utils/accessKeyUtils';

interface AccessLimitExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessStatus: UserAccessStatus;
  customApiKey: string;
  onUpdateCustomApiKey: (key: string) => void;
  onUpdateAccessCode: (code: string) => void;
  onOpenDonate?: () => void;
}

export const AccessLimitExceededModal: React.FC<AccessLimitExceededModalProps> = ({
  isOpen,
  onClose,
  accessStatus,
  customApiKey,
  onUpdateCustomApiKey,
  onUpdateAccessCode,
  onOpenDonate,
}) => {
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(customApiKey || '');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleApplyVipKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const clean = accessCodeInput.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('VIP Key ထည့်သွင်းပေးပါ');
      return;
    }

    setVerifying(true);
    try {
      let verified = false;
      try {
        const res = await fetch('/api/verify-access-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: clean }),
        });
        const data = await res.json();
        if (res.ok && data.valid) {
          verified = true;
        } else {
          setErrorMsg(data.error || 'VIP Key မှားယွင်းနေပါသည်');
        }
      } catch (networkErr) {
        const local = validateAccessKeyLocally(clean, getLocalUsageConfig());
        if (local.valid) {
          verified = true;
        } else {
          setErrorMsg(local.error || 'VIP Key မှားယွင်းနေပါသည်');
        }
      }

      if (verified) {
        setSavedAccessCode(clean);
        onUpdateAccessCode(clean);
        setSuccessMsg('VIP Key အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ! ဆက်လက် ဘာသာပြန်နိုင်ပါပြီ');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleApplyCustomApiKey = () => {
    if (!apiKeyInput.trim()) {
      setErrorMsg('Gemini API Key ထည့်သွင်းပေးပါ');
      return;
    }
    onUpdateCustomApiKey(apiKeyInput.trim());
    setSuccessMsg('မိမိ၏ Gemini API Key အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e1219] border border-[#212734] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Warning Banner */}
        <div className="p-5 sm:p-6 bg-[#07090e] border-b border-[#212734] text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#1a202c] rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-100">
            {accessStatus.freeDailyLimit === 0
              ? 'VIP Access Key လိုအပ်ပါသည်'
              : 'ယနေ့အတွက် အခမဲ့ စာကြောင်းရေ ကုန်ဆုံးသွားပါပြီ'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {accessStatus.freeDailyLimit === 0
              ? 'စနစ်အသုံးပြုမှုကို စနစ်တကျ ထိန်းသိမ်းထားရန် VIP Key သို့မဟုတ် ကိုယ်ပိုင် API Key လိုအပ်ပါသည်'
              : `ယနေ့အတွက် အခမဲ့ ခွင့်ပြုချက် (${accessStatus.freeDailyLimit} ကြောင်း) ပြည့်သွားပါပြီ။ ဆက်လက်အသုံးပြုရန် နည်းလမ်းများကို ရွေးချယ်ပါ`}
          </p>
        </div>

        {/* Options */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md flex items-center space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md flex items-center space-x-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Option 1: Enter VIP Code */}
          <div className="bg-[#07090e] p-4 rounded-md border border-indigo-500/30 space-y-2.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span>နည်းလမ်း (၁) - VIP Access Key ထည့်သွင်းရန်</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Admin ထံမှ ရရှိထားသော VIP Passcode / Voucher Code ကို ထည့်သွင်းပါ
            </p>
            <form onSubmit={handleApplyVipKey} className="flex space-x-2">
              <input
                type="text"
                placeholder="AG-VIP-XXXX"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                className="flex-1 bg-[#12161f] border border-[#212734] rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono uppercase tracking-wider focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={verifying}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md text-xs font-bold transition flex items-center space-x-1"
              >
                {verifying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>ထည့်မည်</span>
              </button>
              {(accessCodeInput.trim() || accessStatus.accessCode) && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('ထည့်သွင်းထားသော VIP Key ကို ဖယ်ရှား/ဖျက်ပစ်ရန် သေချာပါသလား?')) {
                      setSavedAccessCode('');
                      onUpdateAccessCode('');
                      setAccessCodeInput('');
                      setSuccessMsg('VIP Key ကို ဖယ်ရှားပြီးပါပြီ');
                    }
                  }}
                  className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-md text-xs font-bold transition flex items-center space-x-1"
                  title="VIP Key ကို ပြန်ဖျက်မည်"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ဖျက်မည်</span>
                </button>
              )}
            </form>
          </div>

          {/* Option 2: Own Free Gemini API Key */}
          <div className="bg-[#07090e] p-4 rounded-md border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>နည်းလမ်း (၂) - ကိုယ်ပိုင် အခမဲ့ Gemini Key ထည့်သုံးရန်</span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-400 hover:underline inline-flex items-center space-x-1"
              >
                <span>Key ရယူရန်</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Google AI Studio မှ အခမဲ့ ရရှိသော API Key ကို ထည့်သွင်းပါက ကန့်သတ်ချက်မရှိ ဘာသာပြန်နိုင်ပါသည်
            </p>
            <div className="flex space-x-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 bg-[#12161f] border border-[#212734] rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleApplyCustomApiKey}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition"
              >
                သိမ်းမည်
              </button>
              {(apiKeyInput.trim() || customApiKey) && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('ထည့်သွင်းထားသော Gemini API Key ကို ဖယ်ရှား/ဖျက်ပစ်ရန် သေချာပါသလား?')) {
                      onUpdateCustomApiKey('');
                      setApiKeyInput('');
                      localStorage.removeItem('animegabar_custom_api_key');
                      setSuccessMsg('Gemini API Key ကို ဖယ်ရှားပြီးပါပြီ');
                    }
                  }}
                  className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-md text-xs font-bold transition flex items-center space-x-1"
                  title="API Key ကို ပြန်ဖျက်မည်"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ဖျက်မည်</span>
                </button>
              )}
            </div>
          </div>

          {/* Option 3: Donate to request key */}
          {onOpenDonate && (
            <div className="bg-[#07090e] p-4 rounded-md border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-bold text-rose-400">
                  <Heart className="w-4 h-4 fill-current" />
                  <span>နည်းလမ်း (၃) - VIP Key ရယူရန် လှူဒါန်းမည်</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  KPay / Wave Money ဖြင့် လှူဒါန်းပြီး VIP Access Key တောင်းယူနိုင်ပါသည်
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenDonate();
                }}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-xs font-semibold transition whitespace-nowrap self-start sm:self-auto"
              >
                လှူဒါန်းရန်
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#212734] bg-[#07090e] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#12161f] hover:bg-[#1a202c] border border-[#212734] text-slate-200 text-xs font-semibold rounded-md transition"
          >
            နားလည်ပါပြီ
          </button>
        </div>
      </div>
    </div>
  );
};
