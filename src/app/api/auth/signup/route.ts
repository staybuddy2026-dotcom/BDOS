import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // In a real app, you would hash the password (e.g. using bcrypt) 
    // and save the new user to your database here.
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // For now, we simulate a successful signup by immediately logging them in
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionPayload = {
      email,
      name: name || 'New User',
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

    return NextResponse.json({ success: true, message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
