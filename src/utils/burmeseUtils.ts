/**
 * Burmese Digit Mapping
 */
const EN_TO_MY_DIGITS: Record<string, string> = {
  '0': '၀',
  '1': '၁',
  '2': '၂',
  '3': '၃',
  '4': '၄',
  '5': '၅',
  '6': '၆',
  '7': '၇',
  '8': '၈',
  '9': '၉',
};

const MY_TO_EN_DIGITS: Record<string, string> = {
  '၀': '0',
  '၁': '1',
  '၂': '2',
  '၃': '3',
  '၄': '4',
  '၅': '5',
  '၆': '6',
  '၇': '7',
  '၈': '8',
  '၉': '9',
};

/**
 * Convert Western numbers in text to Burmese digits
 */
export function toBurmeseDigits(text: string): string {
  if (!text) return text;
  return text.replace(/[0-9]/g, (digit) => EN_TO_MY_DIGITS[digit] || digit);
}

/**
 * Convert Burmese numbers in text to Western digits
 */
export function toEnglishDigits(text: string): string {
  if (!text) return text;
  return text.replace(/[၀-၉]/g, (digit) => MY_TO_EN_DIGITS[digit] || digit);
}

/**
 * Common Burmese subtitle punctuation quick inserts
 */
export const BURMESE_PUNCTUATION_HELPERS = [
  { label: 'ပုဒ်မ (။)', symbol: '။', description: 'End of sentence' },
  { label: 'ပုဒ်ကလေး (၊)', symbol: '၊', description: 'Pause / Comma' },
  { label: '၏', symbol: '၏', description: 'Possessive / Sentence end' },
  { label: '၍', symbol: '၍', description: 'Conjunction / And' },
  { label: '၌', symbol: '၌', description: 'At / In location' },
  { label: 'ကြောင့်', symbol: 'ကြောင့်', description: 'Because / Reason' },
  { label: 'ဖြစ်သည်', symbol: 'ဖြစ်သည်။', description: 'Is / State' },
  { label: 'ပါသည်', symbol: 'ပါသည်။', description: 'Polite ending' },
];

/**
 * Comprehensive Default Myanmar Translation Dictionary / Glossary
 */
export const DEFAULT_GLOSSARY_TERMS = [
  // Tech & Sci-Fi
  { id: '1', original: 'AI', target: 'အေအိုင် (AI)' },
  { id: '2', original: 'Subtitles', target: 'စာတန်းထိုး' },
  { id: '3', original: 'Server', target: 'ဆာဗာ' },
  { id: '4', original: 'System', target: 'စနစ်' },
  { id: '5', original: 'Quantum', target: 'ကွမ်တမ်' },
  { id: '6', original: 'Robot', target: 'ရိုဘော့' },
  { id: '7', original: 'Satellite', target: 'ဂြိုဟ်တု' },
  { id: '8', original: 'Portal', target: 'စကြဝဠာတံခါး' },
  { id: '9', original: 'Multiverse', target: 'မာတီဗာစ် (ပြိုင်ဘက်စကြဝဠာ)' },
  { id: '10', original: 'Timeline', target: 'အချိန်ကာလလိုင်း' },
  { id: '11', original: 'Database', target: 'ဒေတာဘေ့စ်' },
  { id: '12', original: 'Protocol', target: 'ပရိုတိုကော' },
  { id: '13', original: 'Encryption', target: 'အက္ခရာဝှက်စနစ်' },
  { id: '14', original: 'Network', target: 'ကွန်ရက်' },
  { id: '15', original: 'Cyber', target: 'ဆိုက်ဘာ' },

  // Titles, Roles & Ranks
  { id: '16', original: 'Captain', target: 'ကပ္ပတိန်' },
  { id: '17', original: 'Doctor', target: 'ဒေါက်တာ' },
  { id: '18', original: 'Professor', target: 'ပါမောက္ခ' },
  { id: '19', original: 'Agent', target: 'အေးဂျင့်' },
  { id: '20', original: 'Commander', target: 'ကွန်မန်းဒါ' },
  { id: '21', original: 'Director', target: 'ဒါရိုက်တာ' },
  { id: '22', original: 'Officer', target: 'အရာရှိ' },
  { id: '23', original: 'Boss', target: 'ဘော့စ်' },
  { id: '24', original: 'Sir', target: 'ဆာ' },
  { id: '25', original: 'Madam', target: 'မက်ဒမ်' },

  // Agencies & Organizations
  { id: '26', original: 'FBI', target: 'အက်ဖ်ဘီအိုင် (FBI)' },
  { id: '27', original: 'CIA', target: 'စီအိုင်အေ (CIA)' },
  { id: '28', original: 'NASA', target: 'နာဆာ (NASA)' },

  // Common Movie Terms & Idioms
  { id: '32', original: 'Piece of cake', target: 'လွယ်လွယ်လေးပါ' },
  { id: '33', original: 'Cut it out', target: 'တော်လိုက်တော့' },
  { id: '34', original: 'I am on it', target: 'ငါကြည့်လုပ်လိုက်မယ်' },
  { id: '35', original: 'No way', target: 'မဖြစ်နိုင်တာ' },
  { id: '36', original: 'Are you kidding', target: 'စနေတာလား' },
  { id: '37', original: 'What is up', target: 'ဘာထူးလဲ' },
  { id: '38', original: 'Hang in there', target: 'ကြံ့ကြံ့ခံထားပါ' },
  { id: '39', original: 'Take it easy', target: 'စိတ်အေးအေးထားပါ' },
  { id: '40', original: 'Copy that', target: 'လက်ခံရရှိပါတယ်' },
];

/**
 * Clean sound effects, audio cues, panting/sighing noise words from subtitle text
 */
export function cleanSoundEffects(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove parenthesized & bracketed noise descriptions: (pant), [screaming], (gasp), [music], ( laughter ), （ဟောဟဲသံ）, etc.
  cleaned = cleaned.replace(/[\(\[\{\（\【][^\)\}\]\）\】]*[\)\}\]\）\】]/gi, '');

  // 2. Remove common panting / sound noise words in Burmese
  const soundNoisePatterns = [
    /ဟောဟဲ[\.\,\-\_\s\…\‥\~]*/gi,
    /အဟွတ်[\.\,\-\_\s\…\‥\~]*/gi,
    /အဟမ်း[\.\,\-\_\s\…\‥\~]*/gi,
    /အင်း+[\.\,\-\_\s\…\‥\~]*/gi,
    /အိန်း+[\.\,\-\_\s\…\‥\~]*/gi,
    /ဟားဟား+[\.\,\-\_\s\…\‥\~]*/gi,
    /ဝိုး+[\.\,\-\_\s\…\‥\~]*/gi,
  ];

  for (const pattern of soundNoisePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 3. Clean up leftover trailing punctuation/spaces
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/^[\s\.\,\-\…\‥\~\:\;]+|[\s\.\,\-\…\‥\~\:\;]+$/g, '')
    .trim();

  return cleaned;
}
