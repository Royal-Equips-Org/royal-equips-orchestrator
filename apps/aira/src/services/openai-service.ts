/**
 * AIRA OpenAI Service - Real AI Integration with Unified Secret Management
 * 
 * This service demonstrates the unified OpenAI API pattern that should be used
 * across all agents and services in the Royal Equips ecosystem.
 */

import OpenAI from 'openai';

export interface AIRAResponse {
  content: string;
  agent_name: string;
  timestamp: string;
  tokens_used?: number;
  model?: string;
}

/**
 * Unified OpenAI Secret Resolution
 * This pattern should be used by all agents for consistent API key management
 */
// Helper: Validate OpenAI API key format (starts with "sk-" and is 51 chars, alphanumeric)
function isValidOpenAIKey(key: string): boolean {
  // OpenAI keys start with "sk-" and are typically 51 characters long: "sk-" + 48 alphanumeric chars.
  // Enforce strict format: starts with "sk-" and is exactly 51 characters, with only alphanumeric chars after "sk-".
  return typeof key === 'string' && /^sk-[A-Za-z0-9]{48}$/.test(key);
}

// Helper: Redact OpenAI key for logging (show prefix and last 4 chars)
function redactOpenAIKey(key: string): string {
  if (!key || key.length < 8) return '[redacted]';
  return key.slice(0, 7) + '...' + key.slice(-4);
}

async function getUnifiedOpenAIKey(): Promise<{ value: string; source: string } | null> {
  // Priority order: ENV → GitHub Secrets → Cloudflare → External
  
  // 1. Environment variable (primary)
  if (process.env.OPENAI_API_KEY && isValidOpenAIKey(process.env.OPENAI_API_KEY)) {
    return { value: process.env.OPENAI_API_KEY, source: 'env' };
  }
  
  // 2. GitHub Actions environment (for CI/CD)
  if (process.env.GITHUB_ACTIONS && process.env.GITHUB_OPENAI_KEY && isValidOpenAIKey(process.env.GITHUB_OPENAI_KEY)) {
    return { value: process.env.GITHUB_OPENAI_KEY, source: 'github' };
  }
  
  // 3. Cloudflare Workers environment
  if (process.env.CF_OPENAI_API_KEY && isValidOpenAIKey(process.env.CF_OPENAI_API_KEY)) {
    return { value: process.env.CF_OPENAI_API_KEY, source: 'cloudflare' };
  }
  
  // 4. Other environment patterns
  const alternativeKeys = ['OPENAI_TOKEN', 'AIRA_OPENAI_KEY', 'AI_API_KEY'];
  for (const key of alternativeKeys) {
    if (process.env[key] && isValidOpenAIKey(process.env[key]!)) {
      return { value: process.env[key]!, source: `env-${key.toLowerCase()}` };
    }
  }
  
  return null;
}

export class OpenAIService {
  private openai: OpenAI | null = null;
  private isConfigured = false;
  private secretSource = 'none';
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Lazy initialization to handle async secret resolution
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initialize();
    return this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    try {
      // Use unified secret resolution pattern
      const keyResult = await getUnifiedOpenAIKey();
      
      if (!keyResult) {
        console.warn('OpenAI API key not found in any source - AIRA will operate in fallback mode');
        return;
      }

      this.openai = new OpenAI({
        apiKey: keyResult.value,
        timeout: 30000,
        maxRetries: 2
      });
      this.isConfigured = true;
      this.secretSource = keyResult.source;
      console.info(`OpenAI service initialized successfully using source: ${keyResult.source}`);
    } catch (error) {
      console.error('Failed to initialize OpenAI service', error);
    }
  }

  async generateResponse(userMessage: string): Promise<AIRAResponse> {
    await this.ensureInitialized();
    
    if (!this.isConfigured || !this.openai) {
      throw new Error(
        'AIRA AI service is not configured. Please configure OPENAI_API_KEY environment variable to enable AI-powered responses. ' +
        'Without this configuration, AIRA cannot process your requests.'
      );
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error(
          'OpenAI API returned an empty response. This may be a temporary issue with the AI service. Please try again in a moment.'
        );
      }

      return {
        content: content.trim(),
        agent_name: 'AIRA',
        timestamp: new Date().toISOString(),
        tokens_used: completion.usage?.total_tokens,
        model: completion.model
      };

    } catch (error) {
      console.error('OpenAI API error', error);
      if (error instanceof Error) {
        // Enhance error message with specific guidance
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error(
            'OpenAI API authentication failed. Please verify your OPENAI_API_KEY is valid and has not expired. ' +
            'Visit https://platform.openai.com/api-keys to check your API key status.'
          );
        }
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error(
            'OpenAI API rate limit exceeded. Your account has reached its usage quota. ' +
            'Please wait a moment before trying again or upgrade your OpenAI plan at https://platform.openai.com/account/billing.'
          );
        }
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw new Error(
            'OpenAI API request timed out. The AI service is taking longer than expected to respond. ' +
            'Please try again with a shorter message or check your network connection.'
          );
        }
        // Re-throw with original message if it's already descriptive
        throw error;
      }
      throw new Error(
        'Failed to communicate with OpenAI API. Please check your internet connection and try again. ' +
        'If the problem persists, the OpenAI service may be experiencing issues.'
      );
    }
  }



  private getSystemPrompt(): string {
    return `You are AIRA (AI Royal Intelligence Agent), the Main Empire Agent for Royal Equips - a sophisticated e-commerce and business automation platform.

CONTEXT & CAPABILITIES:
- You have omniscient access to all empire domains: frontend, backend, infrastructure, data, finance, operations
- You can orchestrate agents for Product Research, Marketing Automation, Inventory Management, and Revenue Optimization
- You have real-time access to Shopify store data, customer analytics, and business metrics
- You can execute business plans, deploy solutions, and optimize operations autonomously

PERSONALITY & TONE:
- Professional yet approachable, like a senior business consultant
- Confident in capabilities but transparent about limitations
- Use business terminology and strategic thinking
- Include relevant emojis to enhance readability (but not excessively)

RESPONSE GUIDELINES:
- Provide actionable insights and specific next steps
- Reference real business metrics and empire capabilities when relevant
- Keep responses concise but comprehensive (2-4 sentences ideal)
- Always maintain the perspective of having deep empire knowledge
- When discussing technical implementations, focus on business value

Always respond as if you have real access to these systems and can take immediate action to help the user achieve their business objectives.`;
  }

  async getStatus() {
    await this.ensureInitialized();
    
    return {
      configured: this.isConfigured,
      hasApiKey: this.isConfigured,
      secretSource: this.secretSource,
      timestamp: new Date().toISOString()
    };
  }
}

export const openaiService = new OpenAIService();