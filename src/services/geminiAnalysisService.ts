/**
 * 🤖 GEMINI AI ANALYSIS SERVICE
 * Uses Google Gemini API to provide intelligent token analysis
 * Free tier: 1500 requests/day - very generous!
 */

export interface GeminiTokenAnalysis {
    symbol: string;
    recommendation: 'BUY' | 'HOLD' | 'AVOID';
    confidence: number; // 0-100
    reasoning: string;
    entryTiming: 'EARLY' | 'MID' | 'LATE' | 'TOO_LATE';
    priceAnalysis: {
        isRealBreakout: boolean;
        timeInUptrend: string; // e.g., "2 hours", "3 days"
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    keyPoints: string[];
    timestamp: number;
}

class GeminiAnalysisService {
    // 🔑 Gemini API Key configured
    private apiKey: string = 'AIzaSyDpTWYF8K6TTAKJeaEC6nhoRBmNIvt5SUg';
    private apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    private requestCount = 0;
    private lastResetTime = Date.now();
    private readonly MAX_REQUESTS_PER_DAY = 1500;

    /**
     * Set API Key (call this from your app initialization)
     */
    public setApiKey(key: string) {
        this.apiKey = key;
        console.log('🤖 Gemini API key configured');
    }

    /**
     * Get configured API Key
     */
    public getApiKey(): string {
        return this.apiKey;
    }

    /**
     * Check if we have requests remaining today
     */
    private canMakeRequest(): boolean {
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        // Reset counter if 24h passed
        if (now - this.lastResetTime > dayInMs) {
            this.requestCount = 0;
            this.lastResetTime = now;
        }

        return this.requestCount < this.MAX_REQUESTS_PER_DAY;
    }

    /**
     * 🧠 Analyze token using Gemini AI
     */
    public async analyzeToken(token: any): Promise<GeminiTokenAnalysis | undefined> {
        if (!this.apiKey) {
            console.warn('⚠️ Gemini API key not configured. Skipping AI analysis.');
            return undefined;
        }

        if (!this.canMakeRequest()) {
            console.warn('⚠️ Gemini daily request limit reached. Skipping analysis.');
            return undefined;
        }

        try {
            const prompt = this.buildAnalysisPrompt(token);
            const response = await this.callGeminiAPI(prompt);
            this.requestCount++;

            return this.parseGeminiResponse(response, token.symbol);
        } catch (error) {
            console.error('❌ Gemini analysis failed:', error);
            return undefined;
        }
    }

    /**
     * Build intelligent prompt for Gemini (in Spanish)
     */
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
  "recommendation": "COMPRAR|MANTENER|EVITAR",
  "confidence": 0-100,
  "reasoning": "Explicación breve en español (máx 100 palabras)",
  "entryTiming": "TEMPRANO|MEDIO|TARDE|MUY_TARDE",
  "isRealBreakout": true|false,
  "timeInUptrend": "X horas|días",
  "riskLevel": "BAJO|MEDIO|ALTO",
  "keyPoints": ["punto1", "punto2", "punto3"]
}`;
    }

    /**
     * Call Gemini API
     */
    private async callGeminiAPI(prompt: string): Promise<string> {
        const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.4, // Lower = more consistent
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 500,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text;
    }

    /**
     * Parse Gemini response
     */
    private parseGeminiResponse(response: string, symbol: string): GeminiTokenAnalysis {
        try {
            // Remove markdown code blocks if present
            const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);

            return {
                symbol,
                recommendation: parsed.recommendation || 'HOLD',
                confidence: parsed.confidence || 50,
                reasoning: parsed.reasoning || 'No reasoning provided',
                entryTiming: parsed.entryTiming || 'MID',
                priceAnalysis: {
                    isRealBreakout: parsed.isRealBreakout || false,
                    timeInUptrend: parsed.timeInUptrend || 'Unknown',
                    riskLevel: parsed.riskLevel || 'MEDIUM'
                },
                keyPoints: parsed.keyPoints || [],
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Failed to parse Gemini response:', error);
            // Return safe default
            return {
                symbol,
                recommendation: 'HOLD',
                confidence: 0,
                reasoning: 'Failed to parse AI response',
                entryTiming: 'MID',
                priceAnalysis: {
                    isRealBreakout: false,
                    timeInUptrend: 'Unknown',
                    riskLevel: 'HIGH'
                },
                keyPoints: ['Analysis failed'],
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
            remainingRequests: this.MAX_REQUESTS_PER_DAY - this.requestCount,
            resetTime: new Date(this.lastResetTime + 24 * 60 * 60 * 1000)
        };
    }
}

export const geminiAnalysisService = new GeminiAnalysisService();
