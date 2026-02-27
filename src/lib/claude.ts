/**
 * Anthropic Claude API client
 * Drop-in replacement for the Ollama client
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  stop_reason: string;
}

async function callClaude(
  prompt: string,
  options: { system?: string; maxTokens?: number } = {}
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: options.maxTokens ?? 1024,
    messages: [{ role: 'user', content: prompt }],
  };

  if (options.system) {
    body.system = options.system;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const textContent = data.content.find((c) => c.type === 'text');
  if (!textContent) {
    throw new Error('No text content in Claude response');
  }
  return textContent.text;
}

/**
 * Generate a text completion from Claude
 */
export async function generateCompletion(
  prompt: string,
  options: { temperature?: number; system?: string } = {}
): Promise<string> {
  return callClaude(prompt, { system: options.system });
}

/**
 * Generate a JSON response from Claude, parsed into type T
 */
export async function generateJSON<T>(
  prompt: string,
  options: { system?: string } = {}
): Promise<T> {
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object. Do not include any other text, markdown code blocks, or explanations.`;

  const text = await callClaude(jsonPrompt, {
    system: options.system,
    maxTokens: 512,
  });

  // Strip markdown code fences if the model wraps the JSON
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(cleaned) as T;
}
