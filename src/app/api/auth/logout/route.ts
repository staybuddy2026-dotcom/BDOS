import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', {
    httpOnly: true,
    expires: new Date(0), // Expire immediately
    path: '/',
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
