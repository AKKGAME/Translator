import React, { useState } from 'react';
import {
  FirebaseUser,
  fbSignOut,
  auth,
  AppUserProfile,
  db,
  checkUserPlanStatus,
  saveUserCustomKeys,
  UserCustomKeyItem,
} from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { testGeminiApiKey } from '../utils/geminiDirect';
import { showConfirm, notify } from './AlertToastProvider';
import {
  User,
  LogOut,
  Crown,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  CreditCard,
  QrCode,
  Send,
  X,
  Gift,
  ShieldCheck,
  Calendar,
  KeyRound,
  Layers,
  HelpCircle,
  ExternalLink,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Coins,
  Lock,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  profile: AppUserProfile | null;
  onSignIn: () => Promise<void>;
  kpayPhone?: string;
  kpayName?: string;
  wavePhone?: string;
  waveName?: string;
  onOpenAdmin?: () => void;
  onUpdateCustomKeys?: (keys: UserCustomKeyItem[]) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  onSignIn,
  kpayPhone = '09770033353',
  kpayName = 'Aung Kyaw Khant',
  wavePhone = '09668888555',
  waveName = 'Aung Kyaw Khant',
  onOpenAdmin,
  onUpdateCustomKeys,
}) => {
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Custom Keys (BYOK) state
  const [newProjectName, setNewProjectName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyActionMessage, setKeyActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showKeySecret, setShowKeySecret] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const planStatus = profile
    ? checkUserPlanStatus(profile)
    : { hasActivePlan: false, daysRemaining: 0, planName: 'None', isLifetime: false };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRedeemCode = async () => {
    if (!promoCodeInput.trim() || !user || !profile) return;
    const cleanCode = promoCodeInput.trim().toUpperCase();
    setIsRedeeming(true);
    setRedeemMessage(null);

    try {
      const promoRef = doc(db, 'promoCodes', cleanCode);
      const snap = await getDoc(promoRef);

      if (!snap.exists()) {
        if (cleanCode === 'WELCOME100') {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { credits: increment(100) });
          setRedeemMessage({ type: 'success', text: 'ကူပွန်အောင်မြင်ပါသည်! +100 Credits ရရှိပါပြီ။' });
          setPromoCodeInput('');
          return;
        } else if (cleanCode === 'ANIMEPRO') {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { credits: increment(500), isVip: true, tier: 'pro' });
          setRedeemMessage({ type: 'success', text: 'VIP Promo Code အောင်မြင်ပါသည်! +500 Credits နှင့် Pro VIP ရရှိပါပြီ။' });
          setPromoCodeInput('');
          return;
        }

        setRedeemMessage({ type: 'error', text: 'ထည့်သွင်းထားသော Code မှားယွင်းနေပါသည် သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ' });
        return;
      }

      const promoData = snap.data();
      if (!promoData.isActive) {
        setRedeemMessage({ type: 'error', text: 'ဤ Promo Code ကို ပိတ်ထားပါသည်' });
        return;
      }

      if (promoData.redeemedUsers && Array.isArray(promoData.redeemedUsers) && promoData.redeemedUsers.includes(user.uid)) {
        setRedeemMessage({ type: 'error', text: 'ဤ Promo Code ကို သင် အသုံးပြုပြီးဖြစ်ပါသည်' });
        return;
      }

      if (promoData.usedCount >= promoData.maxUses) {
        setRedeemMessage({ type: 'error', text: 'ဤ Promo Code ၏ အသုံးပြုနိုင်သည့် အကြိမ်အရေအတွက် ပြည့်သွားပါပြီ' });
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const updates: any = {
        credits: increment(promoData.credits || 0),
      };
      if (promoData.isVipUpgrade) {
        updates.isVip = true;
        updates.tier = 'pro';
      }

      await updateDoc(userRef, updates);
      await updateDoc(promoRef, {
        usedCount: increment(1),
        redeemedUsers: arrayUnion(user.uid),
      });

      setRedeemMessage({
        type: 'success',
        text: `အောင်မြင်ပါသည်! +${(promoData.credits || 0).toLocaleString()} Credits ထည့်သွင်းပြီးပါပြီ${promoData.isVipUpgrade ? ' (VIP Status ပေးအပ်ပြီးပါပြီ)' : ''}`,
      });
      setPromoCodeInput('');
    } catch (err: any) {
      setRedeemMessage({ type: 'error', text: err.message || 'ကုဒ်သုံးစွဲရန် မအောင်မြင်ပါ' });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
      onClose();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  // BYOK Add New Project Key
  const handleAddCustomKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setKeyActionMessage(null);

    const cleanKey = newApiKey.trim();
    if (!cleanKey) {
      setKeyActionMessage({ type: 'error', text: 'Gemini API Key ထည့်သွင်းပေးပါ' });
      return;
    }

    if (!cleanKey.startsWith('AIzaSy')) {
      const proceedPrefix = await showConfirm({
        title: 'API Key အတည်ပြုရန်',
        message: 'ထည့်သွင်းသော Key သည် "AIzaSy" ဖြင့် မစတင်ပါ။ ဆက်လက်သိမ်းဆည်းမည်လား?',
        type: 'warning',
      });
      if (!proceedPrefix) {
        return;
      }
    }

    setIsSavingKey(true);
    setIsTestingKey(true);

    try {
      // Test key connectivity
      const testResult = await testGeminiApiKey(cleanKey);
      if (!testResult.success) {
        const proceed = await showConfirm({
          title: 'API Key ချိတ်ဆက်မှု အမှား',
          message: `Key စမ်းသပ်ရာတွင် အောက်ပါအမှား တွေ့ရှိရပါသည်:\n${testResult.error || 'Connection error'}\n\nဤအတိုင်း ဆက်လက်သိမ်းဆည်းလိုပါသလား?`,
          type: 'warning',
          confirmText: 'ဆက်လက်သိမ်းဆည်းမည်',
        });
        if (!proceed) {
          setIsSavingKey(false);
          setIsTestingKey(false);
          return;
        }
      }

      const existingKeys: UserCustomKeyItem[] = profile.customGeminiKeys || [];
      // Prevent duplicate keys
      if (existingKeys.some((k) => k.key === cleanKey)) {
        setKeyActionMessage({ type: 'error', text: 'ဤ Key အား ထည့်သွင်းပြီးသား ဖြစ်ပါသည်' });
        setIsSavingKey(false);
        setIsTestingKey(false);
        return;
      }

      const nowStr = new Date().toISOString();
      const newKeyItem: UserCustomKeyItem = {
        id: 'key-' + Date.now(),
        key: cleanKey,
        label: newProjectName.trim() || `Google Project ${existingKeys.length + 1}`,
        projectName: newProjectName.trim() || `Project-${existingKeys.length + 1}`,
        addedAt: nowStr,
        createdAt: nowStr,
      };

      const updatedKeys = [...existingKeys, newKeyItem];
      await saveUserCustomKeys(user.uid, updatedKeys);

      // Also persist to localStorage
      try {
        localStorage.setItem('user_gemini_api_key', cleanKey);
      } catch (e) {
        // ignore
      }

      onUpdateCustomKeys?.(updatedKeys);
      setNewProjectName('');
      setNewApiKey('');
      setKeyActionMessage({
        type: 'success',
        text: `Google Project "${newKeyItem.projectName}" မှ API Key ကို အောင်မြင်စွာ စစ်ဆေးသိမ်းဆည်းပြီးပါပြီ!`,
      });
    } catch (err: any) {
      setKeyActionMessage({ type: 'error', text: err.message || 'Key သိမ်းဆည်းရန် မအောင်မြင်ပါ' });
    } finally {
      setIsSavingKey(false);
      setIsTestingKey(false);
    }
  };

  // Delete a saved user key
  const handleDeleteCustomKey = async (keyId: string) => {
    if (!user || !profile) return;
    const confirmed = await showConfirm({
      title: 'API Key ဖျက်ရန်',
      message: 'ဤ API Key ကို ဖျက်ရန် သေချာပါသလား?',
      type: 'danger',
      confirmText: 'ဖျက်မည်',
    });
    if (!confirmed) return;

    try {
      const existingKeys: UserCustomKeyItem[] = profile.customGeminiKeys || [];
      const updatedKeys = existingKeys.filter((k) => k.id !== keyId);
      await saveUserCustomKeys(user.uid, updatedKeys);
      onUpdateCustomKeys?.(updatedKeys);
      notify.success('API Key ကို ဖျက်ပစ်ပြီးပါပြီ');
      setKeyActionMessage({ type: 'success', text: 'Key ကို ဖျက်ပစ်ပြီးပါပြီ' });
    } catch (err: any) {
      setKeyActionMessage({ type: 'error', text: 'ဖျက်ရန် မအောင်မြင်ပါ: ' + err.message });
    }
  };

  const userKeys: UserCustomKeyItem[] = profile?.customGeminiKeys || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e101a] border border-[#23273e] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-50 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#23273e] flex items-center justify-between bg-[#151829]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <span>အသုံးပြုသူ အကောင့်နှင့် Plan အချက်အလက်</span>
                {profile?.isVip && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center space-x-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>VIP MEMBER</span>
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Plan သက်တမ်း၊ Free Key များ စီမံခန့်ခွဲခြင်းနှင့် ခရက်ဒစ် ဖြည့်သွင်းခြင်း
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#20253d] text-slate-400 hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs">
          {user && profile ? (
            <>
              {/* User Profile Bar */}
              <div className="bg-[#131728] border border-[#23273e] p-3.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full border-2 border-purple-500/40 object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center border border-purple-500/30 text-sm">
                      {user.displayName?.[0] || user.email?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-100 text-sm">{profile.displayName || user.displayName}</div>
                    <div className="text-[11px] text-slate-400">{user.email}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] px-2 py-0.2 rounded bg-purple-950/70 border border-purple-800 text-purple-300 font-mono">
                        Role: {profile.role.toUpperCase()}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-indigo-950/70 border border-indigo-800 text-indigo-300 font-mono">
                        Tier: {profile.tier.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded text-[11px] font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  title="အကောင့်မှထွက်မည်"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ထွက်မည်</span>
                </button>
              </div>

              {/* Discreet Admin Switch (Visible Only for Verified Admin) */}
              {(profile.role === 'admin' || user.email === 'aungkyawkhant.apple@gmail.com') && onOpenAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-950/60 via-[#10201e] to-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 rounded-lg text-xs font-bold flex items-center justify-between transition shadow-sm group cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                    <span>Admin Control Center သို့ ဝင်မည်</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-800/50">
                    Shortcut: Ctrl + Shift + A
                  </span>
                </button>
              )}

              {/* SECTION 1: PLAN STATUS & DAYS REMAINING */}
              <div
                className={`p-4 rounded-xl border transition ${
                  planStatus.hasActivePlan
                    ? 'bg-gradient-to-br from-emerald-950/40 via-[#0e1617] to-[#121622] border-emerald-500/40'
                    : 'bg-gradient-to-br from-amber-950/30 via-[#161214] to-[#121622] border-amber-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className={`w-4 h-4 ${planStatus.hasActivePlan ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="font-bold text-slate-100 text-sm">သင်၏ Plan အခြေအနေနှင့် သက်တမ်း</span>
                    </div>

                    {profile.role === 'admin' ? (
                      <div className="text-emerald-400 font-semibold text-xs flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Admin Lifetime Access (ရက်အကန့်အသတ်မရှိ အမြဲသုံးနိုင်ပါသည်)</span>
                      </div>
                    ) : planStatus.hasActivePlan ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded font-bold font-mono text-xs inline-flex items-center space-x-1">
                            <span>{planStatus.planName || 'VIP Active Plan'}</span>
                            <span>•</span>
                            <span>{planStatus.daysRemaining} ရက်ကျန်ရှိ</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Plan သက်တမ်း ကျန်ရှိနေသဖြင့် အောက်တွင် Google AI Studio မှ Project မတူညီသော Free Key များကို စိတ်ကြိုက်ထည့်သွင်း သိမ်းဆည်းအသုံးပြုနိုင်ပါသည်!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="inline-flex items-center space-x-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Plan မရှိသေးပါ သို့မဟုတ် သက်တမ်းကုန်ဆုံးနေပါသည်</span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          ⚠️ <strong>သတိပြုရန်:</strong> Plan သက်တမ်း ကျန်ရှိမှသာ မိမိ၏ Free Gemini API Key များကို ထည့်သွင်းအသုံးပြုနိုင်မည် ဖြစ်ပါသည်။ (လက်ရှိတွင် ပေးထားသော 300 Free Credits ဖြင့် စမ်းသပ်ဘာသာပြန်နိုင်ပါသည်)
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    <div className="bg-[#0b0e18] px-3 py-2 rounded-lg border border-[#22273e] text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">ကျန်ရှိရက်</div>
                      <div className={`text-xl font-black font-mono ${planStatus.hasActivePlan ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {profile.role === 'admin' ? '∞' : `${planStatus.daysRemaining} ရက်`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SAVED USER KEYS (BYOK - Multi-Project Keys) */}
              <div className="bg-[#111422] border border-purple-500/30 rounded-xl p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#21263d]">
                  <div className="flex items-center space-x-2 font-bold text-slate-100">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span>မိမိ၏ Gemini API Keys များ ({userKeys.length} ခု သိမ်းဆည်းထားပြီး)</span>
                  </div>

                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 text-[11px] font-semibold hover:underline"
                  >
                    <span>Google AI Studio Key ရယူရန်</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Plan Requirement Restriction Gate */}
                {!planStatus.hasActivePlan && profile.role !== 'admin' ? (
                  <div className="bg-[#17121b] border border-amber-500/30 p-4 rounded-lg text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-amber-300 text-xs">Plan သက်တမ်း မရှိသေးပါ</div>
                    <p className="text-[11px] text-slate-300 max-w-md mx-auto leading-relaxed">
                      မိမိ၏ ကိုယ်ပိုင် Gemini API Key (BYOK) ထည့်သွင်းသုံးစွဲနိုင်ရန်အတွက် သက်တမ်းရှိသော Plan (Active Plan) ဝယ်ယူထားရန် လိုအပ်ပါသည်။ အောက်ပါ Package များမှတစ်ဆင့် ဆက်သွယ်ဝယ်ယူနိုင်ပါသည်!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Add Key Form */}
                    <form onSubmit={handleAddCustomKey} className="bg-[#0b0e18] p-3 rounded-lg border border-[#21263d] space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Project အသစ်မှ Free Gemini API Key ထည့်သွင်း သိမ်းဆည်းမည်</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Google Cloud Project အမည်</label>
                          <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="ဥပမာ- Project-Anime-1"
                            className="w-full bg-[#131728] border border-[#262c47] rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-1">Gemini API Key (AIzaSy...)</label>
                          <div className="flex space-x-1.5">
                            <input
                              type="password"
                              value={newApiKey}
                              onChange={(e) => setNewApiKey(e.target.value)}
                              placeholder="AIzaSy..."
                              className="flex-1 bg-[#131728] border border-[#262c47] rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="submit"
                              disabled={isSavingKey || !newApiKey.trim()}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition disabled:opacity-50 flex items-center space-x-1 shrink-0 cursor-pointer"
                            >
                              {isTestingKey ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>စစ်ဆေး & သိမ်းမည်</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {keyActionMessage && (
                        <div
                          className={`p-2 rounded text-[11px] flex items-center space-x-1.5 ${
                            keyActionMessage.type === 'success'
                              ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-300'
                              : 'bg-rose-950/70 border border-rose-700 text-rose-300'
                          }`}
                        >
                          {keyActionMessage.type === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{keyActionMessage.text}</span>
                        </div>
                      )}
                    </form>

                    {/* Saved Keys List */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">သိမ်းဆည်းထားသော Keys စာရင်း:</div>
                      {userKeys.length === 0 ? (
                        <div className="p-3 bg-[#0b0e18] rounded border border-[#1f243a] text-center text-slate-500 text-[11px]">
                          Key များ မထည့်ရသေးပါ။ အထက်ပါ Form တွင် Google Project မတူညီသော Key များကို ထည့်သွင်းပါ
                        </div>
                      ) : (
                        userKeys.map((k, idx) => {
                          const isRevealed = !!showKeySecret[k.id];
                          const masked = k.key.length > 10 ? `${k.key.slice(0, 7)}••••••••${k.key.slice(-4)}` : '••••••••';
                          return (
                            <div
                              key={k.id}
                              className="bg-[#0b0e18] border border-[#21263d] p-2.5 rounded-lg flex items-center justify-between text-xs transition hover:border-purple-500/40"
                            >
                              <div className="flex items-center space-x-2.5 overflow-hidden">
                                <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 flex items-center justify-center font-bold text-[10px] font-mono shrink-0">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                                    <span>{k.projectName || k.label || `Project ${idx + 1}`}</span>
                                    <span className="text-[9px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                                      Active
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-400">
                                    {isRevealed ? k.key : masked}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setShowKeySecret((prev) => ({ ...prev, [k.id]: !isRevealed }))}
                                  className="p-1 hover:bg-[#1a2034] text-slate-400 hover:text-slate-200 rounded transition"
                                  title={isRevealed ? 'Hide' : 'Show'}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomKey(k.id)}
                                  className="p-1 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 rounded transition"
                                  title="Key ဖျက်မည်"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* SECTION 3: MULTI-PROJECT FREE KEY EDUCATIONAL GUIDE */}
              <div className="bg-[#0b0e1a] border border-[#20253d] p-4 rounded-xl space-y-3 text-slate-300 text-xs">
                <div className="flex items-center space-x-2 font-bold text-slate-100">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Google Cloud Projects မတူညီသော Free Key များနှင့် စနစ်အသုံးပြုနည်း လမ်းညွှန်</span>
                </div>

                <div className="space-y-2.5 text-[11px] leading-relaxed divide-y divide-[#1e2338]">
                  <div className="pt-1 flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold shrink-0">၁။ Quota ခွဲဝေမှု:</span>
                    <span className="text-slate-300">
                      Gemini API ၏ Free Tier Quota (15 RPM / 1,500 RPD) သည် Gmail အကောင့်တစ်ခုလုံးအတွက် မဟုတ်ဘဲ <strong>Google Cloud Project တစ်ခုချင်းစီ</strong> အပေါ်တွင် သီးခြားစီ ခွဲဝေပေးခြင်း ဖြစ်ပါသည်။
                    </span>
                  </div>

                  <div className="pt-2 flex items-start space-x-2">
                    <span className="text-amber-400 font-bold shrink-0">၂။ Project အသစ်များ ဖန်တီးပုံ:</span>
                    <span className="text-slate-300">
                      Google AI Studio (<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 underline">aistudio.google.com/app/apikey</a>) တွင် မိမိ၏ Google Account တစ်ခုတည်းဖြင့်ပင် <strong>"Create key in new project"</strong> ခလုတ်ကို အကြိမ်ကြိမ် နှိပ်ကာ Project မတူညီသော Free Key များကို အခမဲ့ အကန့်အသတ်မရှိ ထုတ်ယူနိုင်ပါသည်။
                    </span>
                  </div>

                  <div className="pt-2 flex items-start space-x-2">
                    <span className="text-purple-400 font-bold shrink-0">၃။ Auto-Rotation ဖြင့် Rate Limit ကျော်လွှားခြင်း:</span>
                    <span className="text-slate-300">
                      ဤနေရာတွင် မတူညီသော Project Key ၃ ခုမှ ၅ ခု ထည့်သွင်းထားပါက စနစ်က စာတန်းထိုးများကို အလှည့်ကျ Rotation စနစ်ဖြင့် အလိုအလျောက် ပို့ဆောင်ပေးသောကြောင့် Rate Limit (429 Error) မတက်ဘဲ တစ်ရက်လျှင် Anime အပိုင်း ၁၀ ပိုင်းကျော် မြန်ဆန်စွာ ဘာသာပြန်နိုင်မည် ဖြစ်ပါသည်။
                    </span>
                  </div>

                  <div className="pt-2 flex items-start space-x-2">
                    <span className="text-blue-400 font-bold shrink-0">၄။ Plan လိုအပ်ချက်:</span>
                    <span className="text-slate-300">
                      အဆိုပါ Free Key များ အသုံးပြုခွင့်ကို Plan ဝယ်ယူထားပြီး ရက်ကျန်ရှိသော User များသာ အသုံးပြုခွင့်ရရှိမည် ဖြစ်ပါသည်။ (ရက်သက်တမ်းကုန်ဆုံးပါက Plan အသစ် ထပ်မံဝယ်ယူရပါမည်)
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: CREDITS BALANCE & VOUCHER CARD */}
              <div className="bg-gradient-to-br from-[#1a1333] to-[#0f1224] border border-purple-500/40 p-4 rounded-xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] block font-medium">လက်ကျန် စာကြောင်းရေ (Available Credits)</span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-2xl font-black text-amber-300 font-mono">
                        {(profile.credits ?? 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">lines</span>
                      {(profile.role === 'admin' || profile.tier === 'unlimited') && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold ml-2">
                          {profile.role === 'admin' ? 'Admin Access' : 'Unlimited Plan'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                    <Coins className="w-6 h-6" />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-purple-800/30 flex items-center justify-between text-[11px] text-slate-300">
                  <span>စုစုပေါင်း ဘာသာပြန်ပြီးစီးမှု:</span>
                  <span className="font-mono font-bold text-slate-100">
                    {(profile.totalTranslatedLines || 0).toLocaleString()} စာကြောင်း
                  </span>
                </div>
              </div>

              {/* Redeem Promo Code / Voucher Card */}
              <div className="bg-[#131728] border border-[#23273e] p-3.5 rounded-lg space-y-2.5">
                <div className="flex items-center space-x-1.5 text-slate-200 font-bold">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span>Voucher / Promo Code ထည့်သွင်းရန်</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  ဝယ်ယူထားသော Access Code သို့မဟုတ် ပရိုမိုးရှင်းကုဒ်ရှိပါက ရိုက်ထည့်၍ Plan သို့မဟုတ် Credits တိုးနိုင်ပါသည်
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="ဥပမာ- WELCOME100, ANIMEPRO"
                    className="flex-1 bg-[#090b14] border border-[#2a2f4c] rounded px-3 py-1.5 text-xs text-slate-100 uppercase tracking-wider font-mono focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleRedeemCode}
                    disabled={isRedeeming || !promoCodeInput.trim()}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                  >
                    {isRedeeming ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Redeem</span>
                    )}
                  </button>
                </div>

                {redeemMessage && (
                  <div
                    className={`p-2 rounded text-[11px] flex items-center space-x-1.5 ${
                      redeemMessage.type === 'success'
                        ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-300'
                        : 'bg-rose-950/70 border border-rose-700 text-rose-300'
                    }`}
                  >
                    {redeemMessage.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{redeemMessage.text}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Not logged in view */
            <div className="bg-[#131728] border border-purple-500/30 p-5 rounded-lg text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-600/20 text-purple-300 mx-auto flex items-center justify-center border border-purple-500/40">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Google အကောင့်ဖြင့် ဝင်ရောက်ပါ</h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Google အကောင့်ဖြင့် Login ပြုလုပ်ရုံဖြင့် <strong className="text-amber-300">Free 300 Lines</strong> စာတန်းထိုး ဘာသာပြန်ခွင့်ကို ချက်ချင်းရရှိမည်ဖြစ်ပါသည်
                </p>
              </div>

              <button
                onClick={onSignIn}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-bold text-xs shadow-lg transition flex items-center justify-center space-x-2 mx-auto cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google ဖြင့် ဝင်ရောက်မည်</span>
              </button>
            </div>
          )}

          {/* SECTION 5: PRICING & PLAN TOP-UP PACKAGES */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-1.5 text-slate-200 font-bold">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Plan နှင့် Credits ဝယ်ယူရန် Packages များ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Plan 1 */}
              <div className="bg-[#131728] border border-[#23273e] hover:border-purple-500/50 p-3 rounded-lg text-center space-y-1.5 transition">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Starter</div>
                <div className="text-lg font-black text-slate-100 font-mono">1,000 Lines</div>
                <div className="text-xs font-bold text-purple-400 font-mono">3,000 MMK</div>
                <p className="text-[10px] text-slate-400">အပိုင်း ၂ ပိုင်း ~ ၃ ပိုင်းစာ</p>
              </div>

              {/* Plan 2 */}
              <div className="bg-gradient-to-b from-purple-950/40 to-[#131728] border border-purple-500/60 p-3 rounded-lg text-center space-y-1.5 relative shadow-md">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] px-2 py-0.2 rounded-full font-bold uppercase">
                  Popular
                </span>
                <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Fansubber Pro (Monthly)</div>
                <div className="text-lg font-black text-slate-100 font-mono">ရက် ၃၀ Plan</div>
                <div className="text-xs font-bold text-amber-300 font-mono">10,000 MMK / လ</div>
                <p className="text-[10px] text-slate-300">Free Key ထည့်သွင်းခွင့် + 5,000 Lines</p>
              </div>

              {/* Plan 3 */}
              <div className="bg-[#131728] border border-[#23273e] hover:border-amber-500/50 p-3 rounded-lg text-center space-y-1.5 transition">
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">VIP Studio Unlimited</div>
                <div className="text-lg font-black text-slate-100 font-mono">ရက် ၆၀ Plan</div>
                <div className="text-xs font-bold text-amber-400 font-mono">25,000 MMK</div>
                <p className="text-[10px] text-slate-400">ရက် ၆၀ အကန့်အသတ်မရှိ BYOK + VIP</p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-[#0a0c16] border border-[#23273e] p-3 rounded-lg space-y-2 text-[11px]">
              <div className="font-bold text-slate-300 flex items-center space-x-1.5">
                <QrCode className="w-3.5 h-3.5 text-blue-400" />
                <span>ငွေလွှဲပေးချေနိုင်သော နည်းလမ်းများ:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                <div className="bg-[#131728] p-2 rounded border border-[#20243b] flex items-center justify-between">
                  <div>
                    <span className="text-blue-400 font-bold block">KBZPay</span>
                    <span className="font-mono text-xs">{kpayPhone}</span>
                    <span className="text-[10px] text-slate-400 block">({kpayName})</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(kpayPhone, 'kpay')}
                    className="p-1.5 hover:bg-[#25283a] rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedField === 'kpay' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-[#131728] p-2 rounded border border-[#20243b] flex items-center justify-between">
                  <div>
                    <span className="text-amber-400 font-bold block">WavePay</span>
                    <span className="font-mono text-xs">{wavePhone}</span>
                    <span className="text-[10px] text-slate-400 block">({waveName})</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(wavePhone, 'wave')}
                    className="p-1.5 hover:bg-[#25283a] rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedField === 'wave' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-purple-950/40 border border-purple-800/40 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-purple-200">
                <span>ငွေလွှဲပြီးနောက် ပြေစာပို့၍ Plan / Voucher ကုတ် ချက်ချင်း ရယူရန်:</span>
                <a
                  href="https://t.me/akk_shadow"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow transition cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram: @akk_shadow ဆက်သွယ်ရန်</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
