import { NextResponse } from 'next/server';
import { createLogoutCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  const cookie = createLogoutCookie();
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  return response;
}
