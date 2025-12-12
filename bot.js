import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import express from 'express';
import cors from 'cors';
import fs from 'fs';

// --- CONFIGURATION ---
const TELEGRAM_TOKEN = '8597415572:AAGx7V1ncom53njlVB76twwhmkPU0cNwv9o';
const PORT = process.env.PORT || 3000;
const HISTORY_FILE = './history.json';

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json());

// Serve Static Frontend (Vite Build)
app.use(express.static('dist'));

// --- BOT SETUP ---
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const activeChats = new Set();
const seenTokens = new Set();
let history = []; // List of found gems

// Load history from disk
try {
    if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE);
        history = JSON.parse(data);
        history.forEach(h => seenTokens.add(h.tokenAddress));
        console.log(`📂 Loaded ${history.length} gems from history.`);
    }
} catch (e) {
    console.error("Error loading history:", e);
}

// --- API ROUTES ---

// 1. Get Gem History
app.get('/history', (req, res) => {
    const recent = history.slice(-50).reverse();
    res.json({
        ok: true,
        count: recent.length,
        gems: recent
    });
});

// 2. Health Check (API)
app.get('/health', (req, res) => {
    res.send('🦁 Motor Radar Brain is Active.');
});

// --- BOT LOGIC ---
bot.onText(/\/start/, (msg) => {
    activeChats.add(msg.chat.id);
    bot.sendMessage(msg.chat.id, "✅ **Radar Sincronizado**\nAhora guardaré el historial para tu App.");
});

// --- RADAR ENGINE ---
async function scanSolana() {
    try {
        console.log("⚡ Scanning...");
        const response = await axios.get('https://api.dexscreener.com/token-boosts/top/v1');

        if (!response.data) return;

        const pairs = response.data.slice(0, 50);
        const activeGems = []; // 🔧 FIX: Track ALL active tokens, not just new ones

        for (const pair of pairs) {
            if (pair.chainId !== 'solana') continue;

            const volume = pair.volume24h || 0;
            const priceChange = pair.priceChange24h || 0;

            // CRITERIA
            if (volume > 50000 && priceChange > 5) {
                const gem = {
                    ...pair,
                    discoveredAt: Date.now(), // Always update timestamp
                    lastSeen: Date.now() // Track when we last saw this token
                };

                activeGems.push(gem);

                // 🔧 FIX: Alert on EVERY scan, not just new tokens
                // This ensures Telegram gets notified every hour
                const isNew = !seenTokens.has(pair.tokenAddress);
                if (isNew) {
                    seenTokens.add(pair.tokenAddress);
                    broadcastAlert(gem, true); // Mark as NEW
                } else {
                    broadcastAlert(gem, false); // Mark as ACTIVE
                }
            }
        }

        // 🔧 FIX: Replace history with current active gems
        // This ensures /history always returns CURRENT opportunities
        if (activeGems.length > 0) {
            history = activeGems;
            saveHistory();
            console.log(`✅ Updated history with ${activeGems.length} active gems`);
        } else {
            console.log(`⚠️ No gems found in this scan, keeping previous history`);
        }
    } catch (error) {
        console.error("Scan error:", error.message);
    }
}

function saveHistory() {
    // Keep last 1000 to avoid file bloat
    if (history.length > 1000) history = history.slice(-1000);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function broadcastAlert(token, isNew = true) {
    const status = isNew ? '🆕 NUEVA OPORTUNIDAD' : '✅ ACTIVA';
    const message = `
🚨 **ALERTA RADAR** ${status} 🚨

🪙 **${token.name || token.symbol}**
💰 $${token.price || 'N/A'} | 📈 24h: ${token.priceChange24h}%
📊 Vol: $${(token.volume24h / 1000000).toFixed(2)}M
⚡ Solana
`;
    activeChats.forEach(id => bot.sendMessage(id, message));
}

// --- BINANCE HUNTER ENGINE (CEX) ---
async function scanBinance() {
    try {
        console.log("🦁🚀 CEX Turbo: Scanning Binance Top Gainers...");

        // 1. Get Top Gainers
        const tickerRes = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
        const gainers = tickerRes.data
            .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 5000000) // >$5M Vol
            .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
            .slice(0, 10);

        for (const coin of gainers) {
            await analyzeBinancePair(coin);
            // Small delay to be polite
            await new Promise(r => setTimeout(r, 500));
        }

    } catch (error) {
        console.error("Binance Scan Error:", error.message);
    }
}

async function analyzeBinancePair(ticker) {
    try {
        // 2. Fetch Candles (1m) for technicals
        const klinesRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${ticker.symbol}&interval=1m&limit=30`);
        const candles = klinesRes.data;
        if (!candles || candles.length < 20) return;

        const closes = candles.map(k => parseFloat(k[4]));

        // 3. Calc Technicals
        const rsi = calculateRSI(closes, 14);
        const { macdSignal } = calculateMACD(closes);

        // 4. HUNTER LOGIC
        // We look for OVERSOLD DIP in a UPTREND (Turbo Scalp)
        // OR Strong Breakout

        let signal = null;

        // Strategy A: RSI Oversold (< 30) -> Buy the Dip
        if (rsi < 30) {
            signal = "🟢 REBOTE (Oversold)";
        }
        // Strategy B: MACD Flip Bullish + RSI healthy
        else if (macdSignal === 'BULLISH' && rsi > 40 && rsi < 70) {
            // Check if it JUST flipped? Hard without history state. 
            // We'll just alert strong momentum.
            // signal = "🚀 IMPULSO (Momentum)"; 
            // Reduced noise: Only alert Oversold for now in bot
        }

        if (signal) {
            const alertMsg = `
🚀 **BINANCE TURBO** 🚀
💎 **${ticker.symbol.replace('USDT', '')}**
💰 $${parseFloat(ticker.lastPrice).toFixed(4)}
📊 RSI: ${rsi.toFixed(1)} | ${signal}
📈 24h: ${ticker.priceChangePercent}%
            `;
            // Deduplicate logic simpler: Just log for now to avoid spamming user while testing
            // broadcastAlert({ symbol: ticker.symbol, ...ticker }, false); // Use carefully

            // Only alert if we haven't spammed this token recently?
            // For now, let's just log it to console as "Found"
            console.log(`Bingo! ${ticker.symbol} - ${signal}`);

            // OPTIONAL: Send to Telegram
            activeChats.forEach(id => bot.sendMessage(id, alertMsg));
        }

    } catch (e) {
        // ignore individual pair errors
    }
}

// Helpers
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[prices.length - i] - prices[prices.length - i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
    }
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    const ema12 = calcEMA(prices, 12);
    const ema26 = calcEMA(prices, 26);
    const macdLine = ema12 - ema26;
    return { macdSignal: macdLine > 0 ? 'BULLISH' : 'BEARISH' };
}

function calcEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
}

// --- START ---
setInterval(scanSolana, 60000); // DexScreener every 60s
setInterval(scanBinance, 30000); // Binance Turbo every 30s
scanSolana();
scanBinance();

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
