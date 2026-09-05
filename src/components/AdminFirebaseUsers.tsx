import React, { useState, useEffect } from 'react';
import { db, AppUserProfile } from '../lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  Users,
  Search,
  Sparkles,
  Crown,
  Gift,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface PromoCodeItem {
  id: string;
  code: string;
  credits: number;
  isVipUpgrade?: boolean;
  maxUses?: number;
  usedCount?: number;
  isActive: boolean;
  createdAt?: any;
}

export const AdminFirebaseUsers: React.FC = () => {
  const [users, setUsers] = useState<AppUserProfile[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'promos'>('users');

  // New promo code form
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoCredits, setNewPromoCredits] = useState<number>(500);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<number>(100);
  const [newPromoIsVip, setNewPromoIsVip] = useState<boolean>(false);
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom credits adjustment modal/state
  const [adjustingUser, setAdjustingUser] = useState<AppUserProfile | null>(null);
  const [adjustCreditsAmount, setAdjustCreditsAmount] = useState<number>(500);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'), limit(100));
      const snap = await getDocs(q);
      const list: AppUserProfile[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as AppUserProfile);
      });
      setUsers(list);
    } catch (err) {
      console.warn('Error fetching Firestore users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchPromoCodes = async () => {
    setIsLoadingPromos(true);
    try {
      const snap = await getDocs(collection(db, 'promoCodes'));
      const list: PromoCodeItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PromoCodeItem);
      });
      setPromoCodes(list);
    } catch (err) {
      console.warn('Error fetching promo codes:', err);
    } finally {
      setIsLoadingPromos(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPromoCodes();
  }, []);

  const handleAdjustCredits = async (user: AppUserProfile, amount: number, setVip?: boolean) => {
    setIsAdjusting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates: any = {
        credits: increment(amount),
      };
      if (typeof setVip === 'boolean') {
        updates.isVip = setVip;
        updates.tier = setVip ? 'pro' : 'free';
      }
      await updateDoc(userRef, updates);
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                credits: Math.max(0, (u.credits || 0) + amount),
                ...(typeof setVip === 'boolean' ? { isVip: setVip, tier: setVip ? 'pro' : 'free' } : {}),
              }
            : u
        )
      );
      setAdjustingUser(null);
    } catch (err: any) {
      alert('ခရက်ဒစ် ပြင်ဆင်မှု မအောင်မြင်ပါ: ' + (err.message || 'Error'));
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newPromoCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsCreatingPromo(true);
    setPromoMessage(null);
    try {
      const promoRef = doc(db, 'promoCodes', cleanCode);
      const promoData = {
        code: cleanCode,
        credits: Number(newPromoCredits) || 0,
        maxUses: Number(newPromoMaxUses) || 100,
        usedCount: 0,
        isVipUpgrade: !!newPromoIsVip,
        isActive: true,
        createdAt: serverTimestamp(),
      };
      await setDoc(promoRef, promoData);
      setPromoMessage({ type: 'success', text: `Promo Code "${cleanCode}" အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!` });
      setNewPromoCode('');
      fetchPromoCodes();
    } catch (err: any) {
      setPromoMessage({ type: 'error', text: err.message || 'Promo code ဖန်တီးရန် မအောင်မြင်ပါ' });
    } finally {
      setIsCreatingPromo(false);
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    if (!confirm(`Promo Code "${id}" ကို ဖျက်ရန် သေချာပါသလား?`)) return;
    try {
      await deleteDoc(doc(db, 'promoCodes', id));
      setPromoCodes((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert('ဖျက်ရန် မအောင်မြင်ပါ: ' + err.message);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    return (
      u.email?.toLowerCase().includes(term) ||
      u.displayName?.toLowerCase().includes(term) ||
      u.uid.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Users vs Promo Codes */}
      <div className="flex items-center justify-between border-b border-[#23273e] pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-[#131728] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Credit Balances ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('promos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'promos'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[#131728] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Promo Codes & Vouchers ({promoCodes.length})</span>
          </button>
        </div>

        <button
          onClick={() => {
            fetchUsers();
            fetchPromoCodes();
          }}
          disabled={isLoadingUsers || isLoadingPromos}
          className="p-1.5 bg-[#131728] hover:bg-[#1f2540] text-slate-300 rounded border border-[#262c4a] transition cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers || isLoadingPromos ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {activeSubTab === 'users' ? (
        <div className="space-y-3">
          {/* User Search Bar */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="User Email သို့မဟုတ် အမည်ဖြင့် ရှာဖွေပါ..."
                className="w-full bg-[#0b0d17] border border-[#23273e] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* User List Table */}
          <div className="bg-[#0e101a] border border-[#23273e] rounded-xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#151829] text-slate-400 text-[11px] uppercase border-b border-[#23273e]">
                  <tr>
                    <th className="p-3">User Profile</th>
                    <th className="p-3">Role / Tier</th>
                    <th className="p-3">Available Credits</th>
                    <th className="p-3">Total Translated</th>
                    <th className="p-3 text-right">Quick Credit Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2238]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        {isLoadingUsers ? 'User စာရင်း ရယူနေပါသည်...' : 'User မတွေ့ရှိပါ'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-[#131627] transition">
                        <td className="p-3">
                          <div className="flex items-center space-x-2.5">
                            {u.photoURL ? (
                              <img
                                src={u.photoURL}
                                alt={u.displayName || 'User'}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full border border-purple-500/40 object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-xs border border-purple-500/30">
                                {u.displayName?.[0] || u.email?.[0] || 'U'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                                <span>{u.displayName || 'No Name'}</span>
                                {u.isVip && (
                                  <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                                    VIP
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold inline-block ${
                                u.role === 'admin'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : u.isVip
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-purple-950/70 text-purple-300 border border-purple-800'
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono">Tier: {u.tier}</div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-baseline space-x-1">
                            <span className="font-mono font-bold text-sm text-amber-300">
                              {u.role === 'admin' ? '∞' : (u.credits || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400">lines</span>
                          </div>
                        </td>

                        <td className="p-3 font-mono text-slate-300">
                          {(u.totalTranslatedLines || 0).toLocaleString()} lines
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleAdjustCredits(u, 500)}
                              className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800 text-purple-200 rounded text-[11px] font-bold transition cursor-pointer"
                              title="+500 Credits ထည့်မည်"
                            >
                              +500
                            </button>
                            <button
                              onClick={() => handleAdjustCredits(u, 1000)}
                              className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800 text-purple-200 rounded text-[11px] font-bold transition cursor-pointer"
                              title="+1,000 Credits ထည့်မည်"
                            >
                              +1,000
                            </button>
                            <button
                              onClick={() => handleAdjustCredits(u, 0, !u.isVip)}
                              className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                u.isVip
                                  ? 'bg-amber-950/50 hover:bg-amber-900 text-amber-300 border border-amber-700/50'
                                  : 'bg-indigo-950/50 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50'
                              }`}
                              title={u.isVip ? 'Remove VIP' : 'Grant VIP Status'}
                            >
                              {u.isVip ? 'Revoke VIP' : 'Make VIP'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Promo Codes Tab */
        <div className="space-y-4">
          {/* Create Promo Code Card */}
          <form
            onSubmit={handleCreatePromoCode}
            className="bg-[#0e101a] border border-[#23273e] p-4 rounded-xl space-y-3 shadow-md"
          >
            <div className="flex items-center space-x-2 text-slate-100 font-bold text-xs">
              <Gift className="w-4 h-4 text-amber-400" />
              <span>Promo Code / Voucher အသစ် ဖန်တီးရန်</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Code (အမည်)</label>
                <input
                  type="text"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value)}
                  placeholder="ဥပမာ- ANIME2026"
                  required
                  className="w-full bg-[#070912] border border-[#282d47] rounded px-3 py-1.5 text-xs text-slate-100 uppercase font-mono tracking-wider focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Credits (စာကြောင်းရေ)</label>
                <input
                  type="number"
                  value={newPromoCredits}
                  onChange={(e) => setNewPromoCredits(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full bg-[#070912] border border-[#282d47] rounded px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">အများဆုံး သုံးခွင့် (Max Uses)</label>
                <input
                  type="number"
                  value={newPromoMaxUses}
                  onChange={(e) => setNewPromoMaxUses(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full bg-[#070912] border border-[#282d47] rounded px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center space-x-2 text-xs text-slate-300 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPromoIsVip}
                    onChange={(e) => setNewPromoIsVip(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span>VIP Upgrade ပါဝင်မည်</span>
                </label>

                <button
                  type="submit"
                  disabled={isCreatingPromo || !newPromoCode.trim()}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs transition disabled:opacity-50 flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreatingPromo ? 'ဖန်တီးနေသည်...' : 'Code ဖန်တီးမည်'}</span>
                </button>
              </div>
            </div>

            {promoMessage && (
              <div
                className={`p-2 rounded text-xs flex items-center space-x-1.5 ${
                  promoMessage.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-300'
                    : 'bg-rose-950/70 border border-rose-700 text-rose-300'
                }`}
              >
                {promoMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{promoMessage.text}</span>
              </div>
            )}
          </form>

          {/* Promo Codes List */}
          <div className="bg-[#0e101a] border border-[#23273e] rounded-xl overflow-hidden shadow-md">
            <div className="p-3 bg-[#151829] border-b border-[#23273e] font-bold text-xs text-slate-300">
              ရှိပြီးသား Promo Codes / Vouchers စာရင်း ({promoCodes.length})
            </div>

            <div className="divide-y divide-[#1e2238]">
              {promoCodes.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  {isLoadingPromos ? 'ကုတ်များ ရယူနေပါသည်...' : 'Promo Code မရှိသေးပါ'}
                </div>
              ) : (
                promoCodes.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between hover:bg-[#131627] transition">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-slate-100 tracking-wider">
                            {p.code}
                          </span>
                          {p.isVipUpgrade && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.2 rounded font-bold">
                              VIP Upgrade
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-3 mt-0.5">
                          <span>Credits: <strong className="text-amber-300 font-mono">+{p.credits?.toLocaleString()}</strong> lines</span>
                          <span>အသုံးပြုပြီးမှု: <strong className="text-slate-200 font-mono">{p.usedCount || 0} / {p.maxUses || '∞'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyCode(p.code)}
                        className="p-1.5 bg-[#131728] hover:bg-[#1d2238] text-slate-300 rounded border border-[#242944] transition flex items-center space-x-1 text-xs cursor-pointer"
                        title="Copy Code"
                      >
                        {copiedCode === p.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[10px] hidden sm:inline">Copy</span>
                      </button>

                      <button
                        onClick={() => handleDeletePromoCode(p.id)}
                        className="p-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-300 rounded border border-rose-800/40 transition cursor-pointer"
                        title="Delete Code"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
