import React, { useState, useEffect } from 'react';
import { DonationConfig } from '../types';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  Save,
  CheckCircle2,
  Trash2,
  Download,
  Eye,
  RefreshCw,
  Search,
  FileText,
  Clock,
  Heart,
  Smartphone,
  LogOut,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface SavedFileMeta {
  id: string;
  diskFileName: string;
  fileName: string;
  format: string;
  contentMode: string;
  subtitleCount: number;
  savedAt: string;
  sizeBytes: number;
}

interface AdminPanelProps {
  onUpdateDonationConfig: (config: DonationConfig) => void;
  currentDonationConfig?: DonationConfig;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onUpdateDonationConfig,
  currentDonationConfig,
}) => {
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return sessionStorage.getItem('admin_pass') || '';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<'donation' | 'files' | 'password'>('donation');

  // Donation State
  const [donationForm, setDonationForm] = useState<DonationConfig>({
    kpayPhone: currentDonationConfig?.kpayPhone || '09778899001',
    kpayName: currentDonationConfig?.kpayName || 'AnimeGabar Admin',
    wavePhone: currentDonationConfig?.wavePhone || '09778899001',
    waveName: currentDonationConfig?.waveName || 'AnimeGabar Admin',
    note: currentDonationConfig?.note || 'Server ဖိုးနှင့် AI ဘာသာပြန်စရိတ် ကူညီထောက်ပံ့ပေးသော စိတ်ကောင်းစေတနာရှင်များအားလုံးကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်။',
  });
  const [isSavingDonation, setIsSavingDonation] = useState(false);
  const [donationSaveSuccess, setDonationSaveSuccess] = useState(false);

  // Saved Files State
  const [savedFiles, setSavedFiles] = useState<SavedFileMeta[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [previewFile, setPreviewFile] = useState<{ meta: SavedFileMeta; content: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Password Change State
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync props if changed
  useEffect(() => {
    if (currentDonationConfig) {
      setDonationForm((prev) => ({ ...prev, ...currentDonationConfig }));
    }
  }, [currentDonationConfig]);

  // Check initial password validity if already stored in sessionStorage
  useEffect(() => {
    if (adminPassword) {
      verifyPassword(adminPassword, true);
    }
  }, []);

  const verifyPassword = async (pass: string, isAutoCheck = false) => {
    if (!pass) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Fallback for Hostinger Static Web Hosting
        const storedPass = localStorage.getItem('admin_password') || 'admin123';
        if (pass === storedPass) {
          setIsLoggedIn(true);
          setAdminPassword(pass);
          sessionStorage.setItem('admin_pass', pass);
        } else {
          if (!isAutoCheck) {
            setLoginError('စကားဝှက် မှားယွင်းနေပါသည်');
          }
          setIsLoggedIn(false);
          sessionStorage.removeItem('admin_pass');
        }
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        setIsLoggedIn(true);
        setAdminPassword(pass);
        sessionStorage.setItem('admin_pass', pass);
        // Load files
        fetchSavedFiles(pass);
      } else {
        if (!isAutoCheck) {
          setLoginError(data.error || 'စကားဝှက် မှားယွင်းနေပါသည်။');
        }
        setIsLoggedIn(false);
        sessionStorage.removeItem('admin_pass');
      }
    } catch (err) {
      // Offline / Static host fallback
      const storedPass = localStorage.getItem('admin_password') || 'admin123';
      if (pass === storedPass) {
        setIsLoggedIn(true);
        setAdminPassword(pass);
        sessionStorage.setItem('admin_pass', pass);
      } else {
        if (!isAutoCheck) setLoginError('စကားဝှက် မှားယွင်းနေပါသည် (Default Pass: admin123)');
        setIsLoggedIn(false);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPassword(loginInput);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAdminPassword('');
    sessionStorage.removeItem('admin_pass');
    setLoginInput('');
  };

  const fetchSavedFiles = async (passToUse?: string) => {
    const pass = passToUse || adminPassword;
    if (!pass) return;
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/admin/saved-subtitles', {
        headers: { 'x-admin-password': pass },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setSavedFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSaveDonationConfig = async () => {
    if (!adminPassword) return;
    setIsSavingDonation(true);
    setDonationSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/update-donation-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ donationConfig: donationForm }),
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Static Web Hosting fallback
        localStorage.setItem('user_donation_config', JSON.stringify(donationForm));
        localStorage.setItem('local_donation_config', JSON.stringify(donationForm));
        onUpdateDonationConfig(donationForm);
        setDonationSaveSuccess(true);
        setTimeout(() => setDonationSaveSuccess(false), 3000);
        return;
      }
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('user_donation_config', JSON.stringify(donationForm));
        localStorage.setItem('local_donation_config', JSON.stringify(donationForm));
        setDonationSaveSuccess(true);
        onUpdateDonationConfig(donationForm);
        setTimeout(() => setDonationSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'အလှူငွေ အကောင့်များ ပြင်ဆင်ရန် အဆင်မပြေပါ');
      }
    } catch (err) {
      // Static Web Hosting fallback
      localStorage.setItem('user_donation_config', JSON.stringify(donationForm));
      localStorage.setItem('local_donation_config', JSON.stringify(donationForm));
      onUpdateDonationConfig(donationForm);
      setDonationSaveSuccess(true);
      setTimeout(() => setDonationSaveSuccess(false), 3000);
    } finally {
      setIsSavingDonation(false);
    }
  };

  const handleDeleteFile = async (id: string, fileName: string) => {
    if (!window.confirm(`"${fileName}" ဖိုင်ကို Server ပေါ်မှ အပြီးအပိုင် ဖျက်ရန် သေချာပါသလား?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/saved-subtitles/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword },
      });
      if (res.ok) {
        setSavedFiles((prev) => prev.filter((f) => f.id !== id));
        if (previewFile?.meta.id === id) setPreviewFile(null);
      } else {
        alert('ဖိုင်ဖျက်ရန် အဆင်မပြေပါ');
      }
    } catch (err) {
      alert('Server ချိတ်ဆက်မှု အဆင်မပြေပါ');
    }
  };

  const handlePreviewFile = async (meta: SavedFileMeta) => {
    setIsPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/saved-subtitles/download/${meta.id}?view=text`, {
        headers: { 'x-admin-password': adminPassword },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setPreviewFile({ meta, content: data.content });
      } else {
        alert('ဖိုင်ဖတ်ရှုရန် အဆင်မပြေပါ (Static hosting ပေါ်တွင် မရရှိနိုင်ပါ)');
      }
    } catch (err) {
      alert('Server ချိတ်ဆက်မှု အဆင်မပြေပါ');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownloadFile = (meta: SavedFileMeta) => {
    window.open(`/api/admin/saved-subtitles/download/${meta.id}?adminPassword=${encodeURIComponent(adminPassword)}`, '_blank');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) return;
    setIsChangingPass(true);
    setPassMessage(null);
    try {
      const res = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ newPassword: newPasswordInput.trim() }),
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        localStorage.setItem('admin_password', newPasswordInput.trim());
        setAdminPassword(newPasswordInput.trim());
        sessionStorage.setItem('admin_pass', newPasswordInput.trim());
        setNewPasswordInput('');
        setPassMessage({ type: 'success', text: 'Admin စကားဝှက် အသစ် ပြောင်းလဲပြီးပါပြီ!' });
        return;
      }
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('admin_password', newPasswordInput.trim());
        setAdminPassword(newPasswordInput.trim());
        sessionStorage.setItem('admin_pass', newPasswordInput.trim());
        setNewPasswordInput('');
        setPassMessage({ type: 'success', text: 'Admin စကားဝှက် အသစ် ပြောင်းလဲပြီးပါပြီ!' });
      } else {
        setPassMessage({ type: 'error', text: data.error || 'စကားဝှက် ပြောင်းလဲရန် အဆင်မပြေပါ' });
      }
    } catch (err) {
      localStorage.setItem('admin_password', newPasswordInput.trim());
      setAdminPassword(newPasswordInput.trim());
      sessionStorage.setItem('admin_pass', newPasswordInput.trim());
      setNewPasswordInput('');
      setPassMessage({ type: 'success', text: 'Admin စကားဝှက် အသစ် ပြောင်းလဲပြီးပါပြီ!' });
    } finally {
      setIsChangingPass(false);
    }
  };

  const filteredFiles = savedFiles.filter(
    (f) =>
      f.fileName.toLowerCase().includes(fileSearch.toLowerCase()) ||
      f.format.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Render Login Form if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Admin စီမံခန့်ခွဲမှု အကောင့်ဝင်ရန်
            </h2>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Admin စကားဝှက် (Password)
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="စကားဝှက် ထည့်ပါ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition font-mono"
                  autoFocus
                />
              </div>
              {loginError && (
                <p className="text-xs text-rose-400 mt-1.5 font-medium">{loginError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !loginInput}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
            >
              {isLoggingIn ? (
                <span>စစ်ဆေးနေပါသည်...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Admin ဝင်မည်</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-100">
                Admin Control Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Authorized
              </span>
            </div>
            <p className="text-xs text-slate-400">
              အလှူငွေ အကောင့်များ ပြင်ဆင်ခြင်းနှင့် Server ပေါ်မှ စာတန်းထိုး ဖိုင်များကို စီမံခန့်ခွဲခြင်း
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-xs font-semibold border border-slate-700 transition self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Admin မှ ထွက်မည်</span>
        </button>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('donation')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'donation'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Heart className="w-4 h-4 fill-current text-rose-400" />
          <span>အလှူငွေ အကောင့်များ စီမံရန်</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('files');
            fetchSavedFiles();
          }}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'files'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>သိမ်းဆည်းထားသော ဖိုင်များ ({savedFiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'password'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Admin စကားဝှက် ပြောင်းရန်</span>
        </button>
      </div>

      {/* Tab 1: Donation Config Settings */}
      {activeTab === 'donation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Heart className="w-4 h-4 text-rose-400 fill-current" />
                <span>အလှူငွေ လက်ခံသည့် အကောင့်များ (KPay & Wave Money)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ဒီနေရာတွင် ပြင်ဆင်လိုက်သော KBZPay/Wave Money ဖုန်းနံပါတ်များကို ဝက်ဘ်ဆိုက်အသုံးပြုသူ အားလုံး ချက်ချင်း မြင်တွေ့ရမည်ဖြစ်သည်
              </p>
            </div>
            {donationSaveSuccess && (
              <span className="flex items-center space-x-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                <span>သိမ်းဆည်းပြီးပါပြီ</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KBZPay Config */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-blue-900/30 space-y-4">
              <div className="flex items-center space-x-2 text-sm font-bold text-blue-400">
                <Smartphone className="w-4 h-4" />
                <span>KBZPay (KPay) အကောင့်</span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  KPay ဖုန်းနံပါတ်
                </label>
                <input
                  type="text"
                  value={donationForm.kpayPhone}
                  onChange={(e) =>
                    setDonationForm({ ...donationForm, kpayPhone: e.target.value })
                  }
                  placeholder="09xxxxxxxxx"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  KPay အကောင့်အမည်
                </label>
                <input
                  type="text"
                  value={donationForm.kpayName}
                  onChange={(e) =>
                    setDonationForm({ ...donationForm, kpayName: e.target.value })
                  }
                  placeholder="အကောင့်အမည် ထည့်ပါ"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Wave Money Config */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-amber-900/30 space-y-4">
              <div className="flex items-center space-x-2 text-sm font-bold text-amber-400">
                <Smartphone className="w-4 h-4" />
                <span>Wave Money အကောင့်</span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  Wave ဖုန်းနံပါတ်
                </label>
                <input
                  type="text"
                  value={donationForm.wavePhone}
                  onChange={(e) =>
                    setDonationForm({ ...donationForm, wavePhone: e.target.value })
                  }
                  placeholder="09xxxxxxxxx"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  Wave အကောင့်အမည်
                </label>
                <input
                  type="text"
                  value={donationForm.waveName}
                  onChange={(e) =>
                    setDonationForm({ ...donationForm, waveName: e.target.value })
                  }
                  placeholder="အကောင့်အမည် ထည့်ပါ"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Donation Note */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">
              အလှူရှင်များထံ ပြသပေးမည့် ကျေးဇူးတင်လွှာ အမှာစာ (Note)
            </label>
            <textarea
              rows={3}
              value={donationForm.note}
              onChange={(e) =>
                setDonationForm({ ...donationForm, note: e.target.value })
              }
              placeholder="အမှာစာ ထည့်ပါ..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveDonationConfig}
              disabled={isSavingDonation}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingDonation ? 'သိမ်းဆည်းနေပါသည်...' : 'အလှူငွေ အကောင့်များ သိမ်းဆည်းမည်'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Saved Files Manager */}
      {activeTab === 'files' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Server ပေါ်ရှိ စာတန်းထိုး ဖိုင်များ စီမံခန့်ခွဲရန်</span>
              </h2>
            </div>

            <button
              onClick={() => fetchSavedFiles()}
              disabled={isLoadingFiles}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>မွမ်းမံမည်</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="ဖိုင်အမည်ဖြင့် ရှာဖွေပါ..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Files List Table */}
          {isLoadingFiles ? (
            <div className="py-12 text-center text-xs text-slate-400">
              ဖိုင်များကို ရယူနေပါသည်...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <FileText className="w-8 h-8 text-slate-700 mx-auto" />
              <p>သိမ်းဆည်းထားသော စာတန်းထိုး ဖိုင် မရှိသေးပါ</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">ဖိုင်အမည်</th>
                    <th className="py-3 px-4">Format / Mode</th>
                    <th className="py-3 px-4">စာကြောင်းရေ</th>
                    <th className="py-3 px-4">ဖိုင်ဆိုဒ်</th>
                    <th className="py-3 px-4">သိမ်းဆည်းချိန်</th>
                    <th className="py-3 px-4 text-right">လုပ်ဆောင်ချက်</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-medium text-slate-100 max-w-xs truncate">
                        {file.fileName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1 uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {file.format}
                        </span>
                        <span className="ml-1.5 text-[11px] text-slate-400">
                          ({file.contentMode})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {file.subtitleCount}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {formatFileSize(file.sizeBytes)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(file.savedAt).toLocaleString('my-MM', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handlePreviewFile(file)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                            title="ဖိုင်အထဲမှစာများ ကြည့်ရန်"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg transition"
                            title="ဒေါင်းလုဒ်ဆွဲရန်"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id, file.fileName)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                            title="ဖျက်မည်"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Change Password */}
      {activeTab === 'password' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-md shadow-sm">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Admin စကားဝှက် ပြောင်းလဲရန်</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Admin Control Panel သို့ ဝင်ရောက်သည့် စကားဝှက်ကို ပြောင်းလဲပါ
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">
                စကားဝှက် အသစ် (New Password)
              </label>
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="စကားဝှက် အသစ် ထည့်ပါ (အနည်းဆုံး ၄ လုံး)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            {passMessage && (
              <p
                className={`text-xs font-medium ${
                  passMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {passMessage.text}
              </p>
            )}

            <button
              type="submit"
              disabled={isChangingPass || !newPasswordInput.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg transition"
            >
              {isChangingPass ? 'ပြောင်းလဲနေပါသည်...' : 'စကားဝှက် အသစ် ပြောင်းမည်'}
            </button>
          </form>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{previewFile.meta.fileName}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Format: {previewFile.meta.format.toUpperCase()} | Subtitle Lines: {previewFile.meta.subtitleCount}
                </p>
              </div>

              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-y-auto text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
              {previewFile.content}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewFile.content);
                  alert('စာတန်းထိုး စာသားများ ကူးယူပြီးပါပြီ');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition flex items-center space-x-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>စာသားများ ကူးမည်</span>
              </button>

              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
              >
                ပိတ်မည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
