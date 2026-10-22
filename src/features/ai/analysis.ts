import { logger } from '@/lib/logger';
import { AiUnavailableError, geminiGenerate } from '@/lib/gemini';
import { AppError } from '@/lib/errors';
import { z } from 'zod';

export interface AnalysisResult {
  summary: string;
  buyingSignals: string[];
  opportunityScore: number;
  suggestedOutreachAngle: string;
  valueReason: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface IAiAnalysisProvider {
  name: string;
  analyzePost(
    authorName: string,
    postText: string,
    authorHeadline?: string,
    companyName?: string
  ): Promise<AnalysisResult>;
}

// Zod schema for validation
export const analysisZodSchema = z.object({
  summary: z.string().min(1, 'Summary cannot be empty'),
  buyingSignals: z.array(z.string()).min(1, 'At least one buying signal is required'),
  opportunityScore: z.number().int().min(0).max(100),
  suggestedOutreachAngle: z.string().min(1, 'Suggested outreach angle cannot be empty'),
  valueReason: z.string().min(1, 'Value reason explanation is required'),
});

const providersRegistry: Record<string, IAiAnalysisProvider> = {};

export function registerAiProvider(provider: IAiAnalysisProvider) {
  providersRegistry[provider.name.toLowerCase()] = provider;
  logger.info(`Registered AI analysis provider: ${provider.name}`);
}

export function getAiProvider(name?: string): IAiAnalysisProvider {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const configuredProvider = name || process.env.AI_PROVIDER || 'gemini';
  
  // Without an API key there is no real analysis. The keyword-based stand-in is only used when it is asked for
  // explicitly (AI_MOCK_MODE=true, e.g. for tests); otherwise say so instead of showing made-up scores.
  if (configuredProvider.toLowerCase() === 'gemini' && !apiKey) {
    if (process.env.AI_MOCK_MODE === 'true') return providersRegistry['mock'];
    throw new AppError('AI analysis is not set up: add GEMINI_API_KEY to the server settings.', 503);
  }

  const provider = providersRegistry[configuredProvider.toLowerCase()];
  if (!provider) {
    throw new AppError(`AI provider "${configuredProvider}" is not registered.`, 500);
  }
  return provider;
}

// Concrete Provider: Gemini REST API Client
class GeminiAiProvider implements IAiAnalysisProvider {
  public readonly name = 'gemini';

  async analyzePost(
    authorName: string,
    postText: string,
    authorHeadline?: string,
    companyName?: string
  ): Promise<AnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      throw new AppError('GEMINI_API_KEY environment variable is missing.', 500);
    }

    // Input safety check
    if (!postText.trim()) {
      throw new AppError('Cannot analyze empty post content.', 400);
    }

    const systemPrompt = `You are a Lead Scoring AI assistant. Analyze the following LinkedIn post content and metadata from ${authorName} to assess the opportunity score (0 to 100) indicating if they are a candidate for targeted software growth and consulting solutions.
High score factors: active issues with scaling software, SaaS client retention/churn, automation pipeline difficulties, custom AI agent latency bottlenecks, software stack upgrades, or seeking professional software engineers.
Low score factors: casual personal news, generic memes, non-technical hiring, updates unrelated to software or product workflows.

Explain the reasoning clearly in "valueReason" so the user can understand exactly why this post received its score. Output results in structured JSON format matching the schema requested.`;

    const promptText = `
Author: ${authorName}
Headline: ${authorHeadline || 'N/A'}
Company: ${companyName || 'N/A'}

Post Content:
"${postText}"
`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemPrompt + '\n\n' + promptText,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            summary: {
              type: 'STRING',
              description: 'A 1-2 sentence concise summary of the post and author intention.',
            },
            buyingSignals: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'List of 2-4 short buying signals/need labels (e.g. "AI integration", "Scale bottleneck").',
            },
            opportunityScore: {
              type: 'INTEGER',
              description: 'An opportunity score (integer between 0 and 100). Higher is better alignment.',
            },
            suggestedOutreachAngle: {
              type: 'STRING',
              description: 'A custom, helpful outreach theme matching the context.',
            },
            valueReason: {
              type: 'STRING',
              description: 'Clear, explainable logic explaining why the opportunity received its score.',
            },
          },
          required: ['summary', 'buyingSignals', 'opportunityScore', 'suggestedOutreachAngle', 'valueReason'],
        },
      },
    };

    try {
      const result = await geminiGenerate(requestBody, { label: `post analysis for ${authorName}` });
      const validated = analysisZodSchema.parse(JSON.parse(result.text));
      logger.info(`Gemini analysis done with ${result.model}. Tokens: prompt ${result.promptTokens}, completion ${result.completionTokens}`);
      return { ...validated, promptTokens: result.promptTokens, completionTokens: result.completionTokens };
    } catch (error) {
      if (error instanceof AiUnavailableError) throw new AppError(error.message, 503);
      // The model answered, but not in the requested shape.
      logger.warn(`Gemini analysis answer could not be read: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError('The AI returned an unreadable analysis. Please try again.', 502);
    }
  }
}

// Test-only provider (AI_MOCK_MODE=true in tests/setup.ts). Never used as a fallback for real posts:
// its fixed wording would be saved as if the AI had read the post.
class MockAiAnalysisProvider implements IAiAnalysisProvider {
  public readonly name = 'mock';

  async analyzePost(
    authorName: string,
    postText: string
  ): Promise<AnalysisResult> {
    logger.info(`Invoking fallback Mock AI post analysis for: ${authorName}`);
    
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const content = postText.toLowerCase();
    
    let summary = '';
    let buyingSignals: string[] = [];
    let opportunityScore = 70;
    let suggestedOutreachAngle = '';
    let valueReason = '';

    if (content.includes('ai') || content.includes('gpt') || content.includes('llm')) {
      summary = `The author details their experiences installing LLM logic in development teams.`;
      buyingSignals = ['AI Integrations', 'Latency Bottlenecks'];
      opportunityScore = 90;
      suggestedOutreachAngle = 'Focus on caching layers to speed up LLM prompts.';
      valueReason = 'High score (90) because the author complains about LLM response lags, which fits our system design expertise.';
    } else {
      summary = `General business discussions on growth roadmap settings.`;
      buyingSignals = ['Consultative Audit'];
      opportunityScore = 75;
      suggestedOutreachAngle = 'Review their development path and project structures.';
      valueReason = 'Medium score (75) as it is a general update about roadmap planning without specific technical complaints.';
    }

    return {
      summary,
      buyingSignals,
      opportunityScore,
      suggestedOutreachAngle,
      valueReason,
      promptTokens: 250,
      completionTokens: 85,
    };
  }
}

// Register both providers
registerAiProvider(new GeminiAiProvider());
registerAiProvider(new MockAiAnalysisProvider());

export class AiAnalysisService {
  /**
   * Run structured AI analysis against the post using the active provider with automatic fallback
   */
  static async analyzePost(
    authorName: string,
    postText: string,
    authorHeadline?: string,
    companyName?: string,
    providerName?: string
  ): Promise<AnalysisResult> {
    // No made-up fallback: when the AI cannot answer, the caller shows that and the user retries.
    const provider = getAiProvider(providerName);
    return provider.analyzePost(authorName, postText, authorHeadline, companyName);
  }
}
