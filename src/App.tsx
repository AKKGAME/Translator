import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SubtitleItem,
  SubtitleFileMeta,
  TranslationSettings,
  VideoConfig,
  UsageConfig,
  StoryContextAnalysis,
} from './types';
import { parseSubtitles, msToTimeSRT } from './utils/subtitleParser';
import { DEFAULT_GLOSSARY_TERMS } from './utils/burmeseUtils';
import { StudioHeader, DisplayMode } from './components/StudioHeader';
import { StudioWorkspace } from './components/StudioWorkspace';
import { StudioTimeline } from './components/StudioTimeline';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { TranslationSettingsModal } from './components/TranslationSettingsModal';
import { TimeOffsetModal } from './components/TimeOffsetModal';
import { ExportModal } from './components/ExportModal';
import { DonationModal } from './components/DonationModal';
import { AdminPanel } from './components/AdminPanel';
import { UserProfileModal } from './components/UserProfileModal';
import { SubtitleSearchModal } from './components/SubtitleSearchModal';
import { notify, showAlert } from './components/AlertToastProvider';
import {
  auth,
  googleProvider,
  signInWithPopup,
  onAuthStateChanged,
  syncUserProfile,
  AppUserProfile,
  deductUserCredits,
  db,
  checkUserPlanStatus,
} from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { translateDirectlyViaGemini, analyzeStoryContextDirectlyViaGemini } from './utils/geminiDirect';
import {
  getLocalUsageConfig,
  getSavedAccessCode,
} from './utils/accessKeyUtils';

