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

// 1. Get Gem History (App calls this on wake up)
app.get('/history', (req, res) => {
    // Return last 50 gems
    const recent = history.slice(-50).reverse();
    res.json({
        ok: true,
        count: recent.length,
        gems: recent
    });
});

// 2. Health Check
app.get('/', (req, res) => {
    res.send('🦁 Motor Radar Brain is Active. /history to sync.');
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

// --- START ---
setInterval(scanSolana, 60000);
scanSolana();

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
