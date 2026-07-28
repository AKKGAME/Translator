import { SubtitleItem, SubtitleFormat } from '../types';
import { cleanSoundEffects } from './burmeseUtils';

/**
 * Convert time string (00:01:23,456 or 00:01:23.456) to milliseconds
 */
export function timeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace(',', '.');
  const parts = cleaned.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.round((minutes * 60 + seconds) * 1000);
  }
  return 0;
}

/**
 * Format milliseconds to SRT timestamp: HH:MM:SS,mmm
 */
export function msToTimeSRT(ms: number): string {
  if (ms < 0) ms = 0;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Format milliseconds to VTT timestamp: HH:MM:SS.mmm
 */
export function msToTimeVTT(ms: number): string {
  if (ms < 0) ms = 0;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');

  return `${hh}:${mm}:${ss}.${mmm}`;
}

/**
 * Parse SRT string content into SubtitleItem array
 */
export function parseSRT(content: string): SubtitleItem[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);
  const items: SubtitleItem[] = [];

  let nextId = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines.join('\n').trim();

    if (!startStr || !endStr) continue;

    const startMs = timeToMs(startStr);
    const endMs = timeToMs(endStr);

    items.push({
      id: nextId,
      index: nextId,
      startTime: msToTimeSRT(startMs),
      endTime: msToTimeSRT(endMs),
      startMs,
      endMs,
      originalText: text,
      translatedText: '',
      status: 'pending',
    });

    nextId++;
  }

  return items;
}

/**
 * Parse WebVTT string content into SubtitleItem array
 */
export function parseVTT(content: string): SubtitleItem[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Remove WEBVTT header if present
  let cleanContent = normalized;
  if (cleanContent.startsWith('WEBVTT')) {
    const headerEnd = cleanContent.indexOf('\n\n');
    if (headerEnd !== -1) {
      cleanContent = cleanContent.slice(headerEnd + 2);
    } else {
      cleanContent = cleanContent.replace(/^WEBVTT.*?\n/, '');
    }
  }

  const blocks = cleanContent.trim().split(/\n\s*\n/);
  const items: SubtitleItem[] = [];
  let nextId = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length === 0) continue;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const timeParts = timeLine.split('-->');
    if (timeParts.length < 2) continue;

    const startStr = timeParts[0].trim().split(' ')[0]; // Strip VTT position settings
    const endStr = timeParts[1].trim().split(' ')[0];

    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines.join('\n').trim();

    const startMs = timeToMs(startStr);
    const endMs = timeToMs(endStr);

    items.push({
      id: nextId,
      index: nextId,
      startTime: msToTimeVTT(startMs),
      endTime: msToTimeVTT(endMs),
      startMs,
      endMs,
      originalText: text,
      translatedText: '',
      status: 'pending',
    });

    nextId++;
  }

  return items;
}

/**
 * Detect format and parse subtitles
 */
export function parseSubtitles(
  content: string,
  filename: string = 'subtitle.srt'
): { items: SubtitleItem[]; format: SubtitleFormat } {
  const isVtt =
    filename.toLowerCase().endsWith('.vtt') ||
    content.trim().startsWith('WEBVTT');

  if (isVtt) {
    return { items: parseVTT(content), format: 'vtt' };
  } else {
    return { items: parseSRT(content), format: 'srt' };
  }
}

/**
 * Export to SRT format
 */
