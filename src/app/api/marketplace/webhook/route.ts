import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { saveListing } from '@/features/marketplace/store';

/**
 * Inbound webhook for project listings (Zapier, Make.com, n8n or any HTTP POST).
 *
 * Callers authenticate with the shared secret in MARKETPLACE_WEBHOOK_SECRET, sent as
 * `Authorization: Bearer <secret>` or `x-webhook-secret: <secret>`. Without that setting the
 * endpoint is switched off, so nobody can post listings into the team's feed.
 */

const SAMPLE_PAYLOAD = {
  title: 'Full-stack Next.js web application redesign',
  description: 'Seeking an agency to rebuild our customer portal with React and Node.js.',
  budget: '$25,000',
  budgetType: 'Fixed-Price',
  clientCountry: 'United States',
  technologyStack: ['Next.js', 'React', 'Node.js', 'PostgreSQL'],
  projectUrl: 'https://example.com/rfp/nextjs-redesign',
  source: 'Zapier',
};

function authorised(request: Request): boolean | null {
  const secret = process.env.MARKETPLACE_WEBHOOK_SECRET?.trim();
  if (!secret) return null;
  const given = request.headers.get('x-webhook-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
const list = (v: unknown) => (Array.isArray(v) ? v.map(str) : typeof v === 'string' ? v.split(',').map((x) => x.trim()) : []).filter(Boolean);

/** GET: how to call the endpoint, and whether it is switched on. */
export async function GET() {
  return NextResponse.json({
    status: process.env.MARKETPLACE_WEBHOOK_SECRET?.trim() ? 'ACTIVE' : 'DISABLED: set MARKETPLACE_WEBHOOK_SECRET to switch it on',
    endpoint: '/api/marketplace/webhook',
    method: 'POST',
    auth: 'Authorization: Bearer <MARKETPLACE_WEBHOOK_SECRET> (or the x-webhook-secret header)',
    required: ['title', 'description'],
    samplePayload: SAMPLE_PAYLOAD,
  });
}

export async function POST(request: Request) {
  const ok = authorised(request);
  if (ok === null) return NextResponse.json({ error: 'The webhook is switched off. Set MARKETPLACE_WEBHOOK_SECRET on the server.' }, { status: 503 });
  if (!ok) return NextResponse.json({ error: 'Missing or wrong webhook secret.' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'The body must be JSON.' }, { status: 400 });
  }

  const title = str(body.title ?? body.projectTitle ?? body.name ?? body.headline);
  const description = str(body.description ?? body.projectDescription ?? body.summary ?? body.details ?? body.body);
  if (!title || !description) {
    return NextResponse.json({ error: 'The payload needs "title" (or "projectTitle") and "description" (or "summary").' }, { status: 400 });
  }

  try {
    const budget = str(body.budget ?? body.price ?? body.rate);
    const result = await saveListing({
      providerId: 'webhook',
      providerName: str(body.source ?? body.providerName) || 'Inbound webhook',
      title,
      description,
      budget,
      budgetType: str(body.budgetType) === 'Hourly' || /\/\s*h(ou)?r/i.test(budget) ? 'Hourly' : 'Fixed-Price',
      country: str(body.clientCountry ?? body.country ?? body.location),
      technologyStack: list(body.technologyStack ?? body.skills),
      projectUrl: str(body.projectUrl ?? body.url ?? body.link),
      tags: ['Inbound webhook'],
    });
    logger.info(`Webhook listing ${result.isDuplicate ? 'already stored' : 'saved'}: '${title}'`);
    return NextResponse.json(
      { success: true, opportunityId: result.opportunity.id, isDuplicate: result.isDuplicate, fitScore: result.opportunity.aiOpportunityScore },
      { status: result.isDuplicate ? 200 : 201 },
    );
  } catch (err) {
    logger.error('Could not save a webhook listing', err);
    return NextResponse.json({ error: 'Could not save the listing. Please retry.' }, { status: 500 });
  }
}
