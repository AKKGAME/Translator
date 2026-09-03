import React, { useState, useEffect } from 'react';
import { DonationConfig, TelegramConfig, UsageConfig, AccessKeyItem } from '../types';
import {
  testTelegramConnection,
  sendDocumentToTelegramDirect,
  PERMANENT_TELEGRAM_BOT_TOKEN,
  PERMANENT_TELEGRAM_CHANNEL_ID,
} from '../utils/telegramDirect';
import {
  DEFAULT_USAGE_CONFIG,
  getLocalUsageConfig,
  saveLocalUsageConfig,
  generateRandomAccessKey,
} from '../utils/accessKeyUtils';
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
  Send,
  Sliders,
  ExternalLink,
  HelpCircle,
  ArrowLeft,
  Home,
  Crown,
  Zap,
  Plus,
  Percent,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  Cpu,
  Activity,
  CheckCheck,
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
  onBackToUserPanel?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onUpdateDonationConfig,
  currentDonationConfig,
  onBackToUserPanel,
}) => {
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return sessionStorage.getItem('admin_pass') || '';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<'donation' | 'usage' | 'keypool' | 'telegram' | 'files' | 'password'>('donation');

  // Gemini Multi-Key Pool State
  const [keyPoolKeys, setKeyPoolKeys] = useState<any[]>([]);
  const [keyPoolStats, setKeyPoolStats] = useState<{
    totalKeys: number;
    activeCount: number;
    cooldownCount: number;
    errorCount: number;
    strategy: 'round_robin' | 'least_used' | 'random';
  }>({
    totalKeys: 0,
    activeCount: 0,
    cooldownCount: 0,
    errorCount: 0,
    strategy: 'round_robin',
  });
  const [isLoadingKeyPool, setIsLoadingKeyPool] = useState(false);
  const [bulkKeysInput, setBulkKeysInput] = useState('');
  const [keyLabelPrefix, setKeyLabelPrefix] = useState('Gemini Studio Key');
  const [isAddingKeys, setIsAddingKeys] = useState(false);
  const [addKeyMessage, setAddKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [isTestingAllKeys, setIsTestingAllKeys] = useState(false);
  const [testSummary, setTestSummary] = useState<string | null>(null);
  const [selectedGeminiKeyIds, setSelectedGeminiKeyIds] = useState<string[]>([]);
  const [selectedVipKeyIds, setSelectedVipKeyIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Usage Limits & VIP Keys State
  const [usageConfig, setUsageConfig] = useState<UsageConfig>(() => getLocalUsageConfig());
  const [isSavingUsage, setIsSavingUsage] = useState(false);
  const [usageSaveSuccess, setUsageSaveSuccess] = useState(false);
  const [keySearch, setKeySearch] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedMsgKeyId, setCopiedMsgKeyId] = useState<string | null>(null);
  const [showAdminKeyInput, setShowAdminKeyInput] = useState(false);

  // New Key Form State
  const [newKeyForm, setNewKeyForm] = useState({
    code: '',
    label: '',
    maxLines: 5000,
    expiresAt: '',
    note: '',
  });
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [createKeyError, setCreateKeyError] = useState('');
  const [createKeySuccess, setCreateKeySuccess] = useState('');

  // Donation State
  const [donationForm, setDonationForm] = useState<DonationConfig>({
    kpayPhone: currentDonationConfig?.kpayPhone || '09770033353',
    kpayName: currentDonationConfig?.kpayName || 'Aung Kyaw Khant',
    wavePhone: currentDonationConfig?.wavePhone || '09668888555',
    waveName: currentDonationConfig?.waveName || 'Aung Kyaw Khant',
    note: currentDonationConfig?.note || 'Server ဖိုးနှင့် AI ဘာသာပြန်စရိတ် ကူညီထောက်ပံ့ပေးသော စိတ်ကောင်းစေတနာရှင်များအားလုံးကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်။',
  });
  const [isSavingDonation, setIsSavingDonation] = useState(false);
  const [donationSaveSuccess, setDonationSaveSuccess] = useState(false);

  // Telegram Config State
  const [telegramForm, setTelegramForm] = useState<TelegramConfig>(() => {
    try {
      const local = typeof window !== 'undefined' ? localStorage.getItem('telegram_config') : null;
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') {
          return {
            botToken: PERMANENT_TELEGRAM_BOT_TOKEN,
            channelId: PERMANENT_TELEGRAM_CHANNEL_ID,
            enabled: parsed.enabled ?? true,
            captionTemplate: parsed.captionTemplate || '🎬 <b>ဘာသာပြန် စာတန်းထိုးဖိုင်:</b> <code>{fileName}</code>\n📝 <b>အမျိုးအစား:</b> {contentMode} ({format})\n📊 <b>စာကြောင်းရေ:</b> {subtitleCount} ကြောင်း\n⏱ <b>သိမ်းဆည်းချိန်:</b> {savedAt}\n✨ <b>Translated with:</b> AnimeGabar AI Subtitle Translator',
            sendOnDownload: parsed.sendOnDownload ?? true,
          };
        }
      }
    } catch (e) {
      // Ignore
    }
    return {
      botToken: PERMANENT_TELEGRAM_BOT_TOKEN,
      channelId: PERMANENT_TELEGRAM_CHANNEL_ID,
      enabled: true,
      captionTemplate: '🎬 <b>ဘာသာပြန် စာတန်းထိုးဖိုင်:</b> <code>{fileName}</code>\n📝 <b>အမျိုးအစား:</b> {contentMode} ({format})\n📊 <b>စာကြောင်းရေ:</b> {subtitleCount} ကြောင်း\n⏱ <b>သိမ်းဆည်းချိန်:</b> {savedAt}\n✨ <b>Translated with:</b> AnimeGabar AI Subtitle Translator',
      sendOnDownload: true,
    };
  });
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [telegramSaveSuccess, setTelegramSaveSuccess] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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

  const fetchTelegramConfig = async (passToUse?: string) => {
    const pass = passToUse || adminPassword;
    if (!pass) return;
    try {
      const res = await fetch('/api/admin/telegram-config', {
        headers: { 'x-admin-password': pass },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setTelegramForm((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load telegram config:', err);
    }
  };

  const fetchUsageConfig = async (passToUse?: string) => {
    const pass = passToUse || adminPassword;
    if (!pass) return;
    try {
      const res = await fetch('/api/admin/usage-config', {
        headers: { 'x-admin-password': pass },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setUsageConfig(data);
        saveLocalUsageConfig(data);
      }
    } catch (err) {
      console.error('Failed to load usage config:', err);
    }
  };

  const fetchGeminiKeys = async (passToUse?: string) => {
    const pass = passToUse || adminPassword;
    if (!pass) return;
    setIsLoadingKeyPool(true);
    try {
      const res = await fetch('/api/admin/gemini-keys', {
        headers: { 'x-admin-password': pass },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setKeyPoolKeys(data.keys || []);
        setKeyPoolStats({
          totalKeys: data.totalKeys || 0,
          activeCount: data.activeCount || 0,
          cooldownCount: data.cooldownCount || 0,
          errorCount: data.errorCount || 0,
          strategy: data.strategy || 'round_robin',
        });
      }
    } catch (err) {
      console.error('Failed to load Gemini Key Pool:', err);
    } finally {
      setIsLoadingKeyPool(false);
    }
  };

  const handleAddBulkKeys = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bulkKeysInput.trim()) {
      setAddKeyMessage({ type: 'error', text: 'Gemini API Key (၁ ခု သို့မဟုတ် အများအပြား) ထည့်သွင်းပေးပါ' });
      return;
    }

    setIsAddingKeys(true);
    setAddKeyMessage(null);
    try {
      const res = await fetch('/api/admin/gemini-keys/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({
          rawKeys: bulkKeysInput,
          labelPrefix: keyLabelPrefix || 'Gemini Key',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAddKeyMessage({
          type: 'success',
          text: `Gemini Key အသစ် (${data.addedCount}) ခု Key Pool ထဲသို့ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ!`,
        });
        setBulkKeysInput('');
        fetchGeminiKeys();
      } else {
        setAddKeyMessage({ type: 'error', text: data.error || 'Key များ ထည့်သွင်း၍ မရပါ' });
      }
    } catch (err: any) {
      setAddKeyMessage({ type: 'error', text: err.message || 'Key ထည့်သွင်းမှု မအောင်မြင်ပါ' });
    } finally {
      setIsAddingKeys(false);
    }
  };

  const handleToggleKeyPoolStatus = async (keyId: string) => {
    try {
      const res = await fetch('/api/admin/gemini-keys/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ keyId }),
      });
      if (res.ok) {
        fetchGeminiKeys();
      }
    } catch (err) {
      console.error('Error toggling key status:', err);
    }
  };

  const handleDeleteKeyPoolItem = async (keyId: string, label: string) => {
    if (!window.confirm(`"${label}" Key ကို Key Pool ထဲမှ အပြီးဖျက်ရန် သေချာပါသလား?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/gemini-keys/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ keyId }),
      });
      if (res.ok) {
        fetchGeminiKeys();
        setSelectedGeminiKeyIds((prev) => prev.filter((id) => id !== keyId));
      }
    } catch (err) {
      console.error('Error deleting key from pool:', err);
    }
  };

  // Batch delete selected Gemini keys
  const handleDeleteSelectedGeminiKeys = async () => {
    if (selectedGeminiKeyIds.length === 0) {
      alert('ကျေးဇူးပြု၍ ဖျက်လိုသော Key များကို ရွေးချယ်ပေးပါ');
      return;
    }
    if (!window.confirm(`ရွေးချယ်ထားသော Gemini Key (${selectedGeminiKeyIds.length}) ခုကို Key Pool မှ အပြီးဖျက်ရန် သေချာပါသလား?`)) {
      return;
    }
    setIsBatchDeleting(true);
    try {
      const res = await fetch('/api/admin/gemini-keys/delete-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ keyIds: selectedGeminiKeyIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedGeminiKeyIds([]);
        fetchGeminiKeys();
        alert(data.message || 'ရွေးချယ်ထားသော Key များကို ဖျက်ပြီးပါပြီ');
      } else {
        alert(data.error || 'Key များ ဖျက်၍ မရပါ');
      }
    } catch (err: any) {
      alert(`ဖျက်ရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Batch delete Error/Invalid Gemini keys
  const handleDeleteErrorGeminiKeys = async () => {
    const errorKeysCount = (keyPoolKeys || []).filter(
      (k) => k.status === 'error' || (k.lastErrorMsg && k.lastErrorMsg.includes('Invalid'))
    ).length;

    if (errorKeysCount === 0) {
      alert('လက်ရှိ Key Pool ထဲတွင် Invalid / Error တက်နေသော Key မရှိပါ');
      return;
    }

    if (!window.confirm(`အလုပ်မလုပ်တော့သော / Error တက်နေသော Gemini Key (${errorKeysCount}) ခုကို ရှင်းလင်းဖျက်ထုတ်ရန် သေချာပါသလား?`)) {
      return;
    }
    setIsBatchDeleting(true);
    try {
      const res = await fetch('/api/admin/gemini-keys/delete-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ onlyErrors: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedGeminiKeyIds([]);
        fetchGeminiKeys();
        alert(data.message || 'Error တက်နေသော Key များကို ရှင်းလင်းပြီးပါပြီ');
      }
    } catch (err: any) {
      alert(`ရှင်းလင်းရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Batch delete ALL Gemini keys in pool
  const handleDeleteAllGeminiKeys = async () => {
    const totalCount = keyPoolKeys?.length || 0;
    if (totalCount === 0) {
      alert('Key Pool ထဲတွင် Key မရှိပါ');
      return;
    }
    if (!window.confirm(`⚠️ သတိပြုရန်!\nKey Pool ထဲရှိ Key အားလုံး (${totalCount} ခု) ကို အပြီးအပိုင် ရှင်းလင်းဖျက်ထုတ်ရန် သေချာပါသလား?`)) {
      return;
    }
    setIsBatchDeleting(true);
    try {
      const res = await fetch('/api/admin/gemini-keys/delete-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedGeminiKeyIds([]);
        fetchGeminiKeys();
        alert(data.message || 'Key Pool ထဲရှိ Key အားလုံးကို ရှင်းလင်းပြီးပါပြီ');
      }
    } catch (err: any) {
      alert(`ရှင်းလင်းရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleTestSingleKey = async (keyId: string) => {
    setTestingKeyId(keyId);
    try {
      const res = await fetch('/api/admin/gemini-keys/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ keyId }),
      });
      const data = await res.json();
      fetchGeminiKeys();
      if (data.valid) {
        alert(`✅ Key စစ်ဆေးမှု အောင်မြင်ပါသည်!\nModel: ${data.testedModel}`);
      } else {
        alert(`❌ Key စစ်ဆေးမှု မအောင်မြင်ပါ:\n${data.error}`);
      }
    } catch (err: any) {
      alert(`စစ်ဆေး၍ မရပါ: ${err.message}`);
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleTestAllKeys = async () => {
    setIsTestingAllKeys(true);
    setTestSummary(null);
    try {
      const res = await fetch('/api/admin/gemini-keys/test-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
      });
      const data = await res.json();
      fetchGeminiKeys();
      if (data.success) {
        setTestSummary(`စစ်ဆေးပြီးပါပြီ - စုစုပေါင်း: ${data.summary?.total} | အောင်မြင်: ${data.summary?.valid} | မအောင်မြင်: ${data.summary?.invalid}`);
      }
    } catch (err: any) {
      setTestSummary(`စစ်ဆေးမှု မအောင်မြင်ပါ: ${err.message}`);
    } finally {
      setIsTestingAllKeys(false);
    }
  };

  const handleResetKeyStats = async (keyId?: string) => {
    try {
      const res = await fetch('/api/admin/gemini-keys/reset-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ keyId }),
      });
      if (res.ok) {
        fetchGeminiKeys();
      }
    } catch (err) {
      console.error('Error resetting key stats:', err);
    }
  };

  const handleUpdateStrategy = async (strategy: 'round_robin' | 'least_used' | 'random') => {
    try {
      const res = await fetch('/api/admin/gemini-keys/update-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ strategy }),
      });
      if (res.ok) {
        fetchGeminiKeys();
      }
    } catch (err) {
      console.error('Error updating strategy:', err);
    }
  };

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
        // Fallback for Hostinger Static Web Hosting or direct static preview
        const storedPass = localStorage.getItem('admin_password') || 'admin123';
        if (pass === storedPass || pass === 'admin123') {
          setIsLoggedIn(true);
          setAdminPassword(pass);
          sessionStorage.setItem('admin_pass', pass);
        } else {
          if (!isAutoCheck) {
            setLoginError('စကားဝှက် မှားယွင်းနေပါသည် (မူလ စကားဝှက်: admin123)');
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
        // Load files, telegram, key pool & usage config
        fetchSavedFiles(pass);
        fetchTelegramConfig(pass);
        fetchUsageConfig(pass);
        fetchGeminiKeys(pass);
      } else {
        if (!isAutoCheck) {
          setLoginError(data.error || 'စကားဝှက် မှားယွင်းနေပါသည်။ (မူလ စကားဝှက်: admin123)');
        }
        setIsLoggedIn(false);
        sessionStorage.removeItem('admin_pass');
      }
    } catch (err) {
      // Offline / Static host fallback
      const storedPass = localStorage.getItem('admin_password') || 'admin123';
      if (pass === storedPass || pass === 'admin123') {
        setIsLoggedIn(true);
        setAdminPassword(pass);
        sessionStorage.setItem('admin_pass', pass);
      } else {
        if (!isAutoCheck) setLoginError('စကားဝှက် မှားယွင်းနေပါသည် (မူလ စကားဝှက်: admin123)');
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

  const handleSaveTelegramConfig = async () => {
    if (!adminPassword) return;
    setIsSavingTelegram(true);
    setTelegramSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/update-telegram-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ telegramConfig: telegramForm }),
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        localStorage.setItem('telegram_config', JSON.stringify(telegramForm));
        setTelegramSaveSuccess(true);
        setTimeout(() => setTelegramSaveSuccess(false), 3000);
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('telegram_config', JSON.stringify(telegramForm));
        setTelegramSaveSuccess(true);
        setTimeout(() => setTelegramSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Telegram ဆက်တင် သိမ်းဆည်းရန် အဆင်မပြေပါ');
      }
    } catch (err) {
      localStorage.setItem('telegram_config', JSON.stringify(telegramForm));
      setTelegramSaveSuccess(true);
      setTimeout(() => setTelegramSaveSuccess(false), 3000);
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramForm.botToken?.trim() || !telegramForm.channelId?.trim()) {
      alert('Telegram Bot Token နှင့် Channel ID ထည့်သွင်းပေးပါ');
      return;
    }
    setIsTestingTelegram(true);
    setTelegramTestResult(null);

    try {
      // 1. Try server API endpoint first if running in full Node server environment
      let testedOnServer = false;
      try {
        const res = await fetch('/api/admin/test-telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({
            botToken: telegramForm.botToken,
            channelId: telegramForm.channelId,
          }),
        });

        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          testedOnServer = true;
          if (data.success) {
            setTelegramTestResult({
              success: true,
              message: `${data.message} (${data.chatTitle || telegramForm.channelId})`,
            });
            return;
          } else {
            setTelegramTestResult({
              success: false,
              message: data.error || 'Telegram ချိတ်ဆက်မှု မအောင်မြင်ပါ',
            });
            return;
          }
        }
      } catch (serverErr) {
        // Fallback to direct client API
      }

      // 2. Direct browser test (Works seamlessly on Vercel, Hostinger, GitHub Pages)
      const directResult = await testTelegramConnection(telegramForm.botToken, telegramForm.channelId);
      setTelegramTestResult(directResult);
    } catch (err: any) {
      setTelegramTestResult({
        success: false,
        message: err.message || 'စမ်းသပ်၍ မရပါ',
      });
    } finally {
      setIsTestingTelegram(false);
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

  const handleSaveUsageConfig = async (customCfg?: UsageConfig) => {
    const cfgToSave = customCfg || usageConfig;
    setIsSavingUsage(true);
    setUsageSaveSuccess(false);
    try {
      if (adminPassword) {
        const res = await fetch('/api/admin/update-usage-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({ usageConfig: cfgToSave }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.usageConfig) {
            setUsageConfig(data.usageConfig);
            saveLocalUsageConfig(data.usageConfig);
          }
        }
      }
      saveLocalUsageConfig(cfgToSave);
      setUsageConfig(cfgToSave);
      setUsageSaveSuccess(true);
      setTimeout(() => setUsageSaveSuccess(false), 3000);
    } catch (err) {
      saveLocalUsageConfig(cfgToSave);
      setUsageSaveSuccess(true);
      setTimeout(() => setUsageSaveSuccess(false), 3000);
    } finally {
      setIsSavingUsage(false);
    }
  };

  const handleCreateAccessKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCreateKeyError('');
    setCreateKeySuccess('');

    const codeToUse = (newKeyForm.code || generateRandomAccessKey('AG-VIP')).trim().toUpperCase();
    if (!codeToUse) {
      setCreateKeyError('Key Code ထည့်သွင်းပေးပါ');
      return;
    }

    // Check duplicate
    if (usageConfig.accessKeys?.some((k) => k.code.trim().toUpperCase() === codeToUse)) {
      setCreateKeyError(`Key Code "${codeToUse}" ရှိနှင့်ပြီးဖြစ်ပါသည်`);
      return;
    }

    setIsCreatingKey(true);
    const newKey: AccessKeyItem = {
      id: 'key_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      code: codeToUse,
      label: newKeyForm.label.trim() || `VIP Key: ${codeToUse}`,
      maxLines: Number(newKeyForm.maxLines) || 0,
      usedLines: 0,
      expiresAt: newKeyForm.expiresAt ? new Date(newKeyForm.expiresAt).toISOString() : null,
      createdAt: new Date().toISOString(),
      status: 'active',
      note: newKeyForm.note.trim(),
    };

    try {
      if (adminPassword) {
        await fetch('/api/admin/access-keys/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify(newKey),
        });
      }
    } catch (err) {
      // ignore
    }

    const updated = {
      ...usageConfig,
      accessKeys: [newKey, ...(usageConfig.accessKeys || [])],
    };
    setUsageConfig(updated);
    saveLocalUsageConfig(updated);
    setCreateKeySuccess(`VIP Key "${codeToUse}" အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!`);
    setNewKeyForm({
      code: '',
      label: '',
      maxLines: 5000,
      expiresAt: '',
      note: '',
    });
    setIsCreatingKey(false);
    setTimeout(() => setCreateKeySuccess(''), 4000);
  };

  const handleQuickGenerate = (lines: number, days: number, labelPrefix: string) => {
    const code = generateRandomAccessKey('AG-VIP');
    let exp: string | null = null;
    if (days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      exp = d.toISOString().split('T')[0];
    }
    setNewKeyForm({
      code,
      label: `${labelPrefix} (${lines > 0 ? lines.toLocaleString() + ' Lines' : 'Unlimited'})`,
      maxLines: lines,
      expiresAt: exp || '',
      note: `${days > 0 ? days + ' ရက် သက်တမ်း' : 'သက်တမ်းအကန့်အသတ်မရှိ'} - ${labelPrefix}`,
    });
  };

  const handleToggleKeyStatus = async (keyId: string) => {
    try {
      if (adminPassword) {
        await fetch('/api/admin/access-keys/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({ keyId }),
        });
      }
    } catch (err) {
      // ignore
    }

    const updatedList = (usageConfig.accessKeys || []).map((k) => {
      if (k.id === keyId || k.code === keyId) {
        return {
          ...k,
          status: (k.status === 'active' ? 'revoked' : 'active') as 'active' | 'revoked',
        };
      }
      return k;
    });
    const updated = { ...usageConfig, accessKeys: updatedList };
    setUsageConfig(updated);
    saveLocalUsageConfig(updated);
  };

  const handleResetKeyUsage = async (keyId: string) => {
    if (!window.confirm('ဤ Key ၏ အသုံးပြုပြီး စာကြောင်းရေကို 0 သို့ ပြန်လည်စတင် (Reset) ရန် သေချာပါသလား?')) {
      return;
    }
    try {
      if (adminPassword) {
        await fetch('/api/admin/access-keys/reset-usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({ keyId }),
        });
      }
    } catch (err) {
      // ignore
    }

    const updatedList = (usageConfig.accessKeys || []).map((k) => {
      if (k.id === keyId || k.code === keyId) {
        return { ...k, usedLines: 0 };
      }
      return k;
    });
    const updated = { ...usageConfig, accessKeys: updatedList };
    setUsageConfig(updated);
    saveLocalUsageConfig(updated);
  };

  const handleDeleteKey = async (keyId: string, code: string) => {
    if (!window.confirm(`"${code}" Access Key ကို အပြီးအပိုင် ဖျက်ပစ်ရန် သေချာပါသလား?`)) {
      return;
    }
    try {
      if (adminPassword) {
        await fetch('/api/admin/access-keys/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({ keyId }),
        });
      }
    } catch (err) {
      // ignore
    }

    const updatedList = (usageConfig.accessKeys || []).filter(
      (k) => k.id !== keyId && k.code !== keyId
    );
    const updated = { ...usageConfig, accessKeys: updatedList };
    setUsageConfig(updated);
    saveLocalUsageConfig(updated);
    setSelectedVipKeyIds((prev) => prev.filter((id) => id !== keyId));
  };

  // Batch delete selected VIP keys
  const handleDeleteSelectedVipKeys = async () => {
    if (selectedVipKeyIds.length === 0) {
      alert('ကျေးဇူးပြု၍ ဖျက်လိုသော VIP Key များကို ရွေးချယ်ပေးပါ');
      return;
    }
    if (!window.confirm(`ရွေးချယ်ထားသော VIP Key (${selectedVipKeyIds.length}) ခုကို အပြီးဖျက်ရန် သေချာပါသလား?`)) {
      return;
    }
    setIsBatchDeleting(true);
    try {
      if (adminPassword) {
        const res = await fetch('/api/admin/access-keys/delete-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({ keyIds: selectedVipKeyIds }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message || 'VIP Key များ ဖျက်ပြီးပါပြီ');
        }
      }
      const updatedList = (usageConfig.accessKeys || []).filter(
        (k) => !selectedVipKeyIds.includes(k.id) && !selectedVipKeyIds.includes(k.code)
      );
      const updated = { ...usageConfig, accessKeys: updatedList };
      setUsageConfig(updated);
      saveLocalUsageConfig(updated);
      setSelectedVipKeyIds([]);
    } catch (err: any) {
      alert(`ဖျက်ရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Batch clean up expired or exhausted VIP keys
  const handleDeleteExpiredVipKeys = async () => {
    const now = Date.now();
    const expiredKeys = (usageConfig.accessKeys || []).filter((k) => {
      const isExpired = k.expiresAt && new Date(k.expiresAt).getTime() < now;
      const isExhausted = k.maxLines > 0 && (k.usedLines || 0) >= k.maxLines;
      return isExpired || isExhausted;
    });

    if (expiredKeys.length === 0) {
      alert('သက်တမ်းကုန်ဆုံးထားသော သို့မဟုတ် စာကြောင်းရေပြည့်သွားသော VIP Key မရှိပါ');
      return;
    }

    if (!window.confirm(`သက်တမ်းကုန်ဆုံးပြီး/အသုံးပြုခွင့်ကုန်နေသော VIP Key (${expiredKeys.length}) ခုကို ရှင်းလင်းဖျက်ထုတ်ရန် သေချာပါသလား?`)) {
      return;
    }
    setIsBatchDeleting(true);
    try {
      if (adminPassword) {
        await fetch('/api/admin/access-keys/delete-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({ expiredOnly: true }),
        });
      }
      const updatedList = (usageConfig.accessKeys || []).filter((k) => {
        const isExpired = k.expiresAt && new Date(k.expiresAt).getTime() < now;
        const isExhausted = k.maxLines > 0 && (k.usedLines || 0) >= k.maxLines;
        return !isExpired && !isExhausted;
      });
      const updated = { ...usageConfig, accessKeys: updatedList };
      setUsageConfig(updated);
      saveLocalUsageConfig(updated);
      setSelectedVipKeyIds([]);
      alert(`${expiredKeys.length} ခုသော သက်တမ်းကုန် VIP Key များကို ရှင်းလင်းပြီးပါပြီ`);
    } catch (err: any) {
      alert(`ရှင်းလင်းရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Delete ALL VIP keys
  const handleDeleteAllVipKeys = async () => {
    const totalCount = usageConfig.accessKeys?.length || 0;
    if (totalCount === 0) {
      alert('VIP Key စာရင်းတွင် Key မရှိပါ');
      return;
    }
    if (!window.confirm(`⚠️ သတိပြုရန်!\nVIP Key အားလုံး (${totalCount} ခု) ကို အပြီးအပိုင် ရှင်းလင်းဖျက်ထုတ်ရန် သေချာပါသလား?`)) {
      return;
    }
    setIsBatchDeleting(true);
    try {
      if (adminPassword) {
        await fetch('/api/admin/access-keys/delete-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({ all: true }),
        });
      }
      const updated = { ...usageConfig, accessKeys: [] };
      setUsageConfig(updated);
      saveLocalUsageConfig(updated);
      setSelectedVipKeyIds([]);
      alert('VIP Key အားလုံးကို ရှင်းလင်းဖျက်ပစ်ပြီးပါပြီ');
    } catch (err: any) {
      alert(`ဖျက်ရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleCopyKey = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleCopyShareMessage = (k: AccessKeyItem) => {
    const quotaText = k.maxLines > 0 ? `${k.maxLines.toLocaleString()} စာကြောင်း` : 'အကန့်အသတ်မရှိ (Unlimited)';
    const expText = k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('my-MM') : 'သက်တမ်းအကန့်အသတ်မရှိ (Lifetime)';
    const text = `🎬 **AnimeGabar AI Subtitle Translator - VIP Access Key**
🔑 **Key Code:** \`${k.code}\`
📊 **ခွင့်ပြုစာကြောင်းရေ:** ${quotaText}
⏱ **သက်တမ်း:** ${expText}
✨ **အသုံးပြုရန်:** AnimeGabar တွင် "Access Key ထည့်ရန်" ကို နှိပ်ပြီး အထက်ပါ Code ကို ထည့်သွင်းပါ`;

    navigator.clipboard.writeText(text);
    setCopiedMsgKeyId(k.id);
    setTimeout(() => setCopiedMsgKeyId(null), 2500);
  };

  const filteredKeys = (usageConfig.accessKeys || []).filter(
    (k) =>
      k.code.toLowerCase().includes(keySearch.toLowerCase()) ||
      k.label.toLowerCase().includes(keySearch.toLowerCase()) ||
      (k.note && k.note.toLowerCase().includes(keySearch.toLowerCase()))
  );

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
        <div className="bg-[#0e1219] border border-[#212734] rounded-lg p-6 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-2.5 mb-6">
            <div className="w-11 h-11 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">
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
                  className="w-full bg-[#07090e] border border-[#212734] rounded-md px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition font-mono"
                  autoFocus
                />
              </div>
              {loginError && (
                <p className="text-xs text-rose-400 mt-1.5 font-medium">{loginError}</p>
              )}
              <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>Default Password: <span className="text-indigo-400 font-mono font-semibold">admin123</span></span>
                <span className="text-slate-500">Env: ADMIN_PASSWORD</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !loginInput}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs py-2.5 rounded-md shadow transition flex items-center justify-center space-x-2"
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

          {onBackToUserPanel && (
            <div className="mt-4 pt-4 border-t border-[#212734]">
              <button
                type="button"
                onClick={onBackToUserPanel}
                className="w-full py-2 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 text-xs font-semibold rounded-md border border-[#212734] transition flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>မူလ အသုံးပြုသူ စာမျက်နှာသို့ ပြန်သွားမည် (Back to User Panel)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-5 px-3 sm:px-4 space-y-4">
      {/* Top Header Bar */}
      <div className="bg-[#0e1219] border border-[#212734] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-md border border-indigo-500/30">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100">
                Admin Control Center
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Authorized
              </span>
            </div>
            <p className="text-xs text-slate-400">
              အလှူငွေ အကောင့်များ၊ Telegram Channel ချိတ်ဆက်မှုနှင့် စာတန်းထိုး ဖိုင်များကို စီမံခန့်ခွဲခြင်း
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {onBackToUserPanel && (
            <button
              onClick={onBackToUserPanel}
              className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition shadow-sm"
              title="User Panel သို့ ပြန်သွားမည်"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>User Panel သို့ ပြန်သွားမည်</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#12161f] hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-xs font-semibold border border-[#212734] transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Admin မှ ထွက်မည်</span>
          </button>
        </div>
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
            setActiveTab('usage');
            fetchUsageConfig();
          }}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'usage'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>User ကန့်သတ်ချက်နှင့် VIP Keys ({usageConfig.accessKeys?.length || 0})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('keypool');
            fetchGeminiKeys();
          }}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'keypool'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Gemini Key Pool ({keyPoolStats.activeCount}/{keyPoolStats.totalKeys})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('telegram');
            fetchTelegramConfig();
          }}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'telegram'
              ? 'border-sky-500 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4 text-sky-400" />
          <span>Telegram Channel ချိတ်ဆက်မှု</span>
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

      {/* Tab: User Usage & VIP Access Keys */}
      {activeTab === 'usage' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>User အသုံးပြုမှု ကန့်သတ်ချက်နှင့် VIP Keys စီမံခန့်ခွဲခြင်း</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                သာမန် User များအတွက် နေ့စဥ် ကန့်သတ်စာကြောင်းရေ သတ်မှတ်ခြင်း၊ VIP Voucher Keys များ ဖန်တီးခြင်းနှင့် ကန့်သတ်ချက်များ ထိန်းချုပ်ခြင်း
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {usageSaveSuccess && (
                <span className="flex items-center space-x-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ဆက်တင်များ သိမ်းဆည်းပြီးပါပြီ</span>
                </span>
              )}
              <button
                onClick={() => handleSaveUsageConfig()}
                disabled={isSavingUsage}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingUsage ? 'သိမ်းဆည်းနေပါသည်...' : 'ဆက်တင် သိမ်းဆည်းမည်'}</span>
              </button>
            </div>
          </div>

          {/* System Control Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Setting 1: Free Daily Limit */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>အခမဲ့ User နေ့စဥ် ခွင့်ပြုစာကြောင်းရေ</span>
              </div>
              <p className="text-[11px] text-slate-400">
                သာမန် အသုံးပြုသူများအတွက် တစ်နေ့လျှင် ဘာသာပြန်ခွင့်ပြုမည့် စာကြောင်းရေ (0 ထားပါက အခမဲ့ အသုံးပြုခွင့် ပိတ်မည်)
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="10"
                  value={usageConfig.freeDailyLimit}
                  onChange={(e) =>
                    setUsageConfig({
                      ...usageConfig,
                      freeDailyLimit: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-400 shrink-0">ကြောင်း/ရက်</span>
              </div>
            </div>

            {/* Setting 2: Mandatory VIP Key */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>VIP Key / API Key မဖြစ်မနေ လိုအပ်ရန်</span>
              </div>
              <p className="text-[11px] text-slate-400">
                ဖွင့်ထားပါက VIP Access Key သို့မဟုတ် ကိုယ်ပိုင် API Key မရှိသော User များ လုံးဝ ဘာသာပြန်၍ မရပါ
              </p>
              <label className="relative inline-flex items-center cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={usageConfig.requireAccessKey}
                  onChange={(e) =>
                    setUsageConfig({
                      ...usageConfig,
                      requireAccessKey: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-xs font-medium text-slate-300">
                  {usageConfig.requireAccessKey ? 'VIP Key သာ သုံးခွင့်ပြုသည်' : 'အခမဲ့ User ပါ သုံးခွင့်ပြုသည်'}
                </span>
              </label>
            </div>

            {/* Setting 3: Admin Shared Gemini API Key */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>Admin Gemini API Key (Server)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Server ပေါ်မှ ဘာသာပြန်ပေးမည့် Gemini API Key
              </p>
              <div className="relative">
                <input
                  type={showAdminKeyInput ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={usageConfig.defaultAdminApiKey || ''}
                  onChange={(e) =>
                    setUsageConfig({
                      ...usageConfig,
                      defaultAdminApiKey: e.target.value,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 pr-9 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKeyInput(!showAdminKeyInput)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets for Key Creation */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>1-Click အမြန် VIP Key ဖန်တီးနည်း ပုံစံများ (Quick Presets)</span>
              </span>
              <span className="text-[11px] text-slate-400">ပုံစံတစ်ခုကို နှိပ်ပါက အောက်ပါ Form တွင် ချက်ချင်း ဖြည့်သွင်းပေးပါမည်</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickGenerate(1000, 30, 'VIP 1,000 Lines')}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition group"
              >
                <div className="text-xs font-bold text-amber-400 group-hover:text-amber-300">⚡ 1,000 Lines</div>
                <div className="text-[10px] text-slate-400 mt-0.5">ရက် ၃၀ သက်တမ်း</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickGenerate(5000, 90, 'VIP 5,000 Lines')}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-left transition group"
              >
                <div className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300">👑 5,000 Lines</div>
                <div className="text-[10px] text-slate-400 mt-0.5">ရက် ၉၀ (၃ လ) သက်တမ်း</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickGenerate(20000, 365, 'VIP 20,000 Lines')}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition group"
              >
                <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">💎 20,000 Lines</div>
                <div className="text-[10px] text-slate-400 mt-0.5">၁ နှစ် သက်တမ်း</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickGenerate(0, 0, 'VIP Unlimited Lifetime')}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/40 rounded-xl text-left transition group"
              >
                <div className="text-xs font-bold text-rose-400 group-hover:text-rose-300">♾️ Unlimited</div>
                <div className="text-[10px] text-slate-400 mt-0.5">သက်တမ်း/စာကြောင်း ကန့်သတ်မရှိ</div>
              </button>
            </div>
          </div>

          {/* Form to Create Custom VIP Key */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>VIP Access Key အသစ် ထုတ်ပေးရန် (Issue New Key)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setNewKeyForm({
                    ...newKeyForm,
                    code: generateRandomAccessKey('AG-VIP'),
                  })
                }
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Code အသစ် ကျပန်းထုတ်မည်</span>
              </button>
            </div>

            {createKeyError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createKeyError}</span>
              </div>
            )}

            {createKeySuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{createKeySuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccessKey} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Code */}
                <div>
                  <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                    Access Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="AG-VIP-XXXX"
                    value={newKeyForm.code}
                    onChange={(e) =>
                      setNewKeyForm({ ...newKeyForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Label */}
                <div>
                  <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                    User အမည် / Label
                  </label>
                  <input
                    type="text"
                    placeholder="ဥပမာ - Ko Aung (Supporter)"
                    value={newKeyForm.label}
                    onChange={(e) =>
                      setNewKeyForm({ ...newKeyForm, label: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Max Lines */}
                <div>
                  <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                    ခွင့်ပြု စာကြောင်းရေ (0 = Unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="5000"
                    value={newKeyForm.maxLines}
                    onChange={(e) =>
                      setNewKeyForm({
                        ...newKeyForm,
                        maxLines: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                    သက်တမ်းကုန်ဆုံးမည့် ရက် (မထည့်ပါက Lifetime)
                  </label>
                  <input
                    type="date"
                    value={newKeyForm.expiresAt}
                    onChange={(e) =>
                      setNewKeyForm({ ...newKeyForm, expiresAt: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Note & Submit */}
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="w-full sm:flex-1">
                  <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                    မှတ်ချက် (Note / Donation Ref)
                  </label>
                  <input
                    type="text"
                    placeholder="ဥပမာ - KPay အလှူရှင် / VIP Tier 1"
                    value={newKeyForm.note}
                    onChange={(e) =>
                      setNewKeyForm({ ...newKeyForm, note: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingKey}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 shrink-0 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>VIP Key အသစ် ထုတ်ပေးမည်</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Keys Table / Management */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-slate-200">
                  ထုတ်ပေးထားသော VIP Access Keys စာရင်း ({usageConfig.accessKeys?.length || 0})
                </h3>
                <span className="text-[11px] text-slate-400">
                  (အသုံးပြုနေသော Active: {(usageConfig.accessKeys || []).filter((k) => k.status === 'active').length})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <input
                    type="text"
                    placeholder="Key Code သို့မဟုတ် အမည် ရှာရန်..."
                    value={keySearch}
                    onChange={(e) => setKeySearch(e.target.value)}
                    className="w-full bg-[#07090e] border border-[#212734] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>

                {/* Batch Delete Actions */}
                {(usageConfig.accessKeys?.length || 0) > 0 && (
                  <>
                    {selectedVipKeyIds.length > 0 && (
                      <button
                        type="button"
                        disabled={isBatchDeleting}
                        onClick={handleDeleteSelectedVipKeys}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-md transition flex items-center space-x-1 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ရွေးထားသော ({selectedVipKeyIds.length}) ခု ဖျက်မည်</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBatchDeleting}
                      onClick={handleDeleteExpiredVipKeys}
                      className="px-2.5 py-1.5 bg-[#12161f] hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 border border-[#212734] hover:border-rose-500/40 text-[11px] font-medium rounded-md transition flex items-center space-x-1"
                      title="သက်တမ်းကုန် သို့မဟုတ် အသုံးပြုခွင့်ပြည့်သွားသော VIP Key များကို သီးသန့် ရှင်းလင်းမည်"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>သက်တမ်းကုန် Keys ရှင်းမည်</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBatchDeleting}
                      onClick={handleDeleteAllVipKeys}
                      className="px-2 py-1.5 text-slate-400 hover:text-rose-400 text-[11px] transition flex items-center space-x-1"
                      title="VIP Key အားလုံးကို အပြီးရှင်းလင်းမည်"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>အားလုံး ဖျက်မည်</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Keys Table */}
            {filteredKeys.length === 0 ? (
              <div className="p-8 text-center bg-[#0e1219] rounded-lg border border-[#212734] text-xs text-slate-400">
                {keySearch ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော Access Key မတွေ့ပါ' : 'ထုတ်ပေးထားသော VIP Access Key မရှိသေးပါ'}
              </div>
            ) : (
              <div className="bg-[#0e1219] rounded-lg border border-[#212734] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#07090e] border-b border-[#212734] text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 pl-3 w-8">
                          <input
                            type="checkbox"
                            checked={
                              filteredKeys.length > 0 &&
                              selectedVipKeyIds.length === filteredKeys.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVipKeyIds(filteredKeys.map((k) => k.id));
                              } else {
                                setSelectedVipKeyIds([]);
                              }
                            }}
                            className="rounded border-[#212734] bg-[#12161f] text-indigo-600 focus:ring-0 cursor-pointer"
                            title="အားလုံး ရွေးမည်"
                          />
                        </th>
                        <th className="p-3 pl-2">Access Key Code</th>
                        <th className="p-3">User / Label</th>
                        <th className="p-3">ခွင့်ပြုချက် / သုံးပြီး</th>
                        <th className="p-3">သက်တမ်း</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right pr-4">စီမံရန်</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#212734]">
                      {filteredKeys.map((k) => {
                        const percent = k.maxLines > 0 ? Math.min(100, Math.round((k.usedLines / k.maxLines) * 100)) : 0;
                        const isExpired = k.expiresAt && new Date(k.expiresAt) < new Date();
                        const isSelected = selectedVipKeyIds.includes(k.id);
                        return (
                          <tr
                            key={k.id}
                            className={`transition ${
                              isSelected ? 'bg-indigo-950/20' : 'hover:bg-[#12161f]/50'
                            }`}
                          >
                            <td className="p-3 pl-3 w-8">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVipKeyIds((prev) => [...prev, k.id]);
                                  } else {
                                    setSelectedVipKeyIds((prev) => prev.filter((id) => id !== k.id));
                                  }
                                }}
                                className="rounded border-[#212734] bg-[#12161f] text-indigo-600 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            {/* Code + Copy */}
                            <td className="p-3 pl-2 font-mono font-bold text-slate-200">
                              <div className="flex items-center space-x-2">
                                <span className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 text-indigo-300">
                                  {k.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyKey(k.code, k.id)}
                                  title="Key Code ကူးမည်"
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                                >
                                  {copiedKeyId === k.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Label & Note */}
                            <td className="p-3">
                              <div className="font-semibold text-slate-200">{k.label}</div>
                              {k.note && <div className="text-[10px] text-slate-400">{k.note}</div>}
                            </td>

                            {/* Quota Progress */}
                            <td className="p-3">
                              <div className="space-y-1 min-w-[130px]">
                                <div className="flex justify-between text-[11px]">
                                  <span className="font-mono text-slate-300">
                                    {k.usedLines.toLocaleString()} / {k.maxLines > 0 ? k.maxLines.toLocaleString() : '∞'}
                                  </span>
                                  {k.maxLines > 0 && (
                                    <span className="text-[10px] text-slate-400">{percent}%</span>
                                  )}
                                </div>
                                {k.maxLines > 0 && (
                                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        percent >= 90
                                          ? 'bg-rose-500'
                                          : percent >= 60
                                          ? 'bg-amber-500'
                                          : 'bg-indigo-500'
                                      }`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Expiry */}
                            <td className="p-3 text-[11px] text-slate-300">
                              {k.expiresAt ? (
                                <span className={isExpired ? 'text-rose-400 font-semibold' : ''}>
                                  {new Date(k.expiresAt).toLocaleDateString('my-MM')}
                                  {isExpired && ' (ကုန်ဆုံး)'}
                                </span>
                              ) : (
                                <span className="text-slate-500">အကန့်အသတ်မရှိ</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => handleToggleKeyStatus(k.id)}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                                  k.status === 'active' && !isExpired
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                }`}
                              >
                                {k.status === 'active' && !isExpired ? 'Active' : 'Revoked'}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-right pr-4">
                              <div className="flex items-center justify-end space-x-1.5">
                                {/* Share text button */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyShareMessage(k)}
                                  title="Telegram / Chat ပို့ရန် စာသား ကူးယူမည်"
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-[10px] font-medium transition flex items-center space-x-1"
                                >
                                  {copiedMsgKeyId === k.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">ကူးပြီး</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3 h-3" />
                                      <span>Share စာသား</span>
                                    </>
                                  )}
                                </button>

                                {/* Reset Usage */}
                                <button
                                  type="button"
                                  onClick={() => handleResetKeyUsage(k.id)}
                                  title="သုံးထားသော စာကြောင်းရေ ပြန်လည်စတင်မည် (0)"
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKey(k.id, k.code)}
                                  title="Key ဖျက်မည်"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Gemini Multi-Key Pool (Smart Rotation & Auto-Failover) */}
      {activeTab === 'keypool' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Gemini API Key Pool (Multi-Key Rotation & Auto-Failover)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Admin ကနေ Google AI Studio မှ အခမဲ့ရရှိသော Gemini API Key များကို စာရင်းလိုက် ထည့်သွင်းပေးထားနိုင်ပါသည်။ စနစ်က အလှည့်ကျ ခွဲဝေသယ်ယူပေးပြီး Rate Limit ဖြစ်ပါက Auto-Failover လုပ်ပေးပါမည်။
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleTestAllKeys}
                disabled={isTestingAllKeys || keyPoolKeys.length === 0}
                className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${isTestingAllKeys ? 'animate-spin' : ''}`} />
                <span>{isTestingAllKeys ? 'Key အားလုံး စစ်ဆေးနေသည်...' : 'Key အားလုံး စစ်ဆေးမည်'}</span>
              </button>

              <button
                type="button"
                onClick={() => fetchGeminiKeys()}
                disabled={isLoadingKeyPool}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKeyPool ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Test Summary Notice */}
          {testSummary && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <CheckCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{testSummary}</span>
              </span>
              <button onClick={() => setTestSummary(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Key Pool Stat Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>စုစုပေါင်း Keys</span>
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-xl font-black text-slate-100 mt-1">{keyPoolStats.totalKeys}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pool ထဲရှိ Key စုစုပေါင်း</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] font-medium text-emerald-400 flex items-center justify-between">
                <span>Active Keys</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-300 mt-1">{keyPoolStats.activeCount}</div>
              <div className="text-[10px] text-emerald-500/80 mt-0.5">အသင့် အသုံးပြုနိုင်သော Keys</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] font-medium text-amber-400 flex items-center justify-between">
                <span>Cooldown ဖြစ်နေ</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-300 mt-1">{keyPoolStats.cooldownCount}</div>
              <div className="text-[10px] text-amber-500/80 mt-0.5">Rate Limit ကြောင့် ခေတ္တနားနေ</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] font-medium text-rose-400 flex items-center justify-between">
                <span>Error / Disabled</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-black text-rose-300 mt-1">{keyPoolStats.errorCount}</div>
              <div className="text-[10px] text-rose-500/80 mt-0.5">မမှန်ကန်သော / ပိတ်ထားသော Keys</div>
            </div>
          </div>

          {/* Strategy Selection & Load Balancing Options */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">Load Balancing Strategy (ခွဲဝေမှုပုံစံ)</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Key အားလုံးကို အလှည့်ကျ မျှတစွာ အသုံးပြုစေရန် ဆက်တင်
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleUpdateStrategy('round_robin')}
                className={`p-3 rounded-xl border text-left transition ${
                  keyPoolStats.strategy === 'round_robin'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-200'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Smart Round-Robin</span>
                  {keyPoolStats.strategy === 'round_robin' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Key တစ်ခုပြီးတစ်ခု အစဉ်လိုက် အလှည့်ကျ သုံးသွားမည် (Free Tier 15 RPM ခွဲဝေရန် အကောင်းဆုံး)
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStrategy('least_used')}
                className={`p-3 rounded-xl border text-left transition ${
                  keyPoolStats.strategy === 'least_used'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-200'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Least-Used First</span>
                  {keyPoolStats.strategy === 'least_used' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  အသုံးပြုမှု အနည်းဆုံး Key ကို ဦးစားပေးသုံးပြီး Quota အညီအမျှ မျှဝေသုံးစွဲစေမည်
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStrategy('random')}
                className={`p-3 rounded-xl border text-left transition ${
                  keyPoolStats.strategy === 'random'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-200'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Random Distribution</span>
                  {keyPoolStats.strategy === 'random' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  အသင့်ရှိသော Key များထဲမှ ကျပန်း ရွေးချယ် အသုံးပြုစေမည်
                </p>
              </button>
            </div>
          </div>

          {/* Add Bulk or Single API Keys */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Gemini API Key များ အသစ်ထည့်သွင်းရန် (Bulk / Single Add)</span>
              </h3>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center space-x-1"
              >
                <span>Google AI Studio Key ရယူရန်</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handleAddBulkKeys} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                  Gemini API Key(s) ထည့်ရန် (စာကြောင်းတစ်ကြောင်းလျှင် Key တစ်ခု သို့မဟုတ် ကော်မာ ခြား၍ အများအပြား တစ်ခါတည်း ထည့်နိုင်ပါသည်)
                </label>
                <textarea
                  rows={4}
                  value={bulkKeysInput}
                  onChange={(e) => setBulkKeysInput(e.target.value)}
                  placeholder={`AIzaSyBxxx... (Key #1)
AIzaSyCxxx... (Key #2)
AIzaSyDxxx... (Key #3)`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="w-full sm:flex-1">
                  <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                    Key အမည် နာမည်တပ်ရန် (Label Prefix)
                  </label>
                  <input
                    type="text"
                    value={keyLabelPrefix}
                    onChange={(e) => setKeyLabelPrefix(e.target.value)}
                    placeholder="ဥပမာ - Gemini Free Key / Studio Acc 1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingKeys}
                  className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 shrink-0 shadow-md shadow-purple-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingKeys ? 'ထည့်သွင်းနေသည်...' : 'Key Pool သို့ ထည့်သွင်းမည်'}</span>
                </button>
              </div>

              {addKeyMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                    addKeyMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <span>{addKeyMessage.text}</span>
                  <button onClick={() => setAddKeyMessage(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Key Pool List Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-slate-200">
                  Key Pool စာရင်း ({keyPoolKeys.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  (Rate Limit တက်ပါက Key တစ်ခုချင်းစီ ၁ မိနစ် Auto Cooldown သွားပါမည်)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Batch Delete Actions */}
                {keyPoolKeys.length > 0 && (
                  <>
                    {selectedGeminiKeyIds.length > 0 && (
                      <button
                        type="button"
                        disabled={isBatchDeleting}
                        onClick={handleDeleteSelectedGeminiKeys}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-md transition flex items-center space-x-1 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ရွေးထားသော ({selectedGeminiKeyIds.length}) ခု ဖျက်မည်</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBatchDeleting}
                      onClick={handleDeleteErrorGeminiKeys}
                      className="px-2.5 py-1 bg-[#12161f] hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 border border-[#212734] hover:border-rose-500/40 text-[11px] font-medium rounded-md transition flex items-center space-x-1"
                      title="Invalid သို့မဟုတ် Error တက်နေသော Key များကို သီးသန့် ရှင်းလင်းမည်"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Dead Key များ ရှင်းမည်</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBatchDeleting}
                      onClick={handleDeleteAllGeminiKeys}
                      className="px-2 py-1 text-slate-400 hover:text-rose-400 text-[11px] transition flex items-center space-x-1"
                      title="Key Pool တစ်ခုလုံးရှိ Key အားလုံးကို အပြီးရှင်းလင်းမည်"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>အားလုံး ဖျက်မည်</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetKeyStats()}
                      className="text-slate-400 hover:text-amber-400 text-xs flex items-center space-x-1 pl-2 border-l border-[#212734]"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Stats ပြန်စမည်</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {keyPoolKeys.length === 0 ? (
              <div className="p-8 text-center bg-[#0e1219] rounded-lg border border-[#212734] text-xs text-slate-400">
                Key Pool ထဲတွင် API Key မရှိသေးပါ။ အထက်ပါ form မှ Gemini API Key များ ထည့်သွင်းပေးပါ။
              </div>
            ) : (
              <div className="bg-[#0e1219] rounded-lg border border-[#212734] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#07090e] border-b border-[#212734] text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 pl-3 w-8">
                          <input
                            type="checkbox"
                            checked={
                              keyPoolKeys.length > 0 &&
                              selectedGeminiKeyIds.length === keyPoolKeys.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGeminiKeyIds(keyPoolKeys.map((k) => k.id));
                              } else {
                                setSelectedGeminiKeyIds([]);
                              }
                            }}
                            className="rounded border-[#212734] bg-[#12161f] text-purple-600 focus:ring-0 cursor-pointer"
                            title="အားလုံး ရွေးမည်"
                          />
                        </th>
                        <th className="p-3 pl-2">Key Label & Masked Key</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Calls & Stats</th>
                        <th className="p-3">Last Used</th>
                        <th className="p-3 text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#212734]">
                      {keyPoolKeys.map((item) => {
                        const isTesting = testingKeyId === item.id;
                        const isSelected = selectedGeminiKeyIds.includes(item.id);
                        return (
                          <tr
                            key={item.id}
                            className={`transition ${
                              isSelected ? 'bg-purple-950/20' : 'hover:bg-[#12161f]/50'
                            }`}
                          >
                            <td className="p-3 pl-3 w-8">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGeminiKeyIds((prev) => [...prev, item.id]);
                                  } else {
                                    setSelectedGeminiKeyIds((prev) =>
                                      prev.filter((id) => id !== item.id)
                                    );
                                  }
                                }}
                                className="rounded border-[#212734] bg-[#12161f] text-purple-600 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 pl-2">
                              <div className="font-semibold text-slate-200">{item.label}</div>
                              <div className="font-mono text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                                <span>{item.maskedKey}</span>
                              </div>
                            </td>

                            <td className="p-3">
                              {item.status === 'active' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Active</span>
                                </span>
                              )}

                              {item.status === 'cooldown' && (
                                <div className="inline-flex flex-col">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    <Clock className="w-3 h-3 animate-spin" />
                                    <span>Cooldown ({item.cooldownRemainingSeconds || 60}s)</span>
                                  </span>
                                  {item.lastErrorMsg && (
                                    <span className="text-[9px] text-amber-400/80 mt-0.5 truncate max-w-[140px]" title={item.lastErrorMsg}>
                                      {item.lastErrorMsg}
                                    </span>
                                  )}
                                </div>
                              )}

                              {item.status === 'error' && (
                                <div className="inline-flex flex-col">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Error</span>
                                  </span>
                                  {item.lastErrorMsg && (
                                    <span className="text-[9px] text-rose-400/80 mt-0.5 truncate max-w-[140px]" title={item.lastErrorMsg}>
                                      {item.lastErrorMsg}
                                    </span>
                                  )}
                                </div>
                              )}

                              {item.status === 'disabled' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  <span>Disabled</span>
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="flex items-center space-x-3 text-[11px]">
                                <span className="text-emerald-400 font-semibold" title="Success Count">
                                  ✓ {item.successCount || 0}
                                </span>
                                <span className="text-rose-400 font-semibold" title="Error Count">
                                  ✕ {item.errorCount || 0}
                                </span>
                              </div>
                            </td>

                            <td className="p-3 text-slate-400 text-[11px]">
                              {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleTimeString() : 'မသုံးရသေး'}
                            </td>

                            <td className="p-3 text-right pr-4">
                              <div className="flex items-center justify-end space-x-1.5">
                                {/* Test button */}
                                <button
                                  type="button"
                                  onClick={() => handleTestSingleKey(item.id)}
                                  disabled={isTesting}
                                  title="Key တိုက်ရိုက် စစ်ဆေးမည်"
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg text-[10px] font-medium transition flex items-center space-x-1"
                                >
                                  <Activity className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                                  <span>{isTesting ? 'စစ်နေသည်...' : 'စစ်မည်'}</span>
                                </button>

                                {/* Toggle Disable / Enable */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleKeyPoolStatus(item.id)}
                                  title={item.status === 'active' ? 'ခေတ္တ ပိတ်ထားမည်' : 'ပြန်လည် ဖွင့်မည်'}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                                    item.status === 'active'
                                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                  }`}
                                >
                                  {item.status === 'active' ? 'ပိတ်မည်' : 'ဖွင့်မည်'}
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKeyPoolItem(item.id, item.label)}
                                  title="Key Pool မှ ဖျက်မည်"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Telegram Channel Integration Settings */}
      {activeTab === 'telegram' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Send className="w-4 h-4 text-sky-400" />
                <span>Telegram Bot & Channel စာတန်းထိုးဖိုင် အလိုအလျောက် ပို့ရန် ဆက်တင်</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                အသုံးပြုသူများ ဘာသာပြန်ပြီး စာတန်းထိုးဖိုင်ကို ဒေါင်းလုဒ်ဆွဲသည့် အချိန်တွင် မိမိ၏ Telegram Channel / Group သို့ Bot ဖြင့် အလိုအလျောက် ပို့ပေးပါမည်
              </p>
            </div>
            {telegramSaveSuccess && (
              <span className="flex items-center space-x-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                <span>သိမ်းဆည်းပြီးပါပြီ</span>
              </span>
            )}
          </div>

          {/* Quick Guide Card */}
          <div className="bg-sky-950/30 border border-sky-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-2.5">
            <h4 className="font-bold text-sky-300 flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>Telegram Bot နှင့် Channel ချိတ်ဆက်နည်း လမ်းညွှန်:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed pl-1">
              <li>
                Telegram App တွင် <span className="text-sky-300 font-mono">@BotFather</span> သို့ သွားပြီး <code>/newbot</code> ရိုက်ကာ Bot အသစ်ပြုလုပ်ပြီး <b>Bot Token</b> ကို ကူးယူပါ
              </li>
              <li>
                မိမိ စာတန်းထိုးဖိုင် တင်လိုသော <b>Telegram Channel</b> ထဲသို့ မိမိပြုလုပ်ထားသော Bot ကို <b>Administrator</b> အဖြစ် ထည့်သွင်းပေးပါ (<b>Post Messages</b> ခွင့်ပြုချက် ပေးပါ)
              </li>
              <li>
                အောက်ပါ အကွက်များတွင် <b>Bot Token</b> နှင့် <b>Channel Username (ဥပမာ: @my_channel_name)</b> သို့မဟုတ် Channel ID ကို ထည့်ပါ
              </li>
              <li>
                <b>"စမ်းသပ်မက်ဆေ့ခ်ျ ပို့ကြည့်မည်"</b> ခလုတ်ကို နှိပ်၍ ချိတ်ဆက်မှု အောင်မြင်ကြောင်း စစ်ဆေးပါ
              </li>
            </ol>
          </div>

          <div className="space-y-4">
            {/* Auto Send Toggle */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-200 block">
                  ဖိုင် ဒေါင်းလုဒ်ဆွဲသည့် အချိန်တွင် Telegram Channel သို့ အလိုအလျောက် ပို့မည် (Auto-Sync)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ဖွင့်ထားပါက အသုံးပြုသူများ Subtitle Export လုပ်တိုင်း Telegram Channel ဆီသို့ ဖိုင်ကို ရောက်ရှိစေမည်ဖြစ်သည်
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramForm.sendOnDownload}
                  onChange={(e) =>
                    setTelegramForm({ ...telegramForm, sendOnDownload: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {/* Telegram Bot Token - System Locked */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Telegram Bot API Token (စနစ်အတွင်း ထည့်သွင်းသတ်မှတ်ထားပြီး):</span>
                </label>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Active & Locked 🔒
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type={showBotToken ? 'text' : 'password'}
                  value={PERMANENT_TELEGRAM_BOT_TOKEN}
                  readOnly
                  disabled
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 font-mono cursor-not-allowed select-all"
                />
                <button
                  type="button"
                  onClick={() => setShowBotToken(!showBotToken)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center space-x-1 transition shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showBotToken ? 'ဝှက်မည်' : 'ပြမည်'}</span>
                </button>
              </div>
            </div>

            {/* Channel ID / Username - System Locked */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Telegram Channel ID (အမြဲတမ်း ပို့ဆောင်မည့် ချန်နယ်):</span>
                </label>
                <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                  Target: {PERMANENT_TELEGRAM_CHANNEL_ID} 🔒
                </span>
              </div>
              <input
                type="text"
                value={PERMANENT_TELEGRAM_CHANNEL_ID}
                readOnly
                disabled
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-sky-300 font-mono font-bold cursor-not-allowed select-all"
              />
              <p className="text-[11px] text-slate-400">
                စာတန်းထိုးဖိုင်များကို အထက်ပါ Target Channel ID (<code>-1003174988160</code>) သို့ အလိုအလျောက် ပို့ပေးပါမည်။
              </p>
            </div>

            {/* Caption Template */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                Telegram တွင် ဖိုင်နှင့်အတူ တွဲပို့ပေးမည့် Message Caption ပုံစံ:
              </label>
              <textarea
                rows={4}
                value={telegramForm.captionTemplate}
                onChange={(e) =>
                  setTelegramForm({ ...telegramForm, captionTemplate: e.target.value })
                }
                placeholder="Telegram Caption Template..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500 transition leading-relaxed"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400">အသုံးပြုနိုင်သော Tags:</span>
                {['{fileName}', '{subtitleCount}', '{format}', '{contentMode}', '{savedAt}'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTelegramForm({
                        ...telegramForm,
                        captionTemplate: (telegramForm.captionTemplate || '') + ' ' + tag,
                      })
                    }
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-300 px-2 py-0.5 rounded-lg border border-slate-700 font-mono"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Telegram Feedback */}
          {telegramTestResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 border animate-fadeIn ${
                telegramTestResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              {telegramTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{telegramTestResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTelegram || !telegramForm.botToken || !telegramForm.channelId}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-300 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
            >
              <Send className={`w-3.5 h-3.5 ${isTestingTelegram ? 'animate-bounce' : ''}`} />
              <span>{isTestingTelegram ? 'စမ်းသပ်မက်ဆေ့ခ်ျ ပို့နေသည်...' : 'စမ်းသပ်မက်ဆေ့ခ်ျ ပို့ကြည့်မည် (Test)'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveTelegramConfig}
              disabled={isSavingTelegram}
              className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-600/20 transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingTelegram ? 'သိမ်းဆည်းနေပါသည်...' : 'Telegram ဆက်တင် သိမ်းဆည်းမည်'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Saved Files Manager */}
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

      {/* Tab 4: Change Password */}
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

