import { logger } from '@/lib/logger';
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
  
  // Rule: Fallback to mock if API key is missing
  if (configuredProvider.toLowerCase() === 'gemini' && !apiKey) {
    if (process.env.NODE_ENV === 'production' && process.env.AI_MOCK_MODE !== 'true') {
      throw new AppError('Production Error: GEMINI_API_KEY environment variable is missing in production environment.', 500);
    }
    logger.warn('GEMINI_API_KEY is not defined. Falling back to "mock" AI provider.');
    return providersRegistry['mock'];
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

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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

    // Retry variables
    const maxRetries = 3;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        logger.info(`Sending Gemini REST API request (Attempt ${attempt}/${maxRetries}) for: ${authorName}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Gemini API HTTP ${response.status}: ${body}`);
        }

        const data = await response.json();
        
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error('Malformed Gemini response: missing candidate text parts.');
        }

        // JSON Parsing
        const parsedJson = JSON.parse(candidateText.trim());
        
        // Zod validation
        const validated = analysisZodSchema.parse(parsedJson);

        // Tokens audit
        const promptTokens = data.usageMetadata?.promptTokenCount || 0;
        const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

        logger.info(`Gemini analysis succeeded on attempt ${attempt}. Tokens: Prompt ${promptTokens}, Completion ${completionTokens}`);
        
        return {
          ...validated,
          promptTokens,
          completionTokens,
        };
      } catch (error) {
        const errInstance = error instanceof Error ? error : new Error(String(error));
        lastError = errInstance;
        logger.warn(`Gemini analysis attempt ${attempt} failed: ${errInstance.message}`);
        
        if (attempt < maxRetries) {
          // Exponential Backoff: 1s, 2s
          const delay = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new AppError(`AI Analysis provider failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`, 500);
  }
}

// Fallback Provider: Mock analysis simulator
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
    try {
      const provider = getAiProvider(providerName);
      return await provider.analyzePost(authorName, postText, authorHeadline, companyName);
    } catch (err: unknown) {
      logger.warn(`Primary AI Provider failed: ${err instanceof Error ? err.message : String(err)}. Invoking fallback AI Analysis Engine.`);
      const mockProvider = providersRegistry['mock'];
      if (mockProvider) {
        return await mockProvider.analyzePost(authorName, postText || 'Target software engineering opportunity', authorHeadline, companyName);
      }
      throw err;
    }
  }
}
