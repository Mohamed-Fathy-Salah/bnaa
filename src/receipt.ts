import type { ID } from './types';

/** Gemini API keys look like "AIza" followed by 35 characters. */
export const looksLikeKey = (s: string) => /^AIza[\w-]{35}$/.test(s.trim());

/** Kept outside AppData so it never ends up in an exported backup file. */
const KEY_STORAGE = 'bnaa:gemini-key';
const MODEL = 'gemini-3.5-flash-lite';
/** Where people create a free Gemini API key. */
export const KEY_URL = 'https://aistudio.google.com/apikey';
const MAX_IMAGE_SIDE = 2000;
const MAX_PDF_BYTES = 15 * 1024 * 1024;

export const getApiKey = (): string => {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
};

export const setApiKey = (key: string) => {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch (e) {
    console.error(e);
  }
};

export type CostKind = 'material' | 'worker';

export interface ReceiptLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  kind: CostKind;
  /** suggested flat step, '' when unsure */
  stepId: ID | '';
}

export interface ReceiptResult {
  vendor: string;
  date: string;
  total: number;
  lines: ReceiptLine[];
}

export interface StepHint {
  id: ID;
  name: string;
  materials: string[];
}

export type ScanErrorCode = 'noKey' | 'badKey' | 'rateLimit' | 'refused' | 'unreadable' | 'tooLarge' | 'network' | 'other';

export class ScanError extends Error {
  constructor(
    public code: ScanErrorCode,
    message: string = code,
  ) {
    super(message);
  }
}

type Part = { inlineData: { mimeType: 'image/jpeg' | 'application/pdf'; data: string } };

const toBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Phone photos are often 4000px+; shrink them to a size that is still easy to read and quick to upload. */
async function imageToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ScanError('other', 'canvas unavailable');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

async function toPart(file: File): Promise<Part> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new ScanError('tooLarge');
    return { inlineData: { mimeType: 'application/pdf', data: toBase64(await file.arrayBuffer()) } };
  }
  return { inlineData: { mimeType: 'image/jpeg', data: await imageToJpeg(file) } };
}

const NO_STEP = 'none';

const schema = (stepIds: ID[]) => ({
  type: 'object',
  required: ['readable', 'vendor', 'date', 'total', 'lines'],
  properties: {
    readable: { type: 'boolean', description: 'false if the files are not a receipt/invoice or cannot be read' },
    vendor: { type: 'string', description: 'shop or supplier name, "" if not shown' },
    date: { type: 'string', description: 'receipt date as yyyy-mm-dd, "" if not shown' },
    total: { type: 'number', description: 'grand total printed on the receipt, 0 if not shown' },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        required: ['description', 'quantity', 'unitPrice', 'total', 'kind', 'stepId'],
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number', description: '0 if not shown' },
          unitPrice: { type: 'number', description: '0 if not shown' },
          total: { type: 'number', description: 'amount paid for this line; negative for discounts' },
          kind: { type: 'string', enum: ['material', 'worker'] },
          stepId: { type: 'string', enum: [...stepIds, NO_STEP] },
        },
      },
    },
  },
});

const instructions = (steps: StepHint[], currency: string) => `Extract the line items from this receipt or invoice for a flat finishing project in Egypt.

The receipt may be printed or handwritten, in Arabic, English or both, and may span several photos or pages: treat all files as one receipt.
- Convert Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to normal numbers. Amounts are in ${currency || 'the local currency'}.
- One entry per purchased item or service. If a line shows only quantity and unit price, compute its total; if it shows only a total, set unit price and quantity to 0 unless they are obvious.
- Include delivery, transport and loading charges as their own lines, and discounts as negative totals. Do not add a line for the grand total, subtotals or taxes already included in the line amounts; add tax as its own line only when it is charged on top.
- kind is "worker" for labour or workmanship (مصنعية, أجرة, عمالة, تركيب) and "material" for everything else, including delivery.
- stepId: the id of the finishing step below this line most likely belongs to, or "none" if none fits or you are unsure.
- Keep descriptions short, in the receipt's language.
- If the files are not a receipt or are unreadable, set readable to false and return no lines.

Steps of this flat:
${steps.map((s) => `- id "${s.id}": ${s.name}${s.materials.length ? ` (materials: ${s.materials.join(', ')})` : ''}`).join('\n') || '(none)'}`;

export async function scanReceipt(files: File[], steps: StepHint[], currency: string): Promise<ReceiptResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new ScanError('noKey');
  const parts = await Promise.all(files.map(toPart));

  // Loaded on demand so the SDK is only downloaded by people who scan receipts.
  const { GoogleGenAI, ApiError, FinishReason } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  let res;
  try {
    res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [...parts, { text: instructions(steps, currency) }] }],
      config: { responseMimeType: 'application/json', responseJsonSchema: schema(steps.map((s) => s.id)) },
    });
  } catch (e) {
    if (e instanceof ApiError) {
      // An invalid key comes back as 400 API_KEY_INVALID rather than 401.
      if (e.status === 401 || e.status === 403 || /API.?KEY/i.test(e.message)) throw new ScanError('badKey', e.message);
      if (e.status === 429) throw new ScanError('rateLimit', e.message);
      throw new ScanError('other', e.message);
    }
    if (e instanceof TypeError) throw new ScanError('network', e.message);
    throw e;
  }

  const finish = res.candidates?.[0]?.finishReason;
  if (res.promptFeedback?.blockReason || finish === FinishReason.SAFETY) throw new ScanError('refused');
  if (finish === FinishReason.MAX_TOKENS) throw new ScanError('other', 'response was cut off');
  if (!res.text) throw new ScanError('other', 'empty response');
  const out = JSON.parse(res.text) as ReceiptResult & { readable: boolean };
  if (!out.readable || !out.lines?.length) throw new ScanError('unreadable');
  return {
    vendor: out.vendor,
    date: out.date,
    total: out.total,
    lines: out.lines.map((l) => ({ ...l, stepId: l.stepId === NO_STEP ? '' : l.stepId })),
  };
}
