import { logger } from '@/lib/logger';
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
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    // Rule: Fallback to mock generator if API key is missing
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY is not defined. Falling back to mock outreach generator.');
      return this.generateMockDraft(params);
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
      logger.info(`Sending Gemini API request for outreach draft to prospect: ${params.authorName}`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textPart) {
        throw new Error('Malformed Gemini response: missing candidates parts.');
      }

      const parsed = JSON.parse(textPart.trim());
      const validated = outreachZodSchema.parse(parsed);

      return validated.draft;
    } catch (error) {
      logger.error(`Outreach generation failed for ${params.authorName}`, error);
      // Fallback to mock instead of crashing if the API has transient issues
      logger.warn('Falling back to mock outreach generator due to API error.');
      return this.generateMockDraft(params);
    }
  }

  /**
   * Generates a conversational mock outreach draft if API is unavailable.
   */
  private static generateMockDraft(params: {
    authorName: string;
    authorHeadline?: string;
    postPreview: string;
    suggestedAngle?: string;
    stepObjective?: string;
  }): string {
    const firstName = params.authorName.split(' ')[0] || params.authorName;
    const cleanAngle = params.suggestedAngle ? params.suggestedAngle.toLowerCase().replace(/\.$/, '') : 'share development strategies';
    const postSnippet = params.postPreview.substring(0, 70) + '...';

    return `Hi ${firstName},

I was reading your post about "${postSnippet}" and found your point about this interesting.

I notice that in ${params.authorHeadline ? params.authorHeadline.split('|')[0]?.trim() : 'your space'}, many teams hit similar issues. We've been looking at how to ${cleanAngle} to prevent these exact bottlenecks.

Are you open to exchanging insights on how you're solving this?

Best,
Akash`;
  }
}
