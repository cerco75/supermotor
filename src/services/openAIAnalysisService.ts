/**
 * 🤖 OPENAI ANALYSIS SERVICE
 * Uses OpenAI GPT-4 API to provide intelligent token analysis
 * Alternative to Gemini with similar capabilities
 */

export interface OpenAITokenAnalysis {
    symbol: string;
    action: 'COMPRAR' | 'MANTENER' | 'EVITAR'; // Renamed from recommendation to match usage
    recommendation?: string; // Keep for backward compat if needed, or remove
    confidenceScore: number; // Renamed from confidence
    rationale: string; // Renamed from reasoning
    entryTiming: 'TEMPRANO' | 'MEDIO' | 'TARDE' | 'MUY_TARDE';
    riskAssessment: { // Renamed from priceAnalysis for better clarity/structure match
        riskLevel: 'BAJO' | 'MEDIO' | 'ALTO';
        isRealBreakout: boolean;
        timeInUptrend: string;
    };
    keyPoints: string[];
    timestamp: number;
}

class OpenAIAnalysisService {
    private apiKey: string = '';
    private apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    private model = 'gpt-4o-mini';
    private requestCount = 0;
    private lastResetTime = Date.now();

    public setApiKey(key: string) {
        this.apiKey = key;
        console.log('🤖 OpenAI API key configured');
    }

    public hasApiKey(): boolean {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    public async analyzeToken(token: any): Promise<OpenAITokenAnalysis | null> {
        if (!this.apiKey) {
            console.warn('⚠️ OpenAI API key not configured. Skipping AI analysis.');
            return null;
        }

        try {
            const prompt = this.buildAnalysisPrompt(token);
            const response = await this.callOpenAI(prompt);
            this.requestCount++;

            return this.parseOpenAIResponse(response, token.symbol);
        } catch (error) {
            console.error('❌ OpenAI analysis failed:', error);
            return null;
        }
    }

    private buildAnalysisPrompt(token: any): string {
        const symbol = token.symbol || 'UNKNOWN';
        const price = token.current_price || token.price || 0;
        const change1h = token.price_change_percentage_1h || token.change1h || 0;
        const change24h = token.price_change_percentage_24h || token.change24h || 0;
        const volume = token.total_volume || token.volume24h || 0;
        const mcap = token.market_cap || token.marketCap || 0;
        const priceHistory = token.priceHistory || [];

        return `Eres un analista experto en trading de criptomonedas. Analiza este token y proporciona una evaluación concisa EN ESPAÑOL.

DATOS DEL TOKEN:
- Símbolo: ${symbol}
- Precio Actual: $${price}
- Cambio 1h: ${change1h.toFixed(2)}%
- Cambio 24h: ${change24h.toFixed(2)}%
- Volumen 24h: $${volume.toLocaleString()}
- Cap. Mercado: $${mcap.toLocaleString()}
- Historial de Precios (últimas horas): ${priceHistory.slice(-10).join(', ')}

PREGUNTAS CRÍTICAS A RESPONDER:
1. ¿Es un breakout REAL que está empezando AHORA, o llegamos demasiado tarde?
2. ¿Cuánto tiempo lleva esta tendencia alcista? (estima en horas/días)
3. ¿Cuál es el nivel de riesgo de entrar al precio actual?
4. ¿Deberíamos COMPRAR, MANTENER o EVITAR?

Responde en este formato JSON EXACTO (sin markdown, solo JSON puro):
{
  "action": "COMPRAR|MANTENER|EVITAR",
  "confidenceScore": 0-100,
  "rationale": "Explicación breve en español (máx 100 palabras)",
  "entryTiming": "TEMPRANO|MEDIO|TARDE|MUY_TARDE",
  "isRealBreakout": true|false,
  "timeInUptrend": "X horas|días",
  "riskLevel": "BAJO|MEDIO|ALTO",
  "keyPoints": ["punto1", "punto2", "punto3"]
}`;
    }

    private async callOpenAI(prompt: string): Promise<string> {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert cryptocurrency trading analyst. Always respond with valid JSON only, no markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    private parseOpenAIResponse(response: string, symbol: string): OpenAITokenAnalysis {
        try {
            const parsed = JSON.parse(response);

            return {
                symbol,
                action: parsed.action || parsed.recommendation || 'MANTENER',
                confidenceScore: parsed.confidenceScore || parsed.confidence || 50,
                rationale: parsed.rationale || parsed.reasoning || 'Sin análisis disponible',
                entryTiming: parsed.entryTiming || 'MEDIO',
                riskAssessment: {
                    riskLevel: parsed.riskLevel || 'MEDIO',
                    isRealBreakout: parsed.isRealBreakout || false,
                    timeInUptrend: parsed.timeInUptrend || 'Desconocido'
                },
                keyPoints: parsed.keyPoints || [],
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Failed to parse OpenAI response:', error);
            // Return safe default
            return {
                symbol,
                action: 'MANTENER',
                confidenceScore: 0,
                rationale: 'Error al analizar respuesta de IA',
                entryTiming: 'MEDIO',
                riskAssessment: {
                    riskLevel: 'ALTO',
                    isRealBreakout: false,
                    timeInUptrend: 'Desconocido'
                },
                keyPoints: ['Análisis fallido'],
                timestamp: Date.now()
            };
        }
    }

    /**
     * Get usage stats
     */
    public getUsageStats() {
        return {
            requestsToday: this.requestCount,
            model: this.model,
            lastResetTime: new Date(this.lastResetTime)
        };
    }
}

export const openAIAnalysisService = new OpenAIAnalysisService();
