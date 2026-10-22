import { logger } from '@/lib/logger';
import { getSenderIdentity } from '@/lib/sender';
import { AppError } from '@/lib/errors';
import { AiUnavailableError, geminiGenerate } from '@/lib/gemini';
import { z } from 'zod';

export const outreachZodSchema = z.object({
  draft: z.string().trim().min(10, 'Generated draft must have valid content'),
});

export class OutreachService {
  /**
   * Generates a personalized outreach message using Gemini REST API.
   * Merges post details, AI analysis score rationale, playbook objectives,
   * tone guidelines, and customized settings instructions.
   */
  static async generateDraft(params: {
    authorName: string;
    authorHeadline?: string;
    companyName?: string;
    postPreview: string;
    suggestedAngle?: string;
    valueReason?: string;
    playbookName: string;
    stepName: string;
    stepObjective?: string;
    stepTone?: string;
    stepInstructions?: string;
    settingsTones: {
      primary: string;
      secondary?: string;
      tertiary?: string;
    };
    userInstructions?: string;
  }): Promise<string> {
    // The fill-in template is only for the test suite. For real prospects a template would be saved and
    // sent as if the AI had written it for them, so a failed AI call is reported instead.
    if (process.env.AI_MOCK_MODE === 'true') return this.generateMockDraft(params, (await getSenderIdentity()).name);

    const promptTones = [
      params.settingsTones.primary,
      params.settingsTones.secondary,
      params.settingsTones.tertiary,
      params.stepTone,
    ].filter(Boolean);

    const systemPrompt = `You are a personalized sales copywriter generating natural, one-to-one LinkedIn outreach drafts.
Your objective is to generate an outreach draft for the author of a specific LinkedIn post, referencing their post content.

Writing Requirements:
- Sound human, conversational, and personalized.
- Address them by first name.
- Reference their specific post content and ideas.
- Tone guidelines: incorporate ${promptTones.join(', ')} style.
- NO hard selling, NO pressure, and NO sales pitches. Focus strictly on mutual networking, questions, or sharing simple insights.

CRITICAL: NEVER use these generic cliches or mass-outreach phrases:
- "Hope you're doing well" / "Hope this email finds you well"
- "I'd love to connect" / "Let's connect"
- "Quick call" / "Quick chat"
- "Leading software company" / "We specialize in"
- "Let's schedule a meeting" / "Book a time on my calendar"

Output results in structured JSON format matching the schema requested.`;

    const userPrompt = `
Prospect Info:
- Name: ${params.authorName}
- Headline: ${params.authorHeadline || 'N/A'}
- Company: ${params.companyName || 'N/A'}

LinkedIn Post Details:
- Post Preview: "${params.postPreview}"

Post Analysis Context:
- Recommended outreach angle: ${params.suggestedAngle || 'N/A'}
- Opportunity value reason: ${params.valueReason || 'N/A'}

Playbook Context:
- Active Playbook: ${params.playbookName}
- Current Sequence Step: ${params.stepName}
- Step Objective: ${params.stepObjective || 'Connect and start conversation'}
- Step Specific Instructions: ${params.stepInstructions || 'None'}

User Custom Instructions Override:
- ${params.userInstructions || 'None'}
`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemPrompt + '\n\n' + userPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            draft: {
              type: 'STRING',
              description: 'The personalized, human-sounding outreach draft message. No cliches allowed.',
            },
          },
          required: ['draft'],
        },
      },
    };

    try {
      const result = await geminiGenerate(requestBody, { label: `outreach draft for ${params.authorName}` });
      return outreachZodSchema.parse(JSON.parse(result.text)).draft;
    } catch (error) {
      logger.error(`Outreach generation failed for ${params.authorName}`, error);
      if (error instanceof AiUnavailableError) throw new AppError(error.message, 503);
      throw new AppError('The AI returned an unreadable draft. Please try again.', 502);
    }
  }

  /** Test-only draft (AI_MOCK_MODE=true), built from the post itself. */
  private static generateMockDraft(params: {
    authorName: string;
    authorHeadline?: string;
    postPreview: string;
    suggestedAngle?: string;
    stepObjective?: string;
  }, senderName: string): string {
    const firstName = params.authorName.split(' ')[0] || params.authorName;
    const cleanAngle = params.suggestedAngle ? params.suggestedAngle.toLowerCase().replace(/\.$/, '') : 'share development strategies';
    const postSnippet = params.postPreview.substring(0, 70) + '...';

    return `Hi ${firstName},

I was reading your post about "${postSnippet}" and found your point about this interesting.

I notice that in ${params.authorHeadline ? params.authorHeadline.split('|')[0]?.trim() : 'your space'}, many teams hit similar issues. We've been looking at how to ${cleanAngle} to prevent these exact bottlenecks.

Are you open to exchanging insights on how you're solving this?

Best,
${senderName}`;
  }
}
