/**
 * Persistent error logging utility.
 * Writes errors to DB (ErrorLog table) so they survive server restarts.
 * Falls back to console.error if DB write fails.
 */

import { db } from '@/lib/db';

interface LogErrorOptions {
  error: Error | unknown;
  route?: string;
  method?: string;
  userId?: string;
  schoolId?: string;
  statusCode?: number;
  body?: string;
}

/**
 * Log an error to the persistent ErrorLog table.
 * Fire-and-forget: errors during logging itself are swallowed to avoid loops.
 */
export async function logError(opts: LogErrorOptions): Promise<void> {
  try {
    const message = opts.error instanceof Error
      ? opts.error.message
      : String(opts.error);

    const stack = opts.error instanceof Error
      ? opts.error.stack?.substring(0, 2000) // truncate long stacks
      : undefined;

    const truncatedBody = opts.body
      ? opts.body.substring(0, 500)
      : undefined;

    await db.errorLog.create({
      data: {
        level: opts.statusCode && opts.statusCode >= 500 ? (opts.statusCode >= 500 ? 'error' : 'warn') : 'error',
        message: message.substring(0, 1000),
        stack,
        route: opts.route,
        method: opts.method,
        userId: opts.userId,
        schoolId: opts.schoolId,
        statusCode: opts.statusCode,
        body: truncatedBody,
      },
    });
  } catch (loggingError) {
    // Never let error logging crash the request handler
    console.error('[ErrorLog] Failed to persist error:', loggingError);
  }
}

/**
 * Wrapper for API route catch blocks.
 * Usage: catch (error) { return handleApiError(error, { route: '/api/foo', method: 'POST' }); }
 */
export function handleApiError(
  error: unknown,
  opts: { route?: string; method?: string; userId?: string; schoolId?: string; statusCode?: number; body?: string }
): { json: Record<string, unknown>; status: number } {
  const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';
  const status = opts.statusCode || 500;

  // Log asynchronously (fire-and-forget)
  logError({
    error,
    route: opts.route,
    method: opts.method,
    userId: opts.userId,
    schoolId: opts.schoolId,
    statusCode: status,
    body: opts.body,
  });

  return {
    json: { error: message },
    status,
  };
}
