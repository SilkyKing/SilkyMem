
import { GoogleGenAI } from "@google/genai";
import { MODEL_MAPPING } from "../constants";
import { ModelProvider, PersonaProfile, ApiConfig, ApiProviderType, UsageMetrics, GenerationOptions, PromptInjectionStrategy } from "../types";
import { vault } from "./vaultService";

// --- 1. THE INTERFACE (LLM_Standard_Interface) ---

interface StandardInput {
  systemPrompt: string;
  userContext: string;
  userQuery: string;
  temperature: number;
  strategy: PromptInjectionStrategy;
}

interface StandardResponse {
  text: string;
  metrics: UsageMetrics;
}

// --- 2. SWITCHBOARD LOGIC (The Router) ---

export const generateResponse = async (
  prompt: string,
  context: string[],
  apiConfig: ApiConfig | undefined | 'AUTO',
  persona: PersonaProfile,
  options: GenerationOptions = { temperature: 0.7, injectionStrategy: 'PREPEND' }
): Promise<{ text: string; metrics: UsageMetrics }> => {

  let selectedConfig: ApiConfig | undefined;
  let routingMode: 'LIGHTNING' | 'DEEP_THOUGHT' | 'STANDARD' = 'STANDARD';

  // AUTO-ROUTING LOGIC
  if (apiConfig === 'AUTO') {
      const allConfigs = vault.getApiConfigs();
      const decision = determineOptimalModel(prompt, context, allConfigs);
      selectedConfig = decision.config;
      routingMode = decision.mode;
  } else {
      selectedConfig = apiConfig;
  }

  if (!selectedConfig) {
    return {
        text: "SYSTEM ALERT: No Active API Connection. Please configure a Neural Bridge in the API Nexus.",
        metrics: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costEstimate: 0, provider: 'CUSTOM_LOCAL', model: 'none', routingMode: 'STANDARD' }
    };
  }

  // PREPARE PAYLOAD
  const input: StandardInput = {
      systemPrompt: `SYSTEM IDENTITY:\nNAME: ${persona.name}\nROLE: ${persona.role}\nTONE: ${persona.tone}\nDIRECTIVE: ${persona.systemPrompt}`,
      userContext: context.join('\n---\n'),
      userQuery: prompt,
      temperature: options.temperature,
      strategy: options.injectionStrategy
  };

  // ROUTE TO ADAPTER
  try {
      let response: StandardResponse;

      switch (selectedConfig.provider) {
          case 'GOOGLE':
              response = await GoogleAdapter(selectedConfig, input, routingMode);
              break;
          case 'OPENAI':
              response = await OpenAIAdapter(selectedConfig, input, routingMode);
              break;
          case 'ANTHROPIC':
              response = await AnthropicAdapter(selectedConfig, input, routingMode);
              break;
          case 'GROQ':
              response = await GroqAdapter(selectedConfig, input, routingMode);
              break;
          case 'MISTRAL':
              response = await MistralAdapter(selectedConfig, input, routingMode);
              break;
          case 'XAI':
              response = await XAIAdapter(selectedConfig, input, routingMode);
              break;
          case 'CUSTOM_LOCAL':
              response = await CustomLocalAdapter(selectedConfig, input, routingMode);
              break;
          default:
              throw new Error("Unknown Provider Protocol");
      }

      return response;

  } catch (error: any) {
    console.error("Inference Error:", error);
    return {
        text: `CONNECTION SEVERED: ${error.message || "Unknown Error"}. Falling back to local cache.`,
        metrics: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costEstimate: 0, provider: selectedConfig.provider, model: 'error', routingMode: 'STANDARD' }
    };
  }
};

// --- HELPER: CONTEXT STRATEGY BUILDER ---
function buildPromptWithStrategy(input: StandardInput): string {
    const { userContext, userQuery, strategy } = input;
    
    if (!userContext) return `QUERY:\n${userQuery}`;

    switch (strategy) {
        case 'APPEND':
            return `QUERY:\n${userQuery}\n\nRELEVANT CONTEXT (Use if helpful):\n${userContext}`;
        case 'INTERLEAVE':
            // Logic: Split context, rank top half before, bottom half after
            const parts = userContext.split('\n---\n');
            const mid = Math.ceil(parts.length / 2);
            const primary = parts.slice(0, mid).join('\n---\n');
            const secondary = parts.slice(mid).join('\n---\n');
            return `PRIMARY DATA:\n${primary}\n\nUSER QUERY:\n${userQuery}\n\nSECONDARY DATA:\n${secondary}`;
        case 'PREPEND':
        default:
            return `CONTEXT:\n${userContext}\n\nQUERY:\n${userQuery}`;
    }
}

