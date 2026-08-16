/**
 * Auto-detect external quiz provider from URL domain
 */
export function detectExternalProvider(url: string): string {
  if (!url) return 'Tautan Lain';
  const lower = url.toLowerCase().trim();

  // Google Forms
  if (lower.includes('docs.google.com/forms') || lower.includes('forms.gle')) return 'Google Form';
  // Quizizz
  if (lower.includes('quizizz.com')) return 'Quizizz';
  // Kahoot
  if (lower.includes('kahoot.it') || lower.includes('kahoot.com')) return 'Kahoot';
  // Wordwall
  if (lower.includes('wordwall.net')) return 'Wordwall';
  // Quizlet
  if (lower.includes('quizlet.com')) return 'Quizlet';
  // Gimkit
  if (lower.includes('gimkit.com')) return 'Gimkit';
  // Blooket
  if (lower.includes('blooket.com')) return 'Blooket';
  // Proprofs
  if (lower.includes('proprofs.com')) return 'ProProfs';
  // Microsoft Forms
  if (lower.includes('forms.office.com') || lower.includes('forms.microsoft.com')) return 'Microsoft Forms';

  return 'Tautan Lain';
}

/**
 * Provider icon mapping (emoji fallback)
 */
export const PROVIDER_ICONS: Record<string, { emoji: string; color: string }> = {
  'Google Form':     { emoji: '📋', color: 'bg-blue-100 text-blue-700' },
  'Quizizz':         { emoji: '🎮', color: 'bg-emerald-100 text-emerald-700' },
  'Kahoot':          { emoji: '🔴', color: 'bg-red-100 text-red-700' },
  'Wordwall':        { emoji: '🧩', color: 'bg-sky-100 text-sky-700' },
  'Quizlet':         { emoji: '📖', color: 'bg-violet-100 text-violet-700' },
  'Gimkit':          { emoji: '🎮', color: 'bg-teal-100 text-teal-700' },
  'Blooket':         { emoji: '🃏', color: 'bg-pink-100 text-pink-700' },
  'Microsoft Forms': { emoji: '📝', color: 'bg-indigo-100 text-indigo-700' },
  'ProProfs':        { emoji: '📊', color: 'bg-amber-100 text-amber-700' },
  'Tautan Lain':     { emoji: '🔗', color: 'bg-gray-100 text-gray-700' },
};

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
