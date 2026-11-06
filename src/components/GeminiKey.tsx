import { useEffect, useState } from 'react';
import { getApiKey, KEY_URL, looksLikeKey, setApiKey } from '../receipt';
import { useStore } from '../store';

const readClipboard = async (): Promise<string> => {
  try {
    return (await navigator.clipboard?.readText?.()) ?? '';
  } catch {
    return '';
  }
};

/**
 * Gets a Gemini API key from the user with as little typing as possible:
 * open AI Studio, copy the key there, and it is picked up from the clipboard on return.
 */
export default function GeminiKey({ onChange }: { onChange?: (key: string) => void }) {
  const { t } = useStore();
  const [key, setKey] = useState(getApiKey);
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const canPaste = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText);

  const save = (k: string) => {
    setApiKey(k);
    setKey(k);
    setDraft('');
    setWaiting(false);
    onChange?.(k);
  };

  // After the user copies the key in AI Studio and comes back, try the clipboard.
  // Browsers that need a click for clipboard access just fall back to the Paste button.
  useEffect(() => {
    if (!waiting) return;
    const onFocus = async () => {
      const text = (await readClipboard()).trim();
      if (looksLikeKey(text)) save(text);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [waiting]);

  if (key)
    return (
      <div className="row-inline">
        <span>✓ {t('receipt.keySaved', { end: key.slice(-4) })}</span>
        <button className="btn small danger" onClick={() => save('')}>{t('receipt.keyRemove')}</button>
      </div>
    );

  const valid = looksLikeKey(draft);
  return (
    <div>
      <ol className="steps-list">
        <li>
          <a className="btn primary" href={KEY_URL} target="_blank" rel="noopener noreferrer" onClick={() => setWaiting(true)}>
            {t('receipt.getKey')} ↗
          </a>
          <div className="hint">{t('receipt.getKeyHint')}</div>
        </li>
        <li>
          <div className="row-inline">
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="AIza…"
              aria-label={t('receipt.apiKey')}
              value={draft}
              onChange={(e) => setDraft(e.target.value.trim())}
            />
            {canPaste && (
              <button
                className="btn"
                onClick={async () => {
                  const text = (await readClipboard()).trim();
                  if (looksLikeKey(text)) save(text);
                  else setDraft(text);
                }}
              >
                📋 {t('receipt.paste')}
              </button>
            )}
            <button className="btn" disabled={!valid} onClick={() => save(draft)}>{t('common.save')}</button>
          </div>
          {draft && !valid && <div className="hint warn-text">{t('receipt.keyInvalid')}</div>}
        </li>
      </ol>
    </div>
  );
}