// --- 3. MODEL SELECTOR (The Switchboard) ---

function determineOptimalModel(
    query: string, 
    context: string[], 
    availableConfigs: ApiConfig[]
): { config: ApiConfig | undefined; mode: 'LIGHTNING' | 'DEEP_THOUGHT' | 'STANDARD' } {
    
    // 1. Context Length Check (Long Context -> Google)
    const contextLength = context.join('').length;
    if (contextLength > 50000) { // Approx 12k tokens
        return { 
            config: availableConfigs.find(c => c.provider === 'GOOGLE') || availableConfigs[0],
            mode: 'DEEP_THOUGHT' 
        };
    }

    const lowerQuery = query.toLowerCase();

    // 2. LIGHTNING MODE: Low Complexity / Chatter
    // Criteria: Short query OR summarization task
    // Prefer Groq (Meta Llama) for speed
    if ((query.length < 50 && !/write|generate|create/i.test(lowerQuery)) || /summarize|summary/i.test(lowerQuery)) {
        const groq = availableConfigs.find(c => c.provider === 'GROQ');
        if (groq) return { config: groq, mode: 'LIGHTNING' };
        
        // Fallback to local
        const local = availableConfigs.find(c => c.provider === 'CUSTOM_LOCAL');
        if (local) return { config: local, mode: 'LIGHTNING' };
    }

    // 3. DEEP THOUGHT MODE: High Complexity
    // Criteria: Keywords requiring high reasoning or creative nuance
    if (/plan|architect|code|legal|contract|complex|draft|blog|tone|essay/i.test(lowerQuery)) {
        // Prioritize Claude for writing/nuance
        if (/draft|blog|tone|style|essay/i.test(lowerQuery)) {
            const claude = availableConfigs.find(c => c.provider === 'ANTHROPIC');
            if (claude) return { config: claude, mode: 'DEEP_THOUGHT' };
        }
        
        // Prioritize GPT-4 or Grok for logic/structure
        const gpt = availableConfigs.find(c => c.provider === 'OPENAI');
        if (gpt) return { config: gpt, mode: 'DEEP_THOUGHT' };

        const grok = availableConfigs.find(c => c.provider === 'XAI');
        if (grok) return { config: grok, mode: 'DEEP_THOUGHT' };
    }

    // Default: Standard Mode (Gemini Flash or first available)
    return { 
        config: availableConfigs.find(c => c.provider === 'GOOGLE') || availableConfigs[0], 
        mode: 'STANDARD' 
    };
}

// --- 4. TOKEN METERING UTILS ---

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

function calculateCost(inputTokens: number, outputTokens: number, provider: ApiProviderType): number {
    // Rough estimation in cents
    switch(provider) {
        case 'OPENAI': return (inputTokens * 0.0005 + outputTokens * 0.0015); 
        case 'ANTHROPIC': return (inputTokens * 0.0003 + outputTokens * 0.0015);
        case 'GOOGLE': return (inputTokens * 0.0001 + outputTokens * 0.0004);
        case 'GROQ': return (inputTokens * 0.00005 + outputTokens * 0.00008); 
        case 'MISTRAL': return (inputTokens * 0.0002 + outputTokens * 0.0006);
        case 'XAI': return (inputTokens * 0.0004 + outputTokens * 0.0012); // Estimated Grok pricing
        default: return 0;
    }
}

// --- 5. ADAPTERS (The Pentagon) ---

