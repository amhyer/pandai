import crypto from 'crypto';

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL = UPPERCASE + LOWERCASE + DIGITS;

/**
 * Generate a secure random temporary password.
 * 12 chars: 3 upper + 3 lower + 3 digits + 3 random from all.
 * Excludes ambiguous chars: 0,O,1,l,I.
 */
export function generateTempPassword(): string {
  const arr = [
    ...pickRandom(UPPERCASE, 3),
    ...pickRandom(LOWERCASE, 3),
    ...pickRandom(DIGITS, 3),
    ...pickRandom(ALL, 3),
  ];
  // Shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

function pickRandom(chars: string, count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(chars[crypto.randomInt(0, chars.length)]);
  }
  return result;
}
