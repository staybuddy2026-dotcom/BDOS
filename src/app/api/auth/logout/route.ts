import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST() {
  await AuthService.endSession();
  return NextResponse.json({ success: true }, { status: 200 });
}

/** Used for redirects when a session cookie is still valid but its account is gone or deactivated. */
export async function GET(request: NextRequest) {
  await AuthService.endSession();
  return NextResponse.redirect(new URL('/', request.url));
}