async function GoogleAdapter(config: ApiConfig, input: StandardInput, mode: any): Promise<StandardResponse> {
    if (!config.apiKey) throw new Error("Missing Google API Key");
    
    const aiClient = new GoogleGenAI({ apiKey: config.apiKey });
    const modelId = config.modelId || 'gemini-2.5-flash';

    const fullContent = buildPromptWithStrategy(input);
    const fullPrompt = `${input.systemPrompt}\n\n${fullContent}`;
    const inputT = estimateTokens(fullPrompt);

    const response = await aiClient.models.generateContent({
        model: modelId,
        contents: fullPrompt,
        config: {
            temperature: input.temperature,
        }
    });
    
    const text = response.text || "Empty Response";
    const outputT = estimateTokens(text);

    return {
        text,
        metrics: {
            inputTokens: inputT,
            outputTokens: outputT,
            totalTokens: inputT + outputT,
            costEstimate: calculateCost(inputT, outputT, 'GOOGLE'),
            provider: 'GOOGLE',
            model: modelId,
            routingMode: mode
        }
    };
}

async function OpenAIAdapter(config: ApiConfig, input: StandardInput, mode: any): Promise<StandardResponse> {
    const fullContent = buildPromptWithStrategy(input);
    
    if (!config.apiKey) return simulateResponse(config, input, mode);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: config.modelId || 'gpt-4o',
            messages: [
                { role: 'system', content: input.systemPrompt },
                { role: 'user', content: fullContent }
            ],
            temperature: input.temperature
        })
    });

    if (!response.ok) throw new Error(`OpenAI Error: ${response.statusText}`);
    const data = await response.json();
    
    const text = data.choices[0].message.content;
    const metrics = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
    
    return {
        text,
        metrics: {
            inputTokens: metrics.prompt_tokens,
            outputTokens: metrics.completion_tokens,
            totalTokens: metrics.total_tokens,
            costEstimate: calculateCost(metrics.prompt_tokens, metrics.completion_tokens, 'OPENAI'),
            provider: 'OPENAI',
            model: config.modelId || 'gpt-4o',
            routingMode: mode
        }
    };
}

async function AnthropicAdapter(config: ApiConfig, input: StandardInput, mode: any): Promise<StandardResponse> {
    const fullContent = buildPromptWithStrategy(input);

    if (!config.apiKey) return simulateResponse(config, input, mode);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: config.modelId || 'claude-3-5-sonnet-20240620',
            system: input.systemPrompt,
            messages: [
                { role: 'user', content: fullContent }
            ],
            max_tokens: 1024,
            temperature: input.temperature
        })
    });

    if (!response.ok) throw new Error(`Anthropic Error: ${response.statusText}`);
    const data = await response.json();

    const text = data.content[0].text;
    const inputT = data.usage?.input_tokens || 0;
    const outputT = data.usage?.output_tokens || 0;

    return {
        text,
        metrics: {
            inputTokens: inputT,
            outputTokens: outputT,
            totalTokens: inputT + outputT,
            costEstimate: calculateCost(inputT, outputT, 'ANTHROPIC'),
            provider: 'ANTHROPIC',
            model: config.modelId || 'claude-3-5-sonnet',
            routingMode: mode
        }
    };
}

async function GroqAdapter(config: ApiConfig, input: StandardInput, mode: any): Promise<StandardResponse> {
     if (!config.apiKey) return simulateResponse(config, input, mode);

     const fullContent = buildPromptWithStrategy(input);
     
     // Groq hosts Llama 3
     const modelId = config.modelId || 'llama3-70b-8192';

     const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: modelId,
            messages: [
                { role: 'system', content: input.systemPrompt },
                { role: 'user', content: fullContent }
            ],
            temperature: input.temperature
        })
    });

    if (!response.ok) throw new Error(`Groq/Meta Error: ${response.statusText}`);
    const data = await response.json();
    
    const text = data.choices[0].message.content;
    const metrics = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
    
    return {
        text,
        metrics: {
            inputTokens: metrics.prompt_tokens,
            outputTokens: metrics.completion_tokens,
            totalTokens: metrics.total_tokens,
            costEstimate: calculateCost(metrics.prompt_tokens, metrics.completion_tokens, 'GROQ'),
            provider: 'GROQ',
            model: modelId,
            routingMode: mode
        }
    };
}

