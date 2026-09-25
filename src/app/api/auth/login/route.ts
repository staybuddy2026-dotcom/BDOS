import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // In a real app, verify email and password against the database here
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Creating the session payload
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionPayload = {
      email,
      role: 'bde',
      expires: expires.getTime(),
    };

    // Encrypt the session
    const sessionToken = await encrypt(sessionPayload);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expires,
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
