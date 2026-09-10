import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ingestInboundWebhookOpportunity } from '@/features/marketplace/ingestion';

/**
 * GET /api/marketplace/webhook
 * Health check & webhook endpoint specifications.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ACTIVE',
    service: 'BDOS Marketplace Inbound Webhook Receiver',
    endpoint: '/api/marketplace/webhook',
    method: 'POST',
    supportedIntegrations: ['Zapier', 'Make.com', 'n8n', 'Custom Webhooks', 'HTTP POST'],
    samplePayload: {
      title: 'Full-Stack Next.js 16 Web Application Redesign',
      description: 'Seeking software agency to rebuild enterprise portal with React 19 and Node.js microservices.',
      budget: '$25,000',
      budgetType: 'Fixed-Price',
      clientCountry: 'United States 🇺🇸',
      technologyStack: ['Next.js', 'React.js', 'Node.js', 'PostgreSQL'],
      projectUrl: 'https://example.com/rfp/nextjs-redesign',
      source: 'Zapier Webhook',
    },
  });
}

/**
 * POST /api/marketplace/webhook
 * Receive live inbound RFP opportunity from Zapier, Make.com, n8n, or custom webhook.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.info('Received inbound HTTP POST webhook opportunity', { title: body.title || body.projectTitle });

    // Validate required fields
    const title = body.title || body.projectTitle || body.name || body.headline;
    const description = body.description || body.projectDescription || body.summary || body.details || body.body;

    if (!title || !description) {
      return NextResponse.json(
        { 
          error: 'Missing required opportunity fields. Payload must include "title" (or "projectTitle") and "description" (or "summary").' 
        }, 
        { status: 400 }
      );
    }

    const techStack = Array.isArray(body.technologyStack) 
      ? body.technologyStack 
      : Array.isArray(body.skills)
        ? body.skills 
        : typeof body.technologyStack === 'string'
          ? body.technologyStack.split(',').map((s: string) => s.trim())
          : typeof body.skills === 'string'
            ? body.skills.split(',').map((s: string) => s.trim())
            : ['React.js', 'Node.js', 'TypeScript'];

    const result = await ingestInboundWebhookOpportunity({
      projectTitle: String(title),
      projectDescription: String(description),
      budget: String(body.budget || body.price || body.rate || '$15,000 – $25,000'),
      budgetType: (body.budgetType === 'Hourly' || String(body.budget).includes('/hr')) ? 'Hourly' : 'Fixed-Price',
      clientCountry: String(body.clientCountry || body.country || body.location || 'United States 🇺🇸'),
      technologyStack: techStack,
      projectUrl: String(body.projectUrl || body.url || body.link || 'https://bdos-webhook-ingest.local'),
      providerName: String(body.source || body.providerName || 'Zapier / Custom Webhook'),
    });

    return NextResponse.json({
      success: true,
      message: 'Inbound opportunity successfully ingested into BDOS Marketplace pipeline.',
      opportunityId: result.opportunity.id,
      aiOpportunityScore: result.opportunity.aiOpportunityScore,
      duplicateHash: result.opportunity.duplicateHash,
      isDuplicate: result.isDuplicate,
    }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid JSON payload';
    logger.error('Failed to process inbound webhook opportunity', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
