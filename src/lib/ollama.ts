/**
 * Ollama API client for local LLM integration
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi3';

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

/**
 * Generate a completion from Ollama
 */
export async function generateCompletion(prompt: string, options: { temperature?: number; system?: string } = {}): Promise<string> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                system: options.system,
                stream: false,
                options: {
                    temperature: options.temperature ?? 0.7,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = (await response.json()) as OllamaResponse;
        return data.response;
    } catch (error) {
        console.error('Failed to communicate with Ollama:', error);
        throw error;
    }
}

/**
 * Generate a JSON response from Ollama
 */
export async function generateJSON<T>(prompt: string, options: { system?: string } = {}): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object. Do not include any other text or markdown formatting.`;

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: jsonPrompt,
                system: options.system,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.1, // Lower temperature for more reliable formatting
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = (await response.json()) as OllamaResponse;
        return JSON.parse(data.response) as T;
    } catch (error) {
        console.error('Failed to parse JSON from Ollama:', error);
        throw error;
    }
}