export default function App() {
  // Starts clean and empty ready for real user workflow
  const [items, setItems] = useState<SubtitleItem[]>([]);
  const [meta, setMeta] = useState<SubtitleFileMeta | null>(null);

  // Undo / Redo History
  const [history, setHistory] = useState<SubtitleItem[][]>(() => [[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushHistory = useCallback((newItems: SubtitleItem[]) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push([...newItems]);
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setItems([...target]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setItems([...target]);
    }
  }, [historyIndex, history]);

  // Active view: 'studio' | 'admin'
  const [activeTab, setActiveTab] = useState<'studio' | 'admin'>('studio');

  // Display Mode: 'main' (red pill) is default
  const [displayMode, setDisplayMode] = useState<DisplayMode>('main');
  const [targetLanguage, setTargetLanguage] = useState<string>('Myanmar (Burmese)');

  // Playback state
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Custom uploaded video support
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [customVideoFileName, setCustomVideoFileName] = useState<string | null>(null);

  // Modals
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isOnlineSubtitlesOpen, setIsOnlineSubtitlesOpen] = useState(false);

  // Firebase User & Profile
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);

  useEffect(() => {
    let unsubscribeSnap: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (currUser) => {
      setFirebaseUser(currUser);
      if (currUser) {
        try {
          const profile = await syncUserProfile(currUser);
          setUserProfile(profile);

          const userRef = doc(db, 'users', currUser.uid);
          unsubscribeSnap = onSnapshot(
            userRef,
            (snapshot) => {
              if (snapshot.exists()) {
                setUserProfile(snapshot.data() as AppUserProfile);
              }
            },
            (snapErr) => {
              console.warn('User snapshot subscription error:', snapErr);
            }
          );
        } catch (err) {
          console.warn('Firebase user sync failed, fallback active:', err);
        }
      } else {
        setUserProfile(null);
        if (unsubscribeSnap) {
          unsubscribeSnap();
          unsubscribeSnap = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnap) unsubscribeSnap();
    };
  }, []);

  const isSigningInRef = useRef(false);

  const handleGoogleSignIn = async () => {
    if (isSigningInRef.current) return;
    isSigningInRef.current = true;
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        setFirebaseUser(res.user);
        const profile = await syncUserProfile(res.user);
        setUserProfile(profile);
        notify.success(`${res.user.displayName || res.user.email} ဖြင့် အောင်မြင်စွာ Login ဝင်ရောက်ပြီးပါပြီ!`, 'Sign In အောင်မြင်ပါသည်');
      }
    } catch (err: any) {
      const code = err?.code || '';
      // Ignore normal user-cancelled popups or duplicate request cancellation
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      if (code === 'auth/popup-blocked') {
        notify.warning('Browser မှ Popup Window ကို ပိတ်ထားပါသည်။ Browser Setting သို့မဟုတ် URL bar ဘေးမှ Popups ကို Allow ပေးပါ (သို့မဟုတ် New Tab တွင် ဖွင့်ပါ)', 'Popup Blocked');
        return;
      }
      if (code === 'auth/unauthorized-domain') {
        notify.error(`ဤ App Domain (${window.location.hostname}) သည် Firebase Auth Authorized Domains တွင် မပါရှိသေးပါ`, 'Domain Authorization Error');
        return;
      }
      console.warn('Google sign in error:', err);
      notify.error(err.message || 'Login မအောင်မြင်ပါ', 'Google Sign In အမှား');
    } finally {
      isSigningInRef.current = false;
    }
  };

  // Sync custom keys from Firestore userProfile into translationSettings
  useEffect(() => {
    if (userProfile?.customGeminiKeys && userProfile.customGeminiKeys.length > 0) {
      setTranslationSettings((prev) => ({
        ...prev,
        customApiKeys: userProfile.customGeminiKeys,
        customApiKey: prev.customApiKey || userProfile.customGeminiKeys![0].key,
      }));
    } else if (userProfile?.savedApiKey) {
      setTranslationSettings((prev) => ({
        ...prev,
        customApiKey: prev.customApiKey || userProfile.savedApiKey,
      }));
    }
  }, [userProfile]);

  // Admin access validation
  const isUserAdmin = Boolean(
    firebaseUser && (
      userProfile?.role === 'admin' ||
      firebaseUser?.email === 'aungkyawkhant.apple@gmail.com'
    )
  );

  // Prevent unauthorized access to Admin Panel
  const handleToggleAdmin = useCallback(() => {
    if (activeTab === 'admin') {
      setActiveTab('studio');
      return;
    }

    if (!isUserAdmin) {
      showAlert({
        title: 'Admin သီးသန့် ကဏ္ဍဖြစ်ပါသည်',
        message: 'Admin အကောင့်ဖြင့် Login ဝင်ထားမှသာ Admin Panel သို့ ဝင်ရောက်ခွင့်ရှိပါသည်',
        type: 'warning',
      });
      if (!firebaseUser) {
        setIsUserProfileOpen(true);
      }
      return;
    }

    setActiveTab('admin');
  }, [activeTab, isUserAdmin, firebaseUser]);

  // If user logs out or role changes while in admin view, auto-redirect to studio
  useEffect(() => {
    if (activeTab === 'admin' && !isUserAdmin) {
      setActiveTab('studio');
    }
  }, [activeTab, isUserAdmin]);

  // Translation State & Progress
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{ current: number; total: number } | undefined>(
    undefined
  );
  const [isAnalyzingContext, setIsAnalyzingContext] = useState(false);
  const [contextAnalysisStep, setContextAnalysisStep] = useState<'idle' | 'reading' | 'done'>('idle');
  const isCancelledRef = useRef(false);

  // Hidden file input refs
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Usage Config
  const [usageConfig, setUsageConfig] = useState<UsageConfig>(() => getLocalUsageConfig());

  // Video subtitle configuration
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    isCustomVideo: false,
    subtitleMode: 'dual',
    fontSize: 22,
    textPosition: 'bottom',
    bgColor: 'rgba(0, 0, 0, 0.85)',
    textColor: '#FFFFFF',
    highlightColor: '#FACC15',
  });

  // Settings
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>(() => {
    const savedKey = typeof window !== 'undefined' ? (localStorage.getItem('user_gemini_api_key') || '') : '';
    const savedAccessCode = getSavedAccessCode();
    let savedDonation = undefined;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('user_donation_config');
        if (raw) savedDonation = JSON.parse(raw);
      } catch (e) {
        // ignore
      }
    }

    return {
      style: 'conversational',
      tone: 'neutral',
      glossary: DEFAULT_GLOSSARY_TERMS,
      batchSize: 25,
      preserveTags: true,
      useBurmeseDigits: false,
      speakerNameHandling: 'omit',
      properNounsMode: 'myanmar_phonetic',
      soundEffectsHandling: 'translate',
      honorificStyle: 'polite',
      conciseness: 'concise',
      customPromptNote: '',
      customApiKey: savedKey,
      accessCode: savedAccessCode,
      enableContextPreAnalysis: true,
      storyContext: null,
      donationConfig: savedDonation || {
        kpayPhone: '09770033353',
        kpayName: 'Aung Kyaw Khant',
        wavePhone: '09668888555',
        waveName: 'Aung Kyaw Khant',
        note: 'Server ဖိုး ကူညီထောက်ပံ့ပေးသော စိတ်ကောင်းစေတနာရှင်များအားလုံးကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်။',
      },
    };
  });

  // Active Subtitle Item: find by current playback timestamp (null if no subtitle at currentTimeMs)
  const activeItem: SubtitleItem | null =
    items.find((it) => currentTimeMs >= it.startMs && currentTimeMs <= it.endMs) || null;

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      setCurrentTimeMs((prev) => {
        const maxMs = (durationSec || 1437) * 1000;
        const nextMs = prev + delta;
        if (nextMs >= maxMs) {
          setIsPlaying(false);
          return 0;
        }
        return nextMs;
      });
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, durationSec]);

  // Discreet Admin Panel Shortcut (Ctrl+Shift+A or Cmd+Shift+A) and URL trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'admin' ? 'studio' : 'admin'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (window.location.hash === '#admin' || window.location.search.includes('admin=true')) {
      setActiveTab('admin');
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subtitle Item Operations
  const handleUpdateItem = useCallback((id: number, updatedFields: Partial<SubtitleItem>) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, ...updatedFields } : item
      );
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  const handleAddItem = useCallback((afterItemId?: number, startMsOverride?: number) => {
    setItems((prev) => {
      let newStart = 0;
      let insertIndex = prev.length;

      if (startMsOverride !== undefined) {
        newStart = Math.max(0, startMsOverride);
        const foundIdx = prev.findIndex((i) => i.startMs > newStart);
        if (foundIdx !== -1) insertIndex = foundIdx;
      } else if (afterItemId !== undefined) {
        const targetIdx = prev.findIndex((i) => i.id === afterItemId);
        if (targetIdx !== -1) {
          insertIndex = targetIdx + 1;
          newStart = prev[targetIdx].endMs + 100;
        }
      } else if (prev.length > 0) {
        newStart = prev[prev.length - 1].endMs + 100;
      }

      const newEnd = newStart + 2500;
      const newItem: SubtitleItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        index: insertIndex + 1,
        startTime: msToTimeSRT(newStart),
        endTime: msToTimeSRT(newEnd),
        startMs: newStart,
        endMs: newEnd,
        originalText: 'New Subtitle line',
        translatedText: '',
        status: 'pending',
      };

      const updated = [...prev];
      updated.splice(insertIndex, 0, newItem);
      const reindexed = updated.map((item, idx) => ({ ...item, index: idx + 1 }));
      pushHistory(reindexed);
      return reindexed;
    });
  }, [pushHistory]);

  const handleDeleteItem = useCallback((id: number) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== id);
      const reindexed = filtered.map((item, idx) => ({ ...item, index: idx + 1 }));
      pushHistory(reindexed);
      return reindexed;
    });
  }, [pushHistory]);

  const handleMergeItem = useCallback((id: number) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;

      const curr = prev[idx];
      const next = prev[idx + 1];

      const mergedStartMs = curr.startMs;
      const mergedEndMs = Math.max(curr.endMs, next.endMs);
      const mergedOrig = (curr.originalText + ' ' + next.originalText).trim();
      const mergedTrans = [curr.translatedText, next.translatedText]
        .filter(Boolean)
        .join(' ')
        .trim();

      const mergedItem: SubtitleItem = {
        ...curr,
        startMs: mergedStartMs,
        endMs: mergedEndMs,
        startTime: msToTimeSRT(mergedStartMs),
        endTime: msToTimeSRT(mergedEndMs),
        originalText: mergedOrig,
        translatedText: mergedTrans,
        status: mergedTrans ? 'completed' : 'pending',
      };

      const updated = [...prev];
      updated.splice(idx, 2, mergedItem);
      const reindexed = updated.map((item, i) => ({ ...item, index: i + 1 }));
      pushHistory(reindexed);
      return reindexed;
    });
  }, [pushHistory]);

  // Split Subtitle at Playhead
  const handleSplitItem = useCallback((id: number) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const item = prev[idx];

      let splitMs = currentTimeMs;
      if (splitMs <= item.startMs + 300 || splitMs >= item.endMs - 300) {
        splitMs = Math.round(item.startMs + (item.endMs - item.startMs) / 2);
      }

      const origWords = item.originalText.trim().split(/\s+/);
      const midOrig = Math.max(1, Math.ceil(origWords.length / 2));
      const firstOrig = origWords.slice(0, midOrig).join(' ');
      const secondOrig = origWords.slice(midOrig).join(' ') || firstOrig;

      let firstTrans = '';
      let secondTrans = '';
      if (item.translatedText) {
        const transWords = item.translatedText.trim().split(/\s+/);
        const midTrans = Math.max(1, Math.ceil(transWords.length / 2));
        firstTrans = transWords.slice(0, midTrans).join(' ');
        secondTrans = transWords.slice(midTrans).join(' ') || firstTrans;
      }

      const firstItem: SubtitleItem = {
        ...item,
        endMs: splitMs,
        endTime: msToTimeSRT(splitMs),
        originalText: firstOrig,
        translatedText: firstTrans,
      };

      const secondItem: SubtitleItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        index: item.index + 1,
        startMs: splitMs + 10,
        endMs: item.endMs,
        startTime: msToTimeSRT(splitMs + 10),
        endTime: msToTimeSRT(item.endMs),
        originalText: secondOrig,
        translatedText: secondTrans,
        status: secondTrans ? 'completed' : 'pending',
      };

      const updated = [...prev];
      updated.splice(idx, 1, firstItem, secondItem);
      const reindexed = updated.map((it, i) => ({ ...it, index: i + 1 }));
      pushHistory(reindexed);
      return reindexed;
    });
  }, [currentTimeMs, pushHistory]);

  // Single Line AI Translation
  const handleTranslateSingleItem = useCallback(async (item: SubtitleItem) => {
    // Credit & Auth Check with Active Plan requirement for custom keys (BYOK)
    const isUsingCustomKey =
      !!translationSettings.customApiKey?.trim() ||
      !!(translationSettings.customApiKeys && translationSettings.customApiKeys.length > 0);
    const planStatus = userProfile
      ? checkUserPlanStatus(userProfile)
      : { hasActivePlan: false, daysRemaining: 0, planName: 'None' };
    const isAdmin = userProfile?.role === 'admin';

    // Restrict custom keys to users with active plan and remaining days (or Admin)
    if (isUsingCustomKey && !isAdmin && !planStatus.hasActivePlan) {
      setIsUserProfileOpen(true);
      showAlert({
        title: 'Plan ဝယ်ယူရန် လိုအပ်ပါသည်',
        message: 'Plan ဝယ်ယူထားပြီး သက်တမ်းရက် ကျန်ရှိမှသာ မိမိ၏ Free Gemini API Key (BYOK) ထည့်သွင်းသုံးစွဲနိုင်ပါသည်!\n\nကျေးဇူးပြု၍ Plan ဝယ်ယူပါ သို့မဟုတ် စနစ်မှ ပေးထားသော Free Credits (300 lines) ဖြင့် အသုံးပြုပါ',
        type: 'warning',
      });
      return;
    }

    if (!isUsingCustomKey) {
      if (!firebaseUser) {
        setIsUserProfileOpen(true);
        showAlert({
          title: 'Sign In ပြုလုပ်ပေးပါ',
          message: 'ဘာသာပြန်ရန်အတွက် Google Account ဖြင့် Sign In ဝင်ရောက်ပေးပါ (300 Free Credits ရရှိပါမည်) သို့မဟုတ် Plan ဝယ်ယူ၍ ကိုယ်ပိုင် Gemini API Key ထည့်သွင်းနိုင်ပါသည်',
          type: 'info',
        });
        return;
      }
      const isVipOrAdmin =
        userProfile?.role === 'admin' ||
        userProfile?.tier === 'unlimited' ||
        planStatus.hasActivePlan;
      if (!isVipOrAdmin && (userProfile?.credits ?? 0) <= 0) {
        setIsUserProfileOpen(true);
        showAlert({
          title: 'Translation Credits ကုန်ဆုံးသွားပါပြီ',
          message: 'Promo Code ရိုက်ထည့်ပါ သို့မဟုတ် Credit / Plan ထပ်မံဖြည့်တင်းပေးပါ',
          type: 'warning',
        });
        return;
      }
    }

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: 'translating' } : it))
    );
    try {
      const payload = {
        items: [{ id: item.id, text: item.originalText }],
        apiKey: translationSettings.customApiKey,
        customApiKeys: translationSettings.customApiKeys,
        accessCode: translationSettings.accessCode,
        settings: {
          style: translationSettings.style,
          tone: translationSettings.tone,
          glossary: translationSettings.glossary,
          preserveTags: translationSettings.preserveTags,
          useBurmeseDigits: translationSettings.useBurmeseDigits,
          speakerNameHandling: translationSettings.speakerNameHandling,
          properNounsMode: translationSettings.properNounsMode,
          soundEffectsHandling: translationSettings.soundEffectsHandling,
          honorificStyle: translationSettings.honorificStyle,
          conciseness: translationSettings.conciseness,
          customPromptNote: translationSettings.customPromptNote,
          storyContext: translationSettings.storyContext,
        },
      };

      let transResult = '';
      try {
        const res = await fetch('/api/translate-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          transResult = data.translations?.[0]?.translatedText || '';
        } else {
          const d = await translateDirectlyViaGemini(
            payload.items,
            translationSettings.customApiKey || '',
            translationSettings
          );
          transResult = d?.[0]?.translatedText || '';
        }
      } catch {
        const d = await translateDirectlyViaGemini(
          payload.items,
          translationSettings.customApiKey || '',
          translationSettings
        );
        transResult = d?.[0]?.translatedText || '';
      }

      if (transResult) {
        // Deduct 1 credit and track translated lines
        if (firebaseUser) {
          setUserProfile((prev) =>
            prev
              ? {
                  ...prev,
                  credits: Math.max(0, (prev.credits ?? 0) - 1),
                  totalTranslatedLines: (prev.totalTranslatedLines ?? 0) + 1,
                }
              : null
          );
          deductUserCredits(firebaseUser.uid, 1, true).catch(console.warn);
        }

        setItems((prev) => {
          const updated = prev.map((it) =>
            it.id === item.id
              ? { ...it, translatedText: transResult, status: 'completed' }
              : it
          );
          pushHistory(updated);
          return updated;
        });
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'error', errorMessage: 'Failed' } : it
          )
        );
      }
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: 'error', errorMessage: 'Failed' } : it
        )
      );
    }
  }, [translationSettings, firebaseUser, userProfile, pushHistory]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTimeMs((prev) => Math.max(0, prev - 3000));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTimeMs((prev) => Math.min((durationSec || 1437) * 1000, prev + 3000));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (activeItem) {
          const idx = items.findIndex((i) => i.id === activeItem.id);
          if (idx > 0) {
            setCurrentTimeMs(items[idx - 1].startMs);
          }
        }
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (activeItem) {
          const idx = items.findIndex((i) => i.id === activeItem.id);
          if (idx < items.length - 1) {
            setCurrentTimeMs(items[idx + 1].startMs);
          }
        }
      } else if (e.altKey && e.key === '[') {
        e.preventDefault();
        // Alt + [ : Set start time of active item to currentTimeMs
        if (activeItem) {
          handleUpdateItem(activeItem.id, {
            startMs: currentTimeMs,
            startTime: msToTimeSRT(currentTimeMs),
          });
        }
      } else if (e.altKey && e.key === ']') {
        e.preventDefault();
        // Alt + ] : Set end time of active item to currentTimeMs
        if (activeItem) {
          handleUpdateItem(activeItem.id, {
            endMs: currentTimeMs,
            endTime: msToTimeSRT(currentTimeMs),
          });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Ctrl + K : Split subtitle at playhead
        if (activeItem) {
          handleSplitItem(activeItem.id);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleToggleAdmin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    durationSec,
    activeItem,
    items,
    currentTimeMs,
    handleUndo,
    handleRedo,
    handleUpdateItem,
    handleSplitItem,
    handleToggleAdmin,
  ]);

  // Load Subtitle File from User
  const handleFileLoaded = (content: string, filename: string) => {
    const parsed = parseSubtitles(content, filename);
    if (parsed.items.length > 0) {
      setItems(parsed.items);
      pushHistory(parsed.items);
      const lastEnd = parsed.items[parsed.items.length - 1].endMs;
      setDurationSec(Math.max(60, Math.ceil(lastEnd / 1000)));
      setCurrentTimeMs(parsed.items[0].startMs);
      setMeta({
        fileName: filename,
        format: parsed.format,
        totalItems: parsed.items.length,
        durationMs: lastEnd,
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) handleFileLoaded(text, file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Video File Upload
  const handleVideoUpload = (file: File) => {
    if (customVideoUrl) {
      URL.revokeObjectURL(customVideoUrl);
    }
    const url = URL.createObjectURL(file);
    setCustomVideoUrl(url);
    setCustomVideoFileName(file.name);
  };

  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoUpload(file);
    e.target.value = '';
  };

  // Clear only translations
  const handleClearTranslations = useCallback(() => {
    setItems((prev) => {
      const updated = prev.map((item) => ({
        ...item,
        translatedText: '',
        status: 'idle' as const,
      }));
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  // Clear all items (fresh start)
  const handleClearAllItems = useCallback(() => {
    setItems([]);
    pushHistory([]);
    setMeta(null);
    setCurrentTimeMs(0);
    setDurationSec(0);
  }, [pushHistory]);

  // Re-index all subtitles 1..N
  const handleReindexItems = useCallback(() => {
    setItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.startMs - b.startMs);
      const reindexed = sorted.map((item, i) => ({ ...item, index: i + 1 }));
      pushHistory(reindexed);
      return reindexed;
    });
  }, [pushHistory]);

  // Strip HTML tags like <i>, <b>, <font>
  const handleStripTags = useCallback(() => {
    setItems((prev) => {
      const updated = prev.map((item) => ({
        ...item,
        originalText: item.originalText.replace(/<[^>]*>/g, '').trim(),
        translatedText: item.translatedText ? item.translatedText.replace(/<[^>]*>/g, '').trim() : item.translatedText,
      }));
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  // Batch Find & Replace
  const handleBatchReplace = useCallback((
    searchTerm: string,
    replaceTerm: string,
    targetField: 'both' | 'original' | 'translated',
    matchCase: boolean
  ) => {
    if (!searchTerm) return;
    setItems((prev) => {
      const flags = matchCase ? 'g' : 'gi';
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, flags);

      const updated = prev.map((item) => {
        let newOrig = item.originalText;
        let newTrans = item.translatedText;

        if (targetField === 'both' || targetField === 'original') {
          newOrig = newOrig.replace(regex, replaceTerm);
        }
        if (targetField === 'both' || targetField === 'translated') {
          if (newTrans) {
            newTrans = newTrans.replace(regex, replaceTerm);
          }
        }

        return {
          ...item,
          originalText: newOrig,
          translatedText: newTrans,
        };
      });

      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  // New Blank Project
  const handleNewBlank = () => {
    const blank: SubtitleItem[] = [
      {
        id: 1,
        index: 1,
        startTime: '00:00:01.000',
        endTime: '00:00:04.000',
        startMs: 1000,
        endMs: 4000,
        originalText: 'Hello world',
        translatedText: 'မင်္ဂလာပါ',
        status: 'completed',
      },
    ];
    setItems(blank);
    pushHistory(blank);
    setCurrentTimeMs(1000);
    setDurationSec(300);
    setMeta({
      fileName: 'new_subtitles.srt',
      format: 'srt',
      totalItems: 1,
      durationMs: 300000,
    });
  };

  // Deep script pre-reading comprehension analysis
  const handleAnalyzeStoryContext = async (force: boolean = false): Promise<StoryContextAnalysis | null> => {
    if (items.length === 0) return null;
    if (!force && translationSettings.storyContext) {
      return translationSettings.storyContext;
    }

    setIsAnalyzingContext(true);
    try {
      const dialogues = items.map((it) => ({ id: it.id, text: it.originalText }));
      const payload = {
        dialogues,
        apiKey: translationSettings.customApiKey,
        customPromptNote: translationSettings.customPromptNote,
      };

      let analysis: StoryContextAnalysis | null = null;
      try {
        const res = await fetch('/api/analyze-subtitles-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          analysis = data.analysis;
        } else {
          analysis = await analyzeStoryContextDirectlyViaGemini(
            dialogues,
            translationSettings.customApiKey || '',
            translationSettings
          );
        }
      } catch {
        analysis = await analyzeStoryContextDirectlyViaGemini(
          dialogues,
          translationSettings.customApiKey || '',
          translationSettings
        );
      }

      if (analysis) {
        setTranslationSettings((prev) => ({
          ...prev,
          storyContext: analysis,
        }));
        return analysis;
      }
    } catch (err) {
      console.warn('Story context analysis error:', err);
    } finally {
      setIsAnalyzingContext(false);
    }
    return null;
  };

  // AI Batch Translate
  const handleStartTranslate = async () => {
    if (items.length === 0 || isTranslating) return;

    // Credit & Auth Check with Active Plan requirement for custom keys (BYOK)
    const isUsingCustomKey =
      !!translationSettings.customApiKey?.trim() ||
      !!(translationSettings.customApiKeys && translationSettings.customApiKeys.length > 0);
    const planStatus = userProfile
      ? checkUserPlanStatus(userProfile)
      : { hasActivePlan: false, daysRemaining: 0, planName: 'None' };
    const isAdmin = userProfile?.role === 'admin';

    // Restrict custom keys to users with active plan and remaining days (or Admin)
    if (isUsingCustomKey && !isAdmin && !planStatus.hasActivePlan) {
      setIsUserProfileOpen(true);
      showAlert({
        title: 'Plan ဝယ်ယူရန် လိုအပ်ပါသည်',
        message: 'Plan ဝယ်ယူထားပြီး သက်တမ်းရက် ကျန်ရှိမှသာ မိမိ၏ Free Gemini API Key (BYOK) ထည့်သွင်းသုံးစွဲနိုင်ပါသည်!\n\nကျေးဇူးပြု၍ Plan ဝယ်ယူပါ သို့မဟုတ် စနစ်မှ ပေးထားသော Free Credits (300 lines) ဖြင့် အသုံးပြုပါ',
        type: 'warning',
      });
      return;
    }

    if (!isUsingCustomKey) {
      if (!firebaseUser) {
        setIsUserProfileOpen(true);
        showAlert({
          title: 'Sign In ပြုလုပ်ပေးပါ',
          message: 'ဘာသာပြန်ရန်အတွက် Google Account ဖြင့် Sign In ဝင်ရောက်ပေးပါ (အခမဲ့ 300 Free Credits ရရှိပါမည်) သို့မဟုတ် Plan ဝယ်ယူ၍ ကိုယ်ပိုင် Gemini API Key ထည့်သွင်းနိုင်ပါသည်',
          type: 'info',
        });
        return;
      }

      const isVipOrAdmin =
        userProfile?.role === 'admin' ||
        userProfile?.tier === 'unlimited' ||
        planStatus.hasActivePlan;

      if (!isVipOrAdmin && (userProfile?.credits ?? 0) <= 0) {
        setIsUserProfileOpen(true);
        showAlert({
          title: 'Translation Credits ကုန်ဆုံးသွားပါပြီ',
          message: 'သင်၏ Translation Credit များ ကုန်ဆုံးသွားပါပြီ။ Promo Code ရိုက်ထည့်ပါ သို့မဟုတ် Plan / Credits ထပ်မံဖြည့်တင်းပါ',
          type: 'warning',
        });
        return;
      }
    }

    isCancelledRef.current = false;
    setIsTranslating(true);

    // Step 1: Pre-read story & characters if enabled and not already analyzed
    let currentStoryContext = translationSettings.storyContext;
    if (translationSettings.enableContextPreAnalysis !== false && !currentStoryContext) {
      setContextAnalysisStep('reading');
      currentStoryContext = await handleAnalyzeStoryContext(false);
      setContextAnalysisStep('done');
    }

    if (isCancelledRef.current) {
      setIsTranslating(false);
      setContextAnalysisStep('idle');
      return;
    }

    // Step 2: Batch Translation with pre-comprehended story context
    const batchSize = translationSettings.batchSize || 25;
    const itemsToTranslate = items.filter((i) => !i.translatedText || i.status !== 'completed');
    const targetItems = itemsToTranslate.length > 0 ? itemsToTranslate : [...items];

    setTranslationProgress({ current: 0, total: targetItems.length });

    const isVipOrAdminUser =
      userProfile?.role === 'admin' ||
      userProfile?.tier === 'unlimited' ||
      planStatus.hasActivePlan;

    for (let i = 0; i < targetItems.length; i += batchSize) {
      if (isCancelledRef.current) break;

      // Check if user ran out of credits mid-batch
      if (!isUsingCustomKey && !isVipOrAdminUser && (userProfile?.credits ?? 0) <= 0) {
        showAlert({
          title: 'Translation Credits ကုန်ဆုံးသွားပါပြီ',
          message: 'ကျန်ရှိသော စာကြောင်းများကို ဆက်လက်ဘာသာပြန်ရန် Credits ထပ်မံဖြည့်တင်းပါ သို့မဟုတ် Plan ဝယ်ယူပါ',
          type: 'warning',
        });
        break;
      }

      const chunk = targetItems.slice(i, i + batchSize);

      setItems((prev) =>
        prev.map((it) =>
          chunk.some((c) => c.id === it.id)
            ? { ...it, status: 'translating', errorMessage: undefined }
            : it
        )
      );

      try {
        const payload = {
          items: chunk.map((item) => ({ id: item.id, text: item.originalText })),
          apiKey: translationSettings.customApiKey,
          customApiKeys: translationSettings.customApiKeys,
          accessCode: translationSettings.accessCode,
          settings: {
            style: translationSettings.style,
            tone: translationSettings.tone,
            glossary: translationSettings.glossary,
            preserveTags: translationSettings.preserveTags,
            useBurmeseDigits: translationSettings.useBurmeseDigits,
            speakerNameHandling: translationSettings.speakerNameHandling,
            properNounsMode: translationSettings.properNounsMode,
            soundEffectsHandling: translationSettings.soundEffectsHandling,
            honorificStyle: translationSettings.honorificStyle,
            conciseness: translationSettings.conciseness,
            customPromptNote: translationSettings.customPromptNote,
            storyContext: currentStoryContext,
            accessCode: translationSettings.accessCode,
          },
        };

        let translations: Array<{ id: number; translatedText: string }> = [];

        try {
          const res = await fetch('/api/translate-subtitles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const data = await res.json();
            translations = data.translations || [];
          } else {
            translations = await translateDirectlyViaGemini(
              payload.items,
              translationSettings.customApiKey || '',
              { ...translationSettings, storyContext: currentStoryContext }
            );
          }
        } catch {
          translations = await translateDirectlyViaGemini(
            payload.items,
            translationSettings.customApiKey || '',
            { ...translationSettings, storyContext: currentStoryContext }
          );
        }

        setItems((prev) =>
          prev.map((it) => {
            const match = translations.find((t) => t.id === it.id);
            if (match) {
              return {
                ...it,
                translatedText: match.translatedText,
                status: 'completed',
              };
            }
            return it;
          })
        );

        // Deduct credits for this translated batch and track translated lines
        if (firebaseUser) {
          setUserProfile((prev) =>
            prev
              ? {
                  ...prev,
                  credits: Math.max(0, (prev.credits ?? 0) - chunk.length),
                  totalTranslatedLines: (prev.totalTranslatedLines ?? 0) + chunk.length,
                }
              : null
          );
          try {
            await deductUserCredits(firebaseUser.uid, chunk.length, true);
          } catch (e) {
            console.warn('Failed to deduct credits:', e);
          }
        }

        setTranslationProgress({
          current: Math.min(targetItems.length, i + chunk.length),
          total: targetItems.length,
        });
      } catch (err: any) {
        console.error('Translation error:', err);
      }
    }

    setIsTranslating(false);
    setContextAnalysisStep('idle');
    setTranslationProgress(undefined);
  };

  return (
    <div className="h-screen w-screen bg-[#07080e] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={subtitleInputRef}
        onChange={handleFileInputChange}
        accept=".srt,.vtt,.txt"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoInputChange}
        accept="video/*,.mkv,.mp4,.webm"
        className="hidden"
      />

      {/* Top Studio Header */}
      <StudioHeader
        onExportClick={() => setIsExportOpen(true)}
        onUploadSubtitleClick={() => subtitleInputRef.current?.click()}
        onUploadVideoClick={() => videoInputRef.current?.click()}
        onNewSubtitleClick={handleNewBlank}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenAdmin={handleToggleAdmin}
        onOpenOnlineSubtitles={() => setIsOnlineSubtitlesOpen(true)}
        hasSubtitles={items.length > 0}
        user={firebaseUser}
        profile={userProfile}
        onOpenUserProfile={() => setIsUserProfileOpen(true)}
        onGoogleSignIn={handleGoogleSignIn}
      />

      {/* Main Studio Body: Workspace + Bottom Timeline */}
      {activeTab === 'admin' ? (
        <div className="flex-1 overflow-y-auto bg-[#090b12]">
          <AdminPanel
            onBackToUserPanel={() => setActiveTab('studio')}
            onUpdateDonationConfig={(cfg) =>
              setTranslationSettings((prev) => ({ ...prev, donationConfig: cfg }))
            }
            currentDonationConfig={translationSettings.donationConfig}
            user={firebaseUser}
            profile={userProfile}
            onGoogleSignIn={handleGoogleSignIn}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Upper Section: Split View Video & Subtitle Table */}
          <StudioWorkspace
            items={items}
            videoConfig={videoConfig}
            onUpdateVideoConfig={setVideoConfig}
            translationSettings={translationSettings}
            onUpdateTranslationSettings={setTranslationSettings}
            displayMode={displayMode}
            onSelectDisplayMode={setDisplayMode}
            targetLanguage={targetLanguage}
            onSelectTargetLanguage={setTargetLanguage}
            onStartTranslate={handleStartTranslate}
            onCancelTranslate={() => {
              isCancelledRef.current = true;
              setIsTranslating(false);
              setContextAnalysisStep('idle');
            }}
            isTranslating={isTranslating}
            translationProgress={translationProgress}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenAdmin={handleToggleAdmin}
            user={firebaseUser}
            profile={userProfile}
            currentTimeMs={currentTimeMs}
            durationSec={durationSec}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSeek={(ms) => setCurrentTimeMs(ms)}
            activeItem={activeItem}
            onSelectSubItem={(it) => setCurrentTimeMs(it.startMs)}
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onMergeItem={handleMergeItem}
            onSplitItem={handleSplitItem}
            onTranslateSingleItem={handleTranslateSingleItem}
            onOpenTimeShift={() => setIsShiftOpen(true)}
            onUploadVideo={handleVideoUpload}
            customVideoUrl={customVideoUrl}
            customVideoFileName={customVideoFileName}
            onAnalyzeStoryContext={() => handleAnalyzeStoryContext(true)}
            isAnalyzingContext={isAnalyzingContext}
            contextAnalysisStep={contextAnalysisStep}
            onUploadSubtitle={(file) => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const text = ev.target?.result as string;
                if (text) handleFileLoaded(text, file.name);
              };
              reader.readAsText(file);
            }}
            onOpenOnlineSubtitles={() => setIsOnlineSubtitlesOpen(true)}
            onClearTranslations={handleClearTranslations}
            onClearAllItems={handleClearAllItems}
            onReindexItems={handleReindexItems}
            onStripTags={handleStripTags}
            onBatchReplace={handleBatchReplace}
            onNewSubtitle={handleNewBlank}
          />

          {/* Bottom Section: Audio Waveform & Multi-Track Subtitle Timeline */}
          <StudioTimeline
            items={items}
            currentTimeMs={currentTimeMs}
            durationSec={durationSec}
            activeItem={activeItem}
            onSeek={(ms) => setCurrentTimeMs(ms)}
            onSelectSubItem={(it) => setCurrentTimeMs(it.startMs)}
            onUpdateItem={handleUpdateItem}
            onSplitAtPlayhead={handleSplitItem}
            onAddSubtitleAtTime={(timeMs) => handleAddItem(undefined, timeMs)}
            onMergeItem={handleMergeItem}
            onDeleteItem={handleDeleteItem}
            onTranslateSingle={handleTranslateSingleItem}
            displayMode={displayMode}
            isPlaying={isPlaying}
          />
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Translation Settings Modal */}
      <TranslationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={translationSettings}
        onUpdateSettings={setTranslationSettings}
        onAnalyzeContext={() => handleAnalyzeStoryContext(true)}
        isAnalyzingContext={isAnalyzingContext}
        onConfirmAndTranslate={() => {
          setIsSettingsModalOpen(false);
          handleStartTranslate();
        }}
      />

      {/* Time Offset Modal */}
      <TimeOffsetModal
        isOpen={isShiftOpen}
        onClose={() => setIsShiftOpen(false)}
        items={items}
        format={meta?.format}
        onApplyShift={(shifted) => {
          setItems(shifted);
          pushHistory(shifted);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        items={items}
        originalFilename={meta?.fileName || 'subtitles.srt'}
      />

      {/* Donation Modal */}
      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        donationConfig={translationSettings.donationConfig}
      />

      {/* User Profile & Credit Top-up / Promo Code Modal */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        user={firebaseUser}
        profile={userProfile}
        onSignIn={handleGoogleSignIn}
        onOpenAdmin={handleToggleAdmin}
        onUpdateCustomKeys={(updatedKeys) => {
          setTranslationSettings((prev) => ({
            ...prev,
            customApiKeys: updatedKeys,
            customApiKey: updatedKeys.length > 0 ? updatedKeys[0].key : prev.customApiKey,
          }));
        }}
      />

      {/* Online Subtitle Search & Direct Import Modal */}
      <SubtitleSearchModal
        isOpen={isOnlineSubtitlesOpen}
        onClose={() => setIsOnlineSubtitlesOpen(false)}
        onImportSubtitle={handleFileLoaded}
        isAdmin={isUserAdmin}
        onOpenAdmin={() => {
          setIsOnlineSubtitlesOpen(false);
          handleToggleAdmin();
        }}
      />
    </div>
  );
}
