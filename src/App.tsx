import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  SubtitleItem,
  SubtitleFileMeta,
  TranslationSettings,
  VideoConfig,
  UsageConfig,
  UserAccessStatus,
} from './types';
import { parseSubtitles, msToTimeSRT } from './utils/subtitleParser';
import { DEFAULT_GLOSSARY_TERMS } from './utils/burmeseUtils';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { SubtitleTable } from './components/SubtitleTable';
import { VideoPreview } from './components/VideoPreview';
import { TranslationSettingsModal } from './components/TranslationSettingsModal';
import { TimeOffsetModal } from './components/TimeOffsetModal';
import { ExportModal } from './components/ExportModal';
import { DonationModal } from './components/DonationModal';
import { AdminPanel } from './components/AdminPanel';
import { AccessLimitExceededModal } from './components/AccessLimitExceededModal';
import { translateDirectlyViaGemini } from './utils/geminiDirect';
import {
  getLocalUsageConfig,
  getSavedAccessCode,
  setSavedAccessCode,
  evaluateUserAccessStatus,
  incrementFreeUsageToday,
} from './utils/accessKeyUtils';

export default function App() {
  const [items, setItems] = useState<SubtitleItem[]>([]);
  const [meta, setMeta] = useState<SubtitleFileMeta | null>(null);
  const [activeTab, setActiveTab] = useState<'subtitles' | 'video' | 'admin'>('subtitles');
  const [activeSubIndex, setActiveSubIndex] = useState<number | undefined>(undefined);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  // Usage Config & Access Status
  const [usageConfig, setUsageConfig] = useState<UsageConfig>(() => getLocalUsageConfig());

  // Video Player Configuration
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
      donationConfig: savedDonation || {
        kpayPhone: '09770033353',
        kpayName: 'Aung Kyaw Khant',
        wavePhone: '09668888555',
        waveName: 'Aung Kyaw Khant',
        note: 'Server ဖိုး ကူညီထောက်ပံ့ပေးသော စိတ်ကောင်းစေတနာရှင်များအားလုံးကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်။',
      },
    };
  });

  // Access status calculation
  const accessStatus: UserAccessStatus = evaluateUserAccessStatus(
    translationSettings.customApiKey,
    translationSettings.accessCode,
    usageConfig
  );

  // Fetch server donation config, telegram config & usage config on mount
  useEffect(() => {
    fetch('/api/donation-config')
      .then((res) => {
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.kpayPhone) {
          setTranslationSettings((prev) => ({
            ...prev,
            donationConfig: data,
          }));
        }
      })
      .catch(() => {});

    fetch('/api/usage-status?code=' + encodeURIComponent(translationSettings.accessCode || ''))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.usageConfig) {
          setUsageConfig(data.usageConfig);
        }
      })
      .catch(() => {});
  }, [translationSettings.accessCode]);

  const handleUpdateSettings = (newSettings: TranslationSettings) => {
    setTranslationSettings(newSettings);
    if (typeof window !== 'undefined') {
      if (newSettings.customApiKey !== undefined) {
        localStorage.setItem('user_gemini_api_key', newSettings.customApiKey.trim());
      }
      if (newSettings.donationConfig) {
        localStorage.setItem('user_donation_config', JSON.stringify(newSettings.donationConfig));
      }
    }
  };

  // UI Modals
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);

  // Handle Load Subtitle File
  const handleFileLoaded = (content: string, filename: string) => {
    const parsed = parseSubtitles(content, filename);
    setItems(parsed.items);
    setMeta({
      fileName: filename,
      format: parsed.format,
      totalItems: parsed.items.length,
      durationMs: parsed.items.length > 0 ? parsed.items[parsed.items.length - 1].endMs : 0,
    });
    setActiveTab('subtitles');
    setIsSettingsModalOpen(true);
  };

  // Update Single Subtitle Item
  const handleUpdateItem = (id: number, updatedFields: Partial<SubtitleItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
  };

  // Add new subtitle item
  const handleAddItem = (afterItemId?: number, startMsOverride?: number) => {
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
        originalText: 'New Subtitle',
        translatedText: '',
        status: 'pending',
      };

      const updated = [...prev];
      updated.splice(insertIndex, 0, newItem);

      return updated.map((item, idx) => ({ ...item, index: idx + 1 }));
    });
  };

  // Delete subtitle item
  const handleDeleteItem = (id: number) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== id);
      return filtered.map((item, idx) => ({ ...item, index: idx + 1 }));
    });
  };

  // Merge subtitle item with next item
  const handleMergeItem = (id: number) => {
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

      return updated.map((item, i) => ({ ...item, index: i + 1 }));
    });
  };

  const isCancelledRef = useRef(false);

  const handleStopTranslation = () => {
    isCancelledRef.current = true;
    setIsTranslating(false);
  };

  // Batch Translate Subtitles with Gemini Server API
  const handleTranslateSubtitles = async (onlyPendingOrError: boolean = false) => {
    if (items.length === 0 || isTranslating) return;

    // Check user access limit before translation
    const currentStatus = evaluateUserAccessStatus(
      translationSettings.customApiKey,
      translationSettings.accessCode,
      usageConfig
    );
    if (!currentStatus.canTranslate) {
      setIsLimitModalOpen(true);
      return;
    }

    isCancelledRef.current = false;
    setIsTranslating(true);

    const batchSize = translationSettings.batchSize || 30;
    const itemsToTranslate = onlyPendingOrError
      ? items.filter((i) => i.status !== 'completed' || !i.translatedText)
      : [...items];

    if (itemsToTranslate.length === 0) {
      setIsTranslating(false);
      return;
    }

    for (let i = 0; i < itemsToTranslate.length; i += batchSize) {
      if (isCancelledRef.current) break;

      const chunk = itemsToTranslate.slice(i, i + batchSize);

      // Mark status as translating
      setItems((prev) =>
        prev.map((item) =>
          chunk.some((c) => c.id === item.id)
            ? { ...item, status: 'translating', errorMessage: undefined }
            : item
        )
      );

      let success = false;
      let attempt = 0;
      const maxAttempts = 6;

      while (!success && attempt < maxAttempts && !isCancelledRef.current) {
        attempt++;
        try {
          const payload = {
            items: chunk.map((item) => ({
              id: item.id,
              text: item.originalText,
            })),
            apiKey: translationSettings.customApiKey,
            accessCode: translationSettings.accessCode,
            settings: {
              style: translationSettings.style,
              tone: translationSettings.tone,
              glossary: translationSettings.glossary.map((g) => ({
                original: g.original,
                target: g.target,
              })),
              preserveTags: translationSettings.preserveTags,
              useBurmeseDigits: translationSettings.useBurmeseDigits,
              speakerNameHandling: translationSettings.speakerNameHandling,
              properNounsMode: translationSettings.properNounsMode,
              soundEffectsHandling: translationSettings.soundEffectsHandling,
              honorificStyle: translationSettings.honorificStyle,
              conciseness: translationSettings.conciseness,
              customPromptNote: translationSettings.customPromptNote,
            },
          };

          let translations: Array<{ id: number; translatedText: string }> = [];

          try {
            const res = await fetch('/api/translate-subtitles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (isCancelledRef.current) break;

            const contentType = res.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');

            if (!isJson || res.status === 404) {
              // Static web host (e.g. Hostinger public_html) without Node server backend
              translations = await translateDirectlyViaGemini(
                payload.items,
                translationSettings.customApiKey || '',
                translationSettings
              );
            } else if (!res.ok) {
              const errData = await res.json().catch(() => ({}));

              if (res.status === 403 || errData.isLimitExceeded) {
                setIsLimitModalOpen(true);
                throw new Error(errData.error || 'အသုံးပြုမှု ကန့်သတ်ချက် ပြည့်သွားပါပြီ (VIP Key သို့မဟုတ် Gemini API Key ထည့်သွင်းပါ)');
              }

              const isRateLimit = res.status === 429 || errData.isRateLimit;
              if (isRateLimit) {
                if (attempt < maxAttempts) {
                  const waitMs = Math.min(25000, attempt * 5000);
                  console.warn(`[Free Key Rate Limit] 429 encountered. Waiting ${waitMs / 1000}s...`);
                  await new Promise((resolve) => setTimeout(resolve, waitMs));
                  continue;
                }
                throw new Error('AI တောင်းဆိုမှု ပမာဏ ပြည့်နေပါသည် (Free API Key ကို သုံးထားပါက ခေတ္တစောင့်ပြီး ပြန်လည်ကြိုးစားပါ)');
              }
              throw new Error(errData.error || `Server returned HTTP ${res.status}`);
            } else {
              const data = await res.json();
              translations = data.translations || [];
            }
          } catch (fetchErr: any) {
            if (fetchErr.message && fetchErr.message.includes('ကန့်သတ်ချက်')) {
              throw fetchErr;
            }
            // Network failure or static host without backend
            translations = await translateDirectlyViaGemini(
              payload.items,
              translationSettings.customApiKey || '',
              translationSettings
            );
          }

          // Update translated items
          setItems((prev) =>
            prev.map((item) => {
              const match = translations.find((t) => t.id === item.id);
              if (match) {
                return {
                  ...item,
                  translatedText: match.translatedText,
                  status: 'completed',
                  errorMessage: undefined,
                };
              }
              if (chunk.some((c) => c.id === item.id)) {
                return { ...item, status: 'completed' };
              }
              return item;
            })
          );

          if (currentStatus.tier === 'free') {
            incrementFreeUsageToday(chunk.length);
          }

          success = true;
        } catch (err: any) {
          console.error(`Batch translation error (attempt ${attempt}/${maxAttempts}):`, err);
          if (err.message && err.message.includes('ကန့်သတ်ချက်')) {
            isCancelledRef.current = true;
            setItems((prev) =>
              prev.map((item) =>
                chunk.some((c) => c.id === item.id)
                  ? { ...item, status: 'error', errorMessage: err.message }
                  : item
              )
            );
            break;
          }

          if (attempt < maxAttempts && !isCancelledRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 4000));
          } else {
            setItems((prev) =>
              prev.map((item) =>
                chunk.some((c) => c.id === item.id)
                  ? { ...item, status: 'error', errorMessage: err.message }
                  : item
              )
            );
          }
        }
      }

      // Pacing delay (1.5s - 3s) between batch requests to respect Free API limits
      if (i + batchSize < itemsToTranslate.length && !isCancelledRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setIsTranslating(false);
  };

  // Translate Single Item on Demand
  const handleTranslateSingleItem = async (id: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const currentStatus = evaluateUserAccessStatus(
      translationSettings.customApiKey,
      translationSettings.accessCode,
      usageConfig
    );
    if (!currentStatus.canTranslate) {
      setIsLimitModalOpen(true);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'translating', errorMessage: undefined } : i))
    );

    try {
      let translatedText = '';

      try {
        const res = await fetch('/api/translate-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ id: item.id, index: item.index, text: item.originalText }],
            apiKey: translationSettings.customApiKey,
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
            },
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          translatedText = data.translations?.[0]?.translatedText || '';
        } else if (res.status === 403) {
          setIsLimitModalOpen(true);
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'အသုံးပြုမှု ကန့်သတ်ချက် ပြည့်သွားပါပြီ');
        } else {
          // Fallback to direct client-side translation
          const fallbackRes = await translateDirectlyViaGemini(
            [{ id: item.id, text: item.originalText }],
            translationSettings.customApiKey || '',
            translationSettings
          );
          translatedText = fallbackRes?.[0]?.translatedText || '';
        }
      } catch (fetchErr: any) {
        if (fetchErr.message && fetchErr.message.includes('ကန့်သတ်ချက်')) {
          throw fetchErr;
        }
        // Direct client fallback
        const fallbackRes = await translateDirectlyViaGemini(
          [{ id: item.id, text: item.originalText }],
          translationSettings.customApiKey || '',
          translationSettings
        );
        translatedText = fallbackRes?.[0]?.translatedText || '';
      }

      if (translatedText) {
        if (currentStatus.tier === 'free') {
          incrementFreeUsageToday(1);
        }
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, translatedText, status: 'completed', errorMessage: undefined }
              : i
          )
        );
      } else {
        throw new Error('ဘာသာပြန်ဆို၍ မရပါ');
      }
    } catch (err: any) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: 'error', errorMessage: err.message } : i
        )
      );
    }
  };

  // Time Shift Handler
  const handleApplyTimeShift = (updatedItems: SubtitleItem[]) => {
    setItems(updatedItems);
  };

  const hasApiKey = Boolean(
    translationSettings.customApiKey && translationSettings.customApiKey.trim().length > 10
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Header
        meta={meta}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onUploadClick={() => {
          setMeta(null);
          setItems([]);
        }}
        onExportClick={() => setIsExportOpen(true)}
        onTimeShiftClick={() => setIsShiftOpen(true)}
        onDonateClick={() => setIsDonationModalOpen(true)}
        hasApiKey={hasApiKey}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        accessStatus={accessStatus}
        onOpenAccessModal={() => setIsLimitModalOpen(true)}
      />

      <main className="flex-1 pb-12">
        {activeTab === 'admin' ? (
          <AdminPanel
            onBackToUserPanel={() => setActiveTab('subtitles')}
            onUpdateDonationConfig={(cfg) =>
              setTranslationSettings((prev) => ({ ...prev, donationConfig: cfg }))
            }
            currentDonationConfig={translationSettings.donationConfig}
          />
        ) : !meta ? (
          <FileUploader
            onFileLoaded={handleFileLoaded}
          />
        ) : (
          <>
            {activeTab === 'subtitles' && (
              <SubtitleTable
                items={items}
                onUpdateItem={handleUpdateItem}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
                onMergeItem={handleMergeItem}
                onTranslateItem={handleTranslateSingleItem}
                onTranslateAll={handleTranslateSubtitles}
                onStopTranslation={handleStopTranslation}
                isTranslating={isTranslating}
                activeItemIndex={activeSubIndex}
                onSelectSubItem={(item) => setActiveSubIndex(item.index)}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                hasApiKey={hasApiKey}
              />
            )}

            {activeTab === 'video' && (
              <VideoPreview
                items={items}
                videoConfig={videoConfig}
                onUpdateVideoConfig={setVideoConfig}
                onSelectSubItem={(item) => setActiveSubIndex(item.index)}
                onUpdateItem={handleUpdateItem}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
                onMergeItem={handleMergeItem}
                onTimeShiftClick={() => setIsShiftOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#212734] bg-[#0e1219] py-3.5 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-center sm:text-left text-[11px] text-slate-400">
            မြန်မာ ဗီဒီယိုစာတန်းထိုး AI ဘာသာပြန်အက်ပ် - Powered by AnimeGabar
          </p>
          <button
            onClick={() => setActiveTab('admin')}
            className="text-[11px] text-slate-400 hover:text-emerald-400 transition flex items-center space-x-1.5 py-1 px-2.5 rounded border border-transparent hover:border-[#212734] hover:bg-[#12161f]"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>AnimeGabar</span>
          </button>
        </div>
      </footer>

      {/* Access Limit Exceeded / Key Entry Modal */}
      <AccessLimitExceededModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        accessStatus={accessStatus}
        usageConfig={usageConfig}
        onSaveAccessCode={(code) => {
          setSavedAccessCode(code);
          setTranslationSettings((prev) => ({ ...prev, accessCode: code }));
          fetch('/api/usage-status?code=' + encodeURIComponent(code))
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && data.usageConfig) setUsageConfig(data.usageConfig);
            })
            .catch(() => {});
        }}
        onSaveCustomApiKey={(key) => {
          localStorage.setItem('user_gemini_api_key', key);
          setTranslationSettings((prev) => ({ ...prev, customApiKey: key }));
        }}
        onOpenDonateModal={() => {
          setIsLimitModalOpen(false);
          setIsDonationModalOpen(true);
        }}
        contactTelegram={usageConfig.contactTelegram || '@AnimeGabar'}
      />

      {/* Translation Settings Setup Modal */}
      <TranslationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={translationSettings}
        onUpdateSettings={handleUpdateSettings}
        onConfirmAndTranslate={() => {
          setIsSettingsModalOpen(false);
          handleTranslateSubtitles(false);
        }}
      />

      {/* Time Offset Modal */}
      <TimeOffsetModal
        isOpen={isShiftOpen}
        onClose={() => setIsShiftOpen(false)}
        items={items}
        format={meta?.format}
        onApplyShift={handleApplyTimeShift}
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
    </div>
  );
}
