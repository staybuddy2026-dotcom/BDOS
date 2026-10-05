import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runAutomation } from '@/features/automation/run';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/run
 * Runs one automation pass (due outreach emails, morning summary). For hosts where the
 * in-process scheduler cannot run: call it every few minutes with
 * `Authorization: Bearer <CRON_SECRET>`. Disabled until CRON_SECRET is set.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not enabled. Set CRON_SECRET to use this endpoint.' }, { status: 404 });

  const given = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runAutomation());
  } catch (err) {
    logger.error('Cron automation run failed', err);
    return NextResponse.json({ error: 'Automation run failed.' }, { status: 500 });
  }
}
