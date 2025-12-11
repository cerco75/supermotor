import { DerivativesData, OrderBookAnalysis } from '../../types';
import { technicalService } from '../technicalService';

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
const BINANCE_FAPI_URL = 'https://fapi.binance.com/fapi/v1';
const USD_TO_EUR = 0.93;

export const binanceClient = {

    async getGainers(): Promise<any[]> {
        const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr`);
        if (!response.ok) throw new Error("Binance API Error");
        const data = await response.json();

        return data
            .filter((ticker: any) => {
                const s = ticker.symbol;
                return s.endsWith('USDT') && !s.includes('UPUSDT') && !s.includes('DOWNUSDT') && !s.includes('BEAR') && !s.includes('BULL');
            })
            .map((ticker: any) => {
                const symbol = ticker.symbol.replace('USDT', '');
                const change = parseFloat(ticker.priceChangePercent);
                const price = parseFloat(ticker.lastPrice) * USD_TO_EUR;
                const volume = parseFloat(ticker.quoteVolume) * USD_TO_EUR;

                return {
                    id: symbol.toLowerCase(),
                    symbol: symbol.toLowerCase(),
                    name: symbol,
                    image: '',
                    current_price: price,
                    market_cap: 0,
                    market_cap_rank: 999,
                    total_volume: volume,
                    price_change_percentage_24h: change,
                    price_change_percentage_1h_in_currency: 0,
                    price_change_percentage_7d_in_currency: 0
                };
            })
            .sort((a: any, b: any) => b.price_change_percentage_24h - a.price_change_percentage_24h)
            .slice(0, 50);
    },

    async getTickerPrice(symbol: string): Promise<number | null> {
        try {
            const pair = `${symbol.toUpperCase()}USDT`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${BINANCE_BASE_URL}/ticker/price?symbol=${pair}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) return null;

            const data = await response.json();
            return parseFloat(data.price) * USD_TO_EUR;
        } catch (e) {
            return null;
        }
    },

    async getOrderBook(symbol: string): Promise<OrderBookAnalysis | null> {
        try {
            const formattedSymbol = `${symbol.toUpperCase()}USDT`;
            const response = await fetch(`${BINANCE_BASE_URL}/depth?symbol=${formattedSymbol}&limit=20`);

            if (!response.ok) return null; // Let consumer handle simulation/fallback

            const data = await response.json();
            return technicalService.calculateOrderBookMetrics(data.bids, data.asks);
        } catch (e) {
            return null;
        }
    },

    async getFundingRate(symbol: string): Promise<DerivativesData | null> {
        try {
            const pair = `${symbol.toUpperCase()}USDT`;
            const response = await fetch(`${BINANCE_FAPI_URL}/premiumIndex?symbol=${pair}`);

            if (!response.ok) return null;

            const data = await response.json();
            const fundingRate = parseFloat(data.lastFundingRate);
            const annualized = fundingRate * 3 * 365 * 100;

            let signal: DerivativesData['signal'] = 'NEUTRAL';
            let interpretation = "Mercado de futuros equilibrado.";

            if (fundingRate > 0.0005) {
                signal = 'LONG_SQUEEZE_RISK';
                interpretation = "Funding Rate extremo positivo. Todos están Long. Riesgo de caída (Long Squeeze).";
            } else if (fundingRate < - 0.0005) {
                signal = 'SHORT_SQUEEZE_RISK';
                interpretation = "Funding Rate negativo extremo. Shorts pagando a Longs. Posible Short Squeeze (Subida).";
            } else if (fundingRate > 0.0002) {
                signal = 'NEUTRAL';
                interpretation = "Ligero sesgo alcista en futuros.";
            }

            return {
                fundingRate,
                annualizedRate: annualized,
                openInterest: 0, // Not available in this endpoint (requires different call)
                signal,
                interpretation
            };

        } catch (e) {
            return null;
        }
    },

    async getHourlyHistory(symbol: string): Promise<any[]> {
        const pair = `${symbol.toUpperCase()}USDT`;
        const response = await fetch(`${BINANCE_BASE_URL}/klines?symbol=${pair}&interval=1h&limit=720`);

        if (!response.ok) throw new Error("API Limit");

        const data = await response.json();
        return data.map((d: any[]) => ({
            time: d[0],
            open: parseFloat(d[1]),
            close: parseFloat(d[4])
        }));
    }
};
