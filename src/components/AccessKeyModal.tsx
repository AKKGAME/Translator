import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Copy,
  Check,
  Zap,
  Gift,
  HelpCircle,
  ExternalLink,
  Crown,
  Heart,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { AccessKeyItem, UsageConfig, UserAccessStatus } from '../types';
import {
  validateAccessKeyLocally,
  setSavedAccessCode,
  getSavedAccessCode,
  getLocalUsageConfig,
} from '../utils/accessKeyUtils';

interface AccessKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessStatus: UserAccessStatus;
  customApiKey: string;
  onUpdateCustomApiKey: (key: string) => void;
  onUpdateAccessCode: (code: string) => void;
  onOpenDonate?: () => void;
}

export const AccessKeyModal: React.FC<AccessKeyModalProps> = ({
  isOpen,
  onClose,
  accessStatus,
  customApiKey,
  onUpdateCustomApiKey,
  onUpdateAccessCode,
  onOpenDonate,
}) => {
  const [inputCode, setInputCode] = useState(getSavedAccessCode());
  const [customKeyInput, setCustomKeyInput] = useState(customApiKey || '');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCustomKeySection, setShowCustomKeySection] = useState(false);

  if (!isOpen) return null;

  const handleApplyAccessCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('ကျေးဇူးပြု၍ Access Key ထည့်သွင်းပေးပါ');
      return;
    }

    setVerifying(true);
    try {
      // 1. Try server verification first
      let verified = false;
      let keyData: any = null;

      try {
        const res = await fetch('/api/verify-access-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: cleanCode }),
        });
        const data = await res.json();
        if (res.ok && data.valid) {
          verified = true;
          keyData = data.key;
        } else {
          setErrorMsg(data.error || 'Access Key မှားယွင်းနေပါသည်');
        }
      } catch (networkErr) {
        // Fallback local check
        const localCheck = validateAccessKeyLocally(cleanCode, getLocalUsageConfig());
        if (localCheck.valid && localCheck.keyItem) {
          verified = true;
          keyData = localCheck.keyItem;
        } else {
          setErrorMsg(localCheck.error || 'Access Key မှားယွင်းနေပါသည်');
        }
      }

      if (verified) {
        setSavedAccessCode(cleanCode);
        onUpdateAccessCode(cleanCode);
        setSuccessMsg(`VIP Key အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ! (${keyData?.label || cleanCode})`);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveKey = () => {
    setSavedAccessCode('');
    onUpdateAccessCode('');
    setInputCode('');
    setSuccessMsg('VIP Key ကို ဖယ်ရှားပြီးပါပြီ');
  };

  const handleSaveCustomApiKey = () => {
    onUpdateCustomApiKey(customKeyInput.trim());
    setSuccessMsg('မိမိ၏ Gemini API Key ကို သိမ်းဆည်းပြီးပါပြီ');
  };

  const handleRemoveCustomApiKey = () => {
    if (window.confirm('ထည့်သွင်းထားသော Gemini API Key ကို ပြန်ဖျက်ရန် သေချာပါသလား?')) {
      onUpdateCustomApiKey('');
      setCustomKeyInput('');
      localStorage.removeItem('animegabar_custom_api_key');
      setSuccessMsg('Gemini API Key ကို အောင်မြင်စွာ ဖယ်ရှား/ဖျက်ပစ်ပြီးပါပြီ');
    }
  };

  const isVip = accessStatus.tier === 'vip';
  const isCustom = accessStatus.tier === 'custom_key';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e1219] border border-[#212734] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#212734] bg-[#07090e]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Access Key နှင့် အသုံးပြုခွင့် သတ်မှတ်ချက်</span>
              </h2>
              <p className="text-xs text-slate-400">
                VIP Access Key ထည့်သွင်းရန် သို့မဟုတ် လက်ကျန် စာကြောင်းရေ ကြည့်ရန်
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1a202c] rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Active Status Card */}
          <div
            className={`p-3.5 rounded-md border ${
              isVip
                ? 'bg-amber-500/10 border-amber-500/30'
                : isCustom
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-[#07090e] border-[#212734]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">လက်ရှိ အသုံးပြုခွင့် အဆင့်:</span>
              {isVip && (
                <span className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-xs font-bold">
                  <Crown className="w-3.5 h-3.5" />
                  <span>VIP Access Tier</span>
                </span>
              )}
              {isCustom && (
                <span className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-xs font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Custom Gemini Key</span>
                </span>
              )}
              {!isVip && !isCustom && (
                <span className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#1a202c] text-slate-300 border border-[#212734] rounded text-xs font-semibold">
                  <span>Free Tier (အခမဲ့ အဆင့်)</span>
                </span>
              )}
            </div>

            {isVip && accessStatus.activeKey && (
              <div className="space-y-2.5 mt-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">VIP Key Code:</span>
                  <code className="bg-[#07090e] border border-[#212734] px-2 py-0.5 rounded text-amber-400 font-mono font-bold">
                    {accessStatus.activeKey.code}
                  </code>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">အသုံးပြုပြီး စာကြောင်းရေ:</span>
                  <span className="font-semibold text-slate-200">
                    {accessStatus.activeKey.usedLines.toLocaleString()} /{' '}
                    {accessStatus.activeKey.maxLines > 0
                      ? accessStatus.activeKey.maxLines.toLocaleString() + ' ကြောင်း'
                      : 'အကန့်အသတ်မရှိ (Unlimited)'}
                  </span>
                </div>
                {accessStatus.activeKey.maxLines > 0 && (
                  <div>
                    <div className="w-full bg-[#12161f] h-1.5 rounded-full overflow-hidden border border-[#212734]">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (accessStatus.activeKey.usedLines / accessStatus.activeKey.maxLines) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>လက်ကျန်: {accessStatus.remainingFreeLines.toLocaleString()} ကြောင်း</span>
                      <span>
                        {Math.round(
                          (accessStatus.activeKey.usedLines / accessStatus.activeKey.maxLines) * 100
                        )}
                        % သုံးပြီး
                      </span>
                    </div>
                  </div>
                )}
                {accessStatus.activeKey.expiresAt && (
                  <div className="text-[11px] text-slate-400">
                    သက်တမ်းကုန်ဆုံးမည့်ရက်: {new Date(accessStatus.activeKey.expiresAt).toLocaleDateString('my-MM')}
                  </div>
                )}
                <div className="pt-1.5 flex justify-end">
                  <button
                    onClick={handleRemoveKey}
                    className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                  >
                    VIP Key ဖြုတ်ရန်
                  </button>
                </div>
              </div>
            )}

            {!isVip && !isCustom && (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-slate-300">{accessStatus.message}</p>
                <div className="w-full bg-[#12161f] h-1.5 rounded-full overflow-hidden border border-[#212734] mt-1.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (accessStatus.freeUsedToday / (accessStatus.freeDailyLimit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>ယနေ့သုံးပြီး: {accessStatus.freeUsedToday} ကြောင်း</span>
                  <span>နေ့စဉ်ခွင့်ပြုချက်: {accessStatus.freeDailyLimit} ကြောင်း</span>
                </div>
              </div>
            )}

            {isCustom && (
              <p className="text-xs text-emerald-300 mt-2">
                သင့်ကိုယ်ပိုင် Google Gemini API Key ကို ထည့်သွင်းထားသဖြင့် မည်သည့် စာကြောင်းရေ ကန့်သတ်ချက်မှ မရှိဘဲ စိတ်ကြိုက် အသုံးပြုနိုင်ပါသည်
              </p>
            )}
          </div>

          {/* Messages */}
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

          {/* Form to Redeem / Enter VIP Code */}
          <form onSubmit={handleApplyAccessCode} className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>VIP Access Key ထည့်သွင်းရန် (Passcode / Voucher)</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="ဥပမာ- AG-VIP-7842"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="flex-1 bg-[#07090e] border border-[#212734] rounded-md px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono tracking-wider uppercase focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={verifying}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
              >
                {verifying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>အသုံးပြုမည်</span>
              </button>
              {(inputCode.trim() || accessStatus.accessCode) && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('ထည့်သွင်းထားသော VIP Access Key ကို ဖယ်ရှား/ဖျက်ပစ်ရန် သေချာပါသလား?')) {
                      handleRemoveKey();
                    }
                  }}
                  className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-md text-xs font-bold transition flex items-center space-x-1"
                  title="VIP Key ကို ပြန်ဖျက်မည်"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ဖျက်မည်</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Admin ထံမှ ရရှိထားသော VIP Key သို့မဟုတ် Donation Voucher ကို ဒီနေရာတွင် ထည့်သွင်းပါ
            </p>
          </form>

          {/* Alternative: Free Google Gemini API Key Bypass */}
          <div className="border-t border-[#212734] pt-3.5">
            <button
              type="button"
              onClick={() => setShowCustomKeySection(!showCustomKeySection)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1.5 font-medium"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {showCustomKeySection
                  ? 'Google Gemini API Key ထည့်ရန် နေရာ ပိတ်မည်'
                  : 'သို့မဟုတ် ကိုယ်ပိုင် အခမဲ့ Google Gemini API Key ထည့်သွင်းသုံးမည်လား?'}
              </span>
            </button>

            {showCustomKeySection && (
              <div className="mt-2.5 bg-[#07090e] p-3 rounded-md border border-[#212734] space-y-2.5 animate-fadeIn">
                <p className="text-xs text-slate-400">
                  Google AI Studio မှ အခမဲ့ရယူထားသော မိမိ၏ Gemini API Key ကို ထည့်သွင်းပါက ကန့်သတ်ချက်မရှိ ဘာသာပြန်နိုင်ပါသည်
                </p>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    className="flex-1 bg-[#12161f] border border-[#212734] rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomApiKey}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition"
                  >
                    သိမ်းမည်
                  </button>
                  {(customKeyInput.trim() || customApiKey) && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomApiKey}
                      className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-md text-xs font-bold transition flex items-center space-x-1"
                      title="API Key ကို ပြန်ဖျက်မည်"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ဖျက်မည်</span>
                    </button>
                  )}
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-[11px] text-indigo-400 hover:underline"
                >
                  <span>Google AI Studio တွင် အခမဲ့ Key ရယူနည်း</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#212734] bg-[#07090e] flex items-center justify-between">
          {onOpenDonate && (
            <button
              onClick={() => {
                onClose();
                onOpenDonate();
              }}
              className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>VIP Key ရယူရန် လှူဒါန်းမည်</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#12161f] hover:bg-[#1a202c] border border-[#212734] text-slate-200 text-xs font-semibold rounded-md transition ml-auto"
          >
            ပိတ်မည်
          </button>
        </div>
      </div>
    </div>
  );
};