async function MistralAdapter(config: ApiConfig, input: StandardInput, mode: any): Promise<StandardResponse> {
    if (!config.apiKey) return simulateResponse(config, input, mode);

    const fullContent = buildPromptWithStrategy(input);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: config.modelId || 'mistral-large-latest',
            messages: [
                { role: 'system', content: input.systemPrompt },
                { role: 'user', content: fullContent }
            ],
            temperature: input.temperature
        })
    });

    if (!response.ok) throw new Error(`Mistral Error: ${response.statusText}`);
    const data = await response.json();

    const text = data.choices[0].message.content;
    const metrics = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
        text,
        metrics: {
            inputTokens: metrics.prompt_tokens,
            outputTokens: metrics.completion_tokens,
            totalTokens: metrics.total_tokens,
            costEstimate: calculateCost(metrics.prompt_tokens, metrics.completion_tokens, 'MISTRAL'),
            provider: 'MISTRAL',
            model: config.modelId || 'mistral-large',
            routingMode: mode
        }
    };
}

async function XAIAdapter(config: ApiConfig, input: StandardInput, mode: any): Promise<StandardResponse> {
    if (!config.apiKey) return simulateResponse(config, input, mode);

    const fullContent = buildPromptWithStrategy(input);

    // xAI (Grok) uses an OpenAI-compatible schema
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: config.modelId || 'grok-beta',
            messages: [
                { role: 'system', content: input.systemPrompt },
                { role: 'user', content: fullContent }
            ],
            temperature: input.temperature,
            stream: false
        })
    });

    if (!response.ok) throw new Error(`xAI (Grok) Error: ${response.statusText}`);
    const data = await response.json();

    const text = data.choices[0].message.content;
    const metrics = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
        text,
        metrics: {
            inputTokens: metrics.prompt_tokens,
            outputTokens: metrics.completion_tokens,
            totalTokens: metrics.total_tokens,
            costEstimate: calculateCost(metrics.prompt_tokens, metrics.completion_tokens, 'XAI'),
            provider: 'XAI',
            model: config.modelId || 'grok-beta',
            routingMode: mode
        }
    };
}

async function CustomLocalAdapter(config: ApiConfig, input: StandardInput, mode: any): Promise<StandardResponse> {
     const fullContent = buildPromptWithStrategy(input);
     
     if (!config.baseUrl) throw new Error("Missing Local Endpoint");

     try {
         const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.modelId || 'local-model',
                messages: [
                    { role: 'system', content: input.systemPrompt },
                    { role: 'user', content: fullContent }
                ],
                temperature: input.temperature
            })
        });
        
        if (!response.ok) throw new Error("Local Server Error");
        const data = await response.json();
        
        const text = data.choices[0].message.content;
        const inputT = estimateTokens(fullContent);
        const outputT = estimateTokens(text);

        return {
            text,
            metrics: {
                inputTokens: inputT,
                outputTokens: outputT,
                totalTokens: inputT + outputT,
                costEstimate: 0,
                provider: 'CUSTOM_LOCAL',
                model: 'local-model',
                routingMode: mode
            }
        };

     } catch (e) {
         return simulateResponse(config, input, mode);
     }
}

// Fallback for Demo without real API keys
function simulateResponse(config: ApiConfig, input: StandardInput, mode: any): Promise<StandardResponse> {
    return new Promise(resolve => {
        setTimeout(() => {
            const fullContent = buildPromptWithStrategy(input);
            const inputT = estimateTokens(fullContent);
            const text = `[SIMULATED ${config.provider} RESPONSE]\n\nI have processed your query with T=${input.temperature} and Strategy=${input.strategy}.\n\nMode: ${mode}\n\nSince no valid API key was found in this demo environment, I am mocking this response. In a production build, this would hit ${config.provider}'s servers directly.\n\nContext used: ${input.userContext.length > 10 ? 'YES' : 'NONE'}.`;
            const outputT = estimateTokens(text);
            
            resolve({
                text,
                metrics: {
                    inputTokens: inputT,
                    outputTokens: outputT,
                    totalTokens: inputT + outputT,
                    costEstimate: calculateCost(inputT, outputT, config.provider),
                    provider: config.provider,
                    model: config.modelId || 'simulation',
                    routingMode: mode
                }
            });
        }, 800);
    });
}
