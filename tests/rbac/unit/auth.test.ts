import { describe, test, expect } from 'bun:test';
import {
  hashPassword,
  verifyPassword,
  createSession,
  verifySession,
  AuthError,
} from '@/lib/auth';

describe('password hashing', () => {
  test('hash + verify bcrypt roundtrip', async () => {
    const hash = await hashPassword('Secret123!');
    expect(hash.startsWith('$')).toBe(true);
    expect(await verifyPassword('Secret123!', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('JWT session', () => {
  test('create and verify session', async () => {
    const token = await createSession({
      id: 'user_1',
      role: 'GURU',
      schoolId: 'school_1',
    });
    const payload = await verifySession(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe('user_1');
    expect(payload!.role).toBe('GURU');
    expect(payload!.schoolId).toBe('school_1');
  });

  test('invalid token returns null', async () => {
    expect(await verifySession('not.a.valid.jwt')).toBeNull();
  });
});

describe('AuthError', () => {
  test('carries status', () => {
    const err = new AuthError('Forbidden', 403);
    expect(err.status).toBe(403);
    expect(err.message).toBe('Forbidden');
  });
});