export function generateSRT(
  items: SubtitleItem[],
  type: 'translated' | 'original' | 'dual' = 'translated',
  skipEmpty: boolean = true
): string {
  let exportableItems = items;

  if (skipEmpty) {
    if (type === 'translated') {
      exportableItems = items.filter((item) => {
        if (!item.translatedText) return false;
        const cleaned = cleanSoundEffects(item.translatedText).trim();
        return cleaned.length > 0;
      });
    } else if (type === 'original') {
      exportableItems = items.filter((item) => {
        if (!item.originalText) return false;
        const cleaned = cleanSoundEffects(item.originalText).trim();
        return cleaned.length > 0;
      });
    } else {
      exportableItems = items.filter((item) => {
        const transClean = cleanSoundEffects(item.translatedText || '').trim();
        const origClean = cleanSoundEffects(item.originalText || '').trim();
        return transClean.length > 0 || origClean.length > 0;
      });
    }
  }

  return exportableItems
    .map((item, idx) => {
      let text = '';
      if (type === 'translated') {
        text = cleanSoundEffects(item.translatedText || '').trim();
      } else if (type === 'original') {
        text = cleanSoundEffects(item.originalText || '').trim();
      } else {
        const original = cleanSoundEffects(item.originalText || '').trim();
        const translated = cleanSoundEffects(item.translatedText || item.originalText || '').trim();
        text = `${translated}\n${original}`;
      }

      return `${idx + 1}\n${msToTimeSRT(item.startMs)} --> ${msToTimeSRT(item.endMs)}\n${text}`;
    })
    .join('\n\n');
}

/**
 * Export to WebVTT format
 */
export function generateVTT(
  items: SubtitleItem[],
  type: 'translated' | 'original' | 'dual' = 'translated',
  skipEmpty: boolean = true
): string {
  let exportableItems = items;

  if (skipEmpty) {
    if (type === 'translated') {
      exportableItems = items.filter((item) => {
        if (!item.translatedText) return false;
        const cleaned = cleanSoundEffects(item.translatedText).trim();
        return cleaned.length > 0;
      });
    } else if (type === 'original') {
      exportableItems = items.filter((item) => {
        if (!item.originalText) return false;
        const cleaned = cleanSoundEffects(item.originalText).trim();
        return cleaned.length > 0;
      });
    } else {
      exportableItems = items.filter((item) => {
        const transClean = cleanSoundEffects(item.translatedText || '').trim();
        const origClean = cleanSoundEffects(item.originalText || '').trim();
        return transClean.length > 0 || origClean.length > 0;
      });
    }
  }

  const body = exportableItems
    .map((item, idx) => {
      let text = '';
      if (type === 'translated') {
        text = cleanSoundEffects(item.translatedText || '').trim();
      } else if (type === 'original') {
        text = cleanSoundEffects(item.originalText || '').trim();
      } else {
        const original = cleanSoundEffects(item.originalText || '').trim();
        const translated = cleanSoundEffects(item.translatedText || item.originalText || '').trim();
        text = `${translated}\n${original}`;
      }

      return `${idx + 1}\n${msToTimeVTT(item.startMs)} --> ${msToTimeVTT(item.endMs)}\n${text}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${body}`;
}

/**
 * Export to plain text script
 */
export function generateTXT(
  items: SubtitleItem[],
  type: 'translated' | 'original' | 'dual' = 'translated',
  skipEmpty: boolean = true
): string {
  let exportableItems = items;

  if (skipEmpty) {
    if (type === 'translated') {
      exportableItems = items.filter((item) => {
        if (!item.translatedText) return false;
        const cleaned = cleanSoundEffects(item.translatedText).trim();
        return cleaned.length > 0;
      });
    } else if (type === 'original') {
      exportableItems = items.filter((item) => {
        if (!item.originalText) return false;
        const cleaned = cleanSoundEffects(item.originalText).trim();
        return cleaned.length > 0;
      });
    } else {
      exportableItems = items.filter((item) => {
        const transClean = cleanSoundEffects(item.translatedText || '').trim();
        const origClean = cleanSoundEffects(item.originalText || '').trim();
        return transClean.length > 0 || origClean.length > 0;
      });
    }
  }

  return exportableItems
    .map((item) => {
      const timeHeader = `[${msToTimeSRT(item.startMs)} - ${msToTimeSRT(item.endMs)}]`;
      if (type === 'translated') {
        return `${timeHeader}\n${cleanSoundEffects(item.translatedText || '').trim()}`;
      } else if (type === 'original') {
        return `${timeHeader}\n${cleanSoundEffects(item.originalText || '').trim()}`;
      } else {
        const original = cleanSoundEffects(item.originalText || '').trim();
        const translated = cleanSoundEffects(item.translatedText || item.originalText || '').trim();
        return `${timeHeader}\n${translated}\n(${original})`;
      }
    })
    .join('\n\n');
}
