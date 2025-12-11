import { TradingStrategy } from '../aiAdvisorService';

class TelegramService {
    private readonly BOT_TOKEN = '8597415572:AAGx7V1ncom53njlVB76twwhmkPU0cNwv9o';
    private readonly CHAT_ID = '5715610612';
    private readonly BASE_URL = `https://api.telegram.org/bot${this.BOT_TOKEN}/sendMessage`;
    private alertHistory = new Set<string>();

    /**
     * Sends a rich alert to Telegram for an AI-Approved Token
     */
    public async sendAiAlert(strategy: TradingStrategy) {
        // Spam Prevention: Only alert once per token per session (or strategy timestamp)
        // We use a composite key of symbol + trendClassification to re-alert if trend changes significantly
        const alertKey = `${strategy.symbol}-${strategy.trendClassification}`;
        if (this.alertHistory.has(alertKey)) {
            console.log(`🔕 Alert already sent for ${strategy.symbol}, skipping Telegram.`);
            return;
        }

        const symbol = strategy.symbol.toUpperCase();
        const price = strategy.currentPrice < 1 ? strategy.currentPrice.toFixed(6) : strategy.currentPrice.toFixed(2);
        const sl = strategy.stopLoss < 1 ? strategy.stopLoss.toFixed(6) : strategy.stopLoss.toFixed(2);
        const tp1 = strategy.takeProfit1 < 1 ? strategy.takeProfit1.toFixed(6) : strategy.takeProfit1.toFixed(2);
        const tp2 = strategy.takeProfit2 < 1 ? strategy.takeProfit2.toFixed(6) : strategy.takeProfit2.toFixed(2);
        const trendEmoji = strategy.trendScore >= 2 ? '🚀' : '📈';
        const entryZone = `$${strategy.safeZone.min < 1 ? strategy.safeZone.min.toFixed(6) : strategy.safeZone.min.toFixed(2)} - $${strategy.safeZone.max < 1 ? strategy.safeZone.max.toFixed(6) : strategy.safeZone.max.toFixed(2)}`;

        let header = `🤖 **AI ANALYST PICK** | ${symbol}`;
        if (strategy.status === 'LATE_PULLBACK_ONLY') {
            header = `⚠️ **AI WARNING** | ${symbol} (LATE)`;
        }

        const message = `
${header}

🔹 **Tendencia:** ${strategy.trendClassification} (${strategy.trendTimeframe}) ${trendEmoji}
🔹 **Score:** ${strategy.trendScore}/4
🔹 **Precio:** $${price}

🎯 **Estrategia Ejecutable:**
• **Zona Entrada:** ${entryZone}
• **Pullback Ideal:** $${strategy.pullbackPrice < 1 ? strategy.pullbackPrice.toFixed(6) : strategy.pullbackPrice.toFixed(2)}
• **Stop Loss:** $${sl}
• **TP 1:** $${tp1}
• **TP 2:** $${tp2}

⚖️ **R/R:** 1:${strategy.riskRewardRatio.toFixed(2)}
⏳ **Horizonte:** ${strategy.horizon}

📝 **Nota de Ejecución:**
${strategy.executionNote}

_Generado por Motor Radar AI_
`;

        try {
            console.log(`🦁🤖 Enviando alerta de Telegram para ${symbol}...`);

            const response = await fetch(this.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            if (response.ok) {
                console.log(`🦁🤖 Telegram Alert sent ✅ | ${symbol} | Score: ${strategy.trendScore}`);
                this.alertHistory.add(alertKey);
            } else {
                const errorText = await response.text();
                console.error(`🦁❌ Telegram API Error for ${symbol}:`, errorText);
            }
        } catch (error) {
            console.error(`🦁❌ Failed to send Telegram alert for ${symbol}:`, error);
        }
    }

    public clearHistory() {
        this.alertHistory.clear();
    }
}

export const telegramService = new TelegramService();
