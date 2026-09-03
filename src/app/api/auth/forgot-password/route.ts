import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { logError } from '@/lib/error-log';
import crypto from 'crypto';

// POST /api/auth/forgot-password — Request password reset
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
    }

    // Find user by email
    const user = await db.user.findFirst({
      where: { email: email.toLowerCase(), isActive: true },
      select: { id: true, email: true, name: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ 
        message: 'Jika email terdaftar, link reset password akan dikirim.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in user record (using existing fields or new ones)
    // For now, we'll use a simple approach with sessionToken field
    await db.user.update({
      where: { id: user.id },
      data: {
        sessionToken: resetToken,
        sessionExpiresAt: resetExpires,
      },
    });

    // In production, send email with reset link
    // For now, return token in response (for development)
    console.log(`[PASSWORD RESET] Token for ${user.email}: ${resetToken}`);
    console.log(`[PASSWORD RESET] Reset link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);

    return NextResponse.json({ 
      message: 'Jika email terdaftar, link reset password akan dikirim.',
      // Development only - remove in production
      ...(process.env.NODE_ENV !== 'production' && { 
        debug: { 
          token: resetToken,
          resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}` 
        }
      }),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Gagal memproses permintaan' }, { status: 500 });
  }
}
