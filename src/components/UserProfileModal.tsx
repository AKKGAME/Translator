import React, { useState } from 'react';
import {
  FirebaseUser,
  signInWithPopup,
  fbSignOut,
  auth,
  googleProvider,
  AppUserProfile,
  db,
} from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  User,
  LogOut,
  Crown,
  Sparkles,
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
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  onSignIn,
  kpayPhone = '09770033353',
  kpayName = 'Aung Kyaw Khant',
  wavePhone = '09770033353',
  waveName = 'Aung Kyaw Khant',
}) => {
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

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
      // Check promo code in Firestore
      const promoRef = doc(db, 'promoCodes', cleanCode);
      const snap = await getDoc(promoRef);

      if (!snap.exists()) {
        // Fallback default demo / starter codes if Firestore promoCodes hasn't been populated
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
        setRedeemMessage({ type: 'error', text: 'ဤ Promo Code သည် သက်တမ်းကုန်သွားပါပြီ' });
        return;
      }

      if (promoData.maxUses && promoData.usedCount >= promoData.maxUses) {
        setRedeemMessage({ type: 'error', text: 'ဤ Promo Code ကို အသုံးပြုသူပြည့်သွားပါပြီ' });
        return;
      }

      // Apply credits to user
      const userRef = doc(db, 'users', user.uid);
      const updates: any = {
        credits: increment(promoData.credits || 0),
      };
      if (promoData.isVipUpgrade) {
        updates.isVip = true;
        updates.tier = 'pro';
      }
      await updateDoc(userRef, updates);

      // Increment used count on promoCode
      await updateDoc(promoRef, {
        usedCount: increment(1),
      });

      // Log usage
      try {
        await addDoc(collection(db, 'usageLogs'), {
          userId: user.uid,
          userEmail: user.email,
          linesCount: promoData.credits || 0,
          action: `redeem_code_${cleanCode}`,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        // Ignore log failure
      }

      setRedeemMessage({
        type: 'success',
        text: `အောင်မြင်ပါသည်! +${promoData.credits || 0} Credits ${promoData.isVipUpgrade ? 'နှင့် VIP Upgrade ' : ''}ရရှိပါပြီ။`,
      });
      setPromoCodeInput('');
    } catch (err: any) {
      setRedeemMessage({ type: 'error', text: err.message || 'Code ထည့်သွင်းမှု မအောင်မြင်ပါ' });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
      onClose();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#0e101a] border border-[#23273e] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-950/70 via-[#151829] to-[#0e101a] border-b border-[#23273e] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                <span>အကောင့်နှင့် ခရက်ဒစ် စီမံခန့်ခွဲမှု</span>
                {profile?.isVip && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>VIP Member</span>
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">User Account & Translation Credits Balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#20243b] rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
          {user && profile ? (
            <>
              {/* User Profile Card */}
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

              {/* Credits Balance Card */}
              <div className="bg-gradient-to-br from-[#1a1333] to-[#0f1224] border border-purple-500/40 p-4 rounded-lg shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] block font-medium">လက်ကျန် စာကြောင်းရေ (Available Credits)</span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-2xl font-black text-amber-300 font-mono">
                        {profile.role === 'admin' || profile.tier === 'unlimited' ? '∞ အကန့်အသတ်မရှိ' : profile.credits.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">lines</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                    <Sparkles className="w-6 h-6" />
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
                  ဝယ်ယူထားသော Access Code သို့မဟုတ် ပရိုမိုးရှင်းကုဒ်ရှိပါက ရိုက်ထည့်၍ Credits တိုးနိုင်ပါသည်
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
                {/* Google Icon */}
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

          {/* Pricing & Top-Up Packages (Business Model Cards) */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-1.5 text-slate-200 font-bold">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>ခရက်ဒစ် ဝယ်ယူရန် Packages များ</span>
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
                <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Fansubber Pro</div>
                <div className="text-lg font-black text-slate-100 font-mono">5,000 Lines</div>
                <div className="text-xs font-bold text-amber-300 font-mono">10,000 MMK</div>
                <p className="text-[10px] text-slate-400">Anime Season တစ်ခုစာ အေးဆေး</p>
              </div>

              {/* Plan 3 */}
              <div className="bg-[#131728] border border-[#23273e] hover:border-amber-500/50 p-3 rounded-lg text-center space-y-1.5 transition">
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">VIP Studio</div>
                <div className="text-lg font-black text-slate-100 font-mono">Unlimited</div>
                <div className="text-xs font-bold text-amber-400 font-mono">25,000 MMK / လ</div>
                <p className="text-[10px] text-slate-400">တစ်လလုံး စိတ်ကြိုက်ဘာသာပြန်</p>
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
                    className="p-1.5 hover:bg-[#25283a] rounded text-slate-400 hover:text-slate-200 transition"
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
                    className="p-1.5 hover:bg-[#25283a] rounded text-slate-400 hover:text-slate-200 transition"
                    title="Copy Phone"
                  >
                    {copiedField === 'wave' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-2 bg-purple-950/40 border border-purple-800/40 rounded flex items-center justify-between text-[11px] text-purple-200">
                <span>ငွေလွှဲပြီးနောက် ပြေစာပို့၍ ကုတ်ယူရန်:</span>
                <a
                  href="https://t.me/aungkyawkhant"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold flex items-center space-x-1 transition"
                >
                  <Send className="w-3 h-3" />
                  <span>Telegram မှ Admin ဆက်သွယ်ရန်</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
