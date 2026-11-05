/* ==========================================================================
   AI reply parsing
   The backend returns plain text with explicit "[Actual Data]" and
   "[AI Suggestion]" markers so calculated figures are always visibly
   separated from model suggestions. This module turns that text into
   structured segments the UI can render with different emphasis.
   ========================================================================== */

const SECTION_RE = /\[(Actual Data|Actual Figures|Data|AI Suggestion|AI Recommendation|AI Observation|AI Analysis)\]/gi;

const SUGGESTION_LABELS = {
  'ai suggestion': 'Suggestion',
  'ai recommendation': 'Recommendation',
  'ai observation': 'Observation',
  'ai analysis': 'Analysis',
};

const DATA_LABELS = {
  'actual data': 'Verified figures',
  'actual figures': 'Verified figures',
  data: 'Verified figures',
};

/**
 * Split an AI reply into ordered segments.
 * @returns [{ kind: 'data' | 'suggestion' | 'text', label, body }]
 */
export function parseAiReply(text = '') {
  if (!text) return [];
  const raw = String(text);

  // Normalise the marker spellings the demo engine may emit.
  const normalised = raw
    .replace(/\[AI Recommendation\]/gi, '[AI Suggestion]')
    .replace(/\[Actual Figures\]/gi, '[Actual Data]')
    .replace(/\[AI Observation\]/gi, '[AI Suggestion]')
    .replace(/\[AI Analysis\]/gi, '[AI Suggestion]');

  const matches = [...normalised.matchAll(SECTION_RE)];
  if (!matches.length) {
    return [{ kind: 'text', label: '', body: normalised.trim() }].filter((s) => s.body);
  }

  const segments = [];
  const preamble = normalised.slice(0, matches[0].index).trim();
  if (preamble) segments.push({ kind: 'text', label: '', body: preamble });

  matches.forEach((m, i) => {
    const marker = m[1].toLowerCase();
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalised.length;
    const body = normalised.slice(start, end).trim();
    if (!body) return;
    const kind = SUGGESTION_LABELS[marker] ? 'suggestion' : 'data';
    segments.push({
      kind,
      label: SUGGESTION_LABELS[marker] || DATA_LABELS[marker] || 'Verified figures',
      body,
    });
  });

  return segments;
}

/** Suggested prompts offered in the chat surfaces. */
export const AI_SUGGESTIONS = [
  'How much did I spend this month?',
  'What is my biggest expense category?',
  'Compare this month with last month',
  'Am I exceeding my budget?',
  'How much money can I save?',
  'What are my biggest recurring expenses?',
  'Show my spending trends',
  'Give suggestions to reduce unnecessary expenses',
];
