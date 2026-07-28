import React, { useState, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  SubtitleItem,
  SubtitleFileMeta,
  TranslationSettings,
  VideoConfig,
} from './types';
import { parseSubtitles } from './utils/subtitleParser';
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
import { translateDirectlyViaGemini } from './utils/geminiDirect';

export default function App() {
  const [items, setItems] = useState<SubtitleItem[]>([]);
  const [meta, setMeta] = useState<SubtitleFileMeta | null>(null);
  const [activeTab, setActiveTab] = useState<'subtitles' | 'video' | 'admin'>('subtitles');
  const [activeSubIndex, setActiveSubIndex] = useState<number | undefined>(undefined);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
      donationConfig: savedDonation || {
        kpayPhone: '09778899001',
        kpayName: 'AnimeGabar Admin',
        wavePhone: '09778899001',
        waveName: 'AnimeGabar Admin',
        note: 'Server ဖိုးနှင့် AI ဘာသာပြန်စရိတ် ကူညီထောက်ပံ့ပေးသော စိတ်ကောင်းစေတနာရှင်များအားလုံးကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်။',
      },
    };
  });

  // Fetch server donation config on mount
  React.useEffect(() => {
    fetch('/api/donation-config')
      .then((res) => {
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return null;
        }
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
      .catch(() => {
        // Static host fallback (e.g. Hostinger public_html)
      });
  }, []);

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

  const isCancelledRef = useRef(false);

  const handleStopTranslation = () => {
    isCancelledRef.current = true;
    setIsTranslating(false);
  };

  // Batch Translate Subtitles with Gemini Server API
  const handleTranslateSubtitles = async (onlyPendingOrError: boolean = false) => {
    if (items.length === 0 || isTranslating) return;

    isCancelledRef.current = false;
    setIsTranslating(true);

    const batchSize = translationSettings.batchSize || 25;
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
      const maxAttempts = 5;

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
              const isRateLimit = res.status === 429 || errData.isRateLimit;
              if (isRateLimit) {
                if (attempt < maxAttempts) {
                  const waitMs = Math.min(20000, attempt * 4000);
                  console.warn(`Rate limit 429. Waiting ${waitMs / 1000}s before retry...`);
                  await new Promise((resolve) => setTimeout(resolve, waitMs));
                  continue;
                }
                throw new Error('AI တောင်းဆိုမှု ပမာဏ ပြည့်နေပါသည် (ခေတ္တစောင့်ပြီး ပြန်လည်ကြိုးစားပါ)');
              }
              throw new Error(errData.error || `Server returned HTTP ${res.status}`);
            } else {
              const data = await res.json();
              translations = data.translations || [];
            }
          } catch (fetchErr: any) {
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
          success = true;
        } catch (err: any) {
          console.error(`Batch translation error (attempt ${attempt}/${maxAttempts}):`, err);
          if (attempt < maxAttempts && !isCancelledRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
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

      // Pacing delay between batch requests
      if (i + batchSize < itemsToTranslate.length && !isCancelledRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    setIsTranslating(false);
  };

  // Translate Single Item on Demand
  const handleTranslateSingleItem = async (id: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'translating' } : i))
    );

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

      if (!res.ok) throw new Error('Failed to translate');

      const data = await res.json();
      const match = data.translations?.[0];

      if (match) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, translatedText: match.translatedText, status: 'completed' }
              : i
          )
        );
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
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
      />

      <main className="flex-1 pb-12">
        {activeTab === 'admin' ? (
          <AdminPanel
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
                onTranslateItem={handleTranslateSingleItem}
                onTranslateAll={handleTranslateSubtitles}
                onStopTranslation={handleStopTranslation}
                isTranslating={isTranslating}
                activeItemIndex={activeSubIndex}
                onSelectSubItem={(item) => setActiveSubIndex(item.index)}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
              />
            )}

            {activeTab === 'video' && (
              <VideoPreview
                items={items}
                videoConfig={videoConfig}
                onUpdateVideoConfig={setVideoConfig}
                onSelectSubItem={(item) => setActiveSubIndex(item.index)}
                onUpdateItem={handleUpdateItem}
                onTimeShiftClick={() => setIsShiftOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-center sm:text-left">
            မြန်မာ ဗီဒီယိုစာတန်းထိုး AI ဘာသာပြန်အက်ပ် - Powered by AnimeGabar
          </p>
          <button
            onClick={() => setActiveTab('admin')}
            className="text-[11px] text-slate-600 hover:text-indigo-400 transition flex items-center space-x-1 py-0.5 px-1.5 rounded hover:bg-slate-900"
          >
            <ShieldAlert className="w-3 h-3 opacity-60" />
            <span>AnimeGabar</span>
          </button>
        </div>
      </footer>

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
