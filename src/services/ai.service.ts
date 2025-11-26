import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { getEncoding } from 'js-tiktoken';

export interface AIService {
    countTokens(systemPrompt: string, userPrompt: string, model: string): Promise<number>;
    generateResponse(systemPrompt: string, userPrompt: string, model: string, maxTokens: number): Promise<string>;
}

export class AnthropicService implements AIService {
    private client: Anthropic;

    constructor(apiKey: string) {
        this.client = new Anthropic({ apiKey });
    }

    async countTokens(systemPrompt: string, userPrompt: string, model: string): Promise<number> {
        const response = await this.client.beta.messages.countTokens({
            model,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });
        return response.input_tokens;
    }

    async generateResponse(systemPrompt: string, userPrompt: string, model: string, maxTokens: number): Promise<string> {
        const message = await this.client.messages.create({
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });

        if (message.content && message.content.length > 0) {
            const textBlock = message.content.find(block => block.type === 'text');
            if (textBlock && textBlock.type === 'text') {
                return textBlock.text;
            }
        }
        throw new Error('Received empty content from Anthropic API');
    }
}

export class OpenAIService implements AIService {
    private client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
    }

    async countTokens(systemPrompt: string, userPrompt: string, model: string): Promise<number> {
        const enc = getEncoding('cl100k_base');
        const systemTokens = enc.encode(systemPrompt).length;
        const userTokens = enc.encode(userPrompt).length;
        return systemTokens + userTokens;
    }

    async generateResponse(systemPrompt: string, userPrompt: string, model: string, maxTokens: number): Promise<string> {
        const response = await this.client.chat.completions.create({
            model,
            max_completion_tokens: maxTokens,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Received empty content from OpenAI API');
        }
        return content;
    }
}

export function createAIService(): { service: AIService, vendor: string, model: string, maxTokens: number } {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let vendor = '';
    let service: AIService;
    let model = '';
    const maxTokens = parseInt(process.env.MAX_TOKENS || '20000', 10);

    if (openaiKey && !anthropicKey) {
        vendor = 'openai';
        service = new OpenAIService(openaiKey);
        model = process.env.OPENAI_MODEL || 'gpt-4o';
    } else if (anthropicKey) {
        vendor = 'anthropic';
        service = new AnthropicService(anthropicKey);
        model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    } else {
        throw new Error('Either ANTHROPIC_API_KEY or OPENAI_API_KEY must be set');
    }

    return { service, vendor, model, maxTokens };
}
