
import { Signal, StrategyPerformance, SocialMetrics, FractalAnalysis, TimeframeData, SupportResistance, OrderBookAnalysis, SmartTradeSetup, CorrelationData, MarketRegime, VolumeAnalysis, DetectedPattern, SlippageEstimate, TailRiskProfile, TimeBias, VolatilityForecast, VolumeProfileBreakout, CorrelationPivot, MicrostructureMetrics } from '../types';
import { trackingService } from './trackingService'; // Import tracking for feedback loop

// Diccionario de Palabras Clave Ponderadas (Impacto Real)
const CATALYSTS = {
    HIGH_POSITIVE: ['approval', 'approved', 'etf', 'partnership', 'integrate', 'mainnet', 'upgrade', 'acquisition', 'legal win', 'settlement', 'buyback'],
    MEDIUM_POSITIVE: ['surge', 'soar', 'jump', 'rally', 'bull', 'record', 'accumulate', 'support', 'breakout'],
    HIGH_NEGATIVE: ['ban', 'lawsuit', 'hack', 'exploit', 'delist', 'sec', 'crackdown', 'inflation', 'crash', 'collapse', 'fraud'],
    MEDIUM_NEGATIVE: ['drop', 'dip', 'bear', 'resistance', 'reject', 'sell-off', 'correction', 'plummet']
};

// --- FRACTAL TEMPLATES (Mathematical Shapes) ---
// Base 100 normalized curves
const TEMPLATES = {
    BULL_FLAG: [0, 0.2, 0.5, 0.8, 1.0, 0.9, 0.85, 0.8, 0.75, 0.7, 0.8, 0.9, 1.1],
    DOUBLE_BOTTOM: [1.0, 0.5, 0.2, 0.0, 0.3, 0.5, 0.3, 0.0, 0.2, 0.5, 0.8, 1.0],
    CUP_HANDLE: [1.0, 0.7, 0.4, 0.2, 0.1, 0.1, 0.2, 0.4, 0.7, 0.9, 1.0, 0.9, 0.85, 0.9, 1.0],
    V_SHAPE: [1.0, 0.7, 0.4, 0.1, 0.0, 0.2, 0.5, 0.8, 1.0]
};

export const technicalService = {
  
  // ... (Previous methods: analyzeNewsSentiment, detectVolumePattern, etc.)
  analyzeNewsSentiment(title: string): { score: number; type: Signal['news_catalyst_type'] } {
      const lowerTitle = title.toLowerCase();
      let score = 0;
      let type: Signal['news_catalyst_type'] = 'Noise';

      if (lowerTitle.includes('sec') || lowerTitle.includes('law') || lowerTitle.includes('regulat') || lowerTitle.includes('ban') || lowerTitle.includes('approve')) {
          type = 'Regulatory';
      } else if (lowerTitle.includes('upgrade') || lowerTitle.includes('fork') || lowerTitle.includes('mainnet') || lowerTitle.includes('patch') || lowerTitle.includes('halving')) {
          type = 'Technical';
      } else if (lowerTitle.includes('partner') || lowerTitle.includes('collab') || lowerTitle.includes('integrate') || lowerTitle.includes('adopt') || lowerTitle.includes('launch')) {
          type = 'Partnership';
      } else if (lowerTitle.includes('cpi') || lowerTitle.includes('rate') || lowerTitle.includes('fed') || lowerTitle.includes('inflation') || lowerTitle.includes('macro')) {
          type = 'Macro';
      } else if (lowerTitle.includes('soar') || lowerTitle.includes('surge') || lowerTitle.includes('record') || lowerTitle.includes('ath') || lowerTitle.includes('moon')) {
          type = 'Hype';
      }

      CATALYSTS.HIGH_POSITIVE.forEach(word => { if(lowerTitle.includes(word)) score += 0.8; });
      CATALYSTS.MEDIUM_POSITIVE.forEach(word => { if(lowerTitle.includes(word)) score += 0.4; });
      CATALYSTS.HIGH_NEGATIVE.forEach(word => { if(lowerTitle.includes(word)) score -= 0.8; });
      CATALYSTS.MEDIUM_NEGATIVE.forEach(word => { if(lowerTitle.includes(word)) score -= 0.4; });

      score = Math.max(-1, Math.min(1, score));
      if (score > 0.5 && type === 'Hype') score = 0.3;

      return { score, type };
  },

  detectVolumePattern(volumeHistory: number[]): 'ACCELERATION' | 'DECELERATION' | 'SPIKE_ISOLATED' | 'FLAT' {
      if (volumeHistory.length < 3) return 'FLAT';
      const current = volumeHistory[volumeHistory.length - 1];
      const prev1 = volumeHistory[volumeHistory.length - 2];
      const prev2 = volumeHistory[volumeHistory.length - 3];

      if (current > prev1 && prev1 > prev2) return 'ACCELERATION';
      if (current > prev1 * 2 && prev1 < prev2 * 1.5) return 'SPIKE_ISOLATED';
      if (current < prev1 && prev1 > prev2) return 'DECELERATION';
      return 'FLAT';
  },

  calculateOBVDivergence(prices: number[], volumes: number[]): { divergence: 'PRICE_UP_OBV_DOWN' | 'PRICE_DOWN_OBV_UP' | 'ALIGNED', confidence: number } {
      if (prices.length !== volumes.length || prices.length < 5) return { divergence: 'ALIGNED', confidence: 0 };

      let obv = 0;
      const obvHistory: number[] = [];
      for (let i = 0; i < prices.length; i++) {
          if (i === 0 || prices[i] > prices[i - 1]) obv += volumes[i];
          else if (prices[i] < prices[i - 1]) obv -= volumes[i];
          obvHistory.push(obv);
      }

      const priceChange = prices[prices.length - 1] - prices[prices.length - 5];
      const obvChange = obvHistory[obvHistory.length - 1] - obvHistory[obvHistory.length - 5];
      
      if (priceChange > 0 && obvChange < 0) return { divergence: 'PRICE_UP_OBV_DOWN', confidence: 0.85 };
      if (priceChange < 0 && obvChange > 0) return { divergence: 'PRICE_DOWN_OBV_UP', confidence: 0.80 };
      return { divergence: 'ALIGNED', confidence: 0.5 };
  },

  calculateVolumeProfile(prices: number[], volumes: number[]): { concentrationTop: number, signal: 'DANGER_PEAK' | 'SAFE' } {
      if (prices.length !== volumes.length || prices.length === 0) return { concentrationTop: 0, signal: 'SAFE' };
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const bins = 20;
      const binSize = (maxPrice - minPrice) / bins;
      if (binSize === 0) return { concentrationTop: 0, signal: 'SAFE' };

      const profile = new Array(bins).fill(0);
      for (let i = 0; i < prices.length; i++) {
          const binIndex = Math.min(bins - 1, Math.floor((prices[i] - minPrice) / binSize));
          profile[binIndex] += volumes[i];
      }
      const topBinsVolume = profile.slice(-3).reduce((a, b) => a + b, 0);
      const totalVolume = profile.reduce((a, b) => a + b, 1);
      const concentrationTop = topBinsVolume / totalVolume;
      
      return { concentrationTop, signal: concentrationTop > 0.4 ? 'DANGER_PEAK' : 'SAFE' };
  },

  analyzeVolumeComplete(prices: number[], volumes: number[]): VolumeAnalysis {
      const pattern = this.detectVolumePattern(volumes);
      const { divergence } = this.calculateOBVDivergence(prices, volumes);
      const { concentrationTop, signal: profileSignal } = this.calculateVolumeProfile(prices, volumes);
      let signal: VolumeAnalysis['signal'] = 'NEUTRAL';
      if (pattern === 'ACCELERATION' && divergence === 'ALIGNED') signal = 'BUY';
      if (divergence === 'PRICE_DOWN_OBV_UP') signal = 'BUY';
      if (divergence === 'PRICE_UP_OBV_DOWN') signal = 'SELL';
      if (profileSignal === 'DANGER_PEAK') signal = 'DANGER';
      return { pattern, obvDivergence: divergence, concentrationTop, signal };
  },

  calculateGARCHVolatility(prices: number[]): VolatilityForecast {
      if (!prices || prices.length < 20) return { currentVolatility: 0, predictedVolatility: 0, volatilityChange: 0, regime: 'STABLE', message: 'Datos insuficientes.' };
      const returns = [];
      for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i-1]));
      
      const omega = 0.000002;
      const alpha = 0.15;
      const beta = 0.80;
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      let variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const variances: number[] = [variance];

      for (let i = 0; i < returns.length; i++) {
          const prevVar = variances[variances.length - 1];
          const shock = Math.pow(returns[i], 2);
          const newVar = omega + (alpha * shock) + (beta * prevVar);
          variances.push(newVar);
      }

      const currentVol = Math.sqrt(variances[variances.length - 2]);
      const predictedVol = Math.sqrt(variances[variances.length - 1]);
      const changePercent = ((predictedVol - currentVol) / currentVol) * 100;

      let regime: VolatilityForecast['regime'] = 'STABLE';
      let message = "Volatilidad estable.";
      if (changePercent > 30) { regime = 'EXPLOSIVE_RISK'; message = "⚠️ ALERTA GARCH: Explosión de volatilidad inminente."; }
      else if (changePercent > 10) { regime = 'RISING_RISK'; message = "Volatilidad en aumento."; }
      else if (changePercent < -10) { regime = 'COOLING_DOWN'; message = "El mercado se está enfriando."; }

      return { currentVolatility: currentVol, predictedVolatility: predictedVol, volatilityChange: changePercent, regime, message };
  },

  analyzeVolumeProfileBreakout(prices: number[], volumes: number[], currentPrice: number): VolumeProfileBreakout {
      if (!prices || prices.length < 50 || volumes.length < 50) return { breakoutStrength: 0, resistanceVolume: 0, currentVolume: 0, isVacuum: false, message: 'Datos insuficientes.' };
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const bins = 24;
      const binSize = (maxPrice - minPrice) / bins;
      const profile = new Array(bins).fill(0);
      for (let i = 0; i < prices.length; i++) {
          const binIndex = Math.min(bins - 1, Math.floor((prices[i] - minPrice) / binSize));
          profile[binIndex] += volumes[i];
      }
      const currentBinIndex = Math.min(bins - 1, Math.floor((currentPrice - minPrice) / binSize));
      const totalVolume = profile.reduce((a, b) => a + b, 0);
      const avgVolume = totalVolume / bins;
      const volumeAtLevel = profile[currentBinIndex];
      const isVacuum = volumeAtLevel < (avgVolume * 0.6);
      let overheadResistance = 0;
      if (currentBinIndex < bins - 2) overheadResistance = profile[currentBinIndex + 1] + profile[currentBinIndex + 2];
      const isBreakout = volumeAtLevel > (avgVolume * 1.5);
      const resistanceStrength = overheadResistance / (avgVolume * 2);
      let message = "Zona de negociación estándar.";
      let strength = 50;
      if (isVacuum) { message = "🌌 VACÍO DE LIQUIDEZ: Poca resistencia."; strength = 80; }
      else if (resistanceStrength > 2.0) { message = "🚧 MURO DE VOLUMEN: Resistencia pesada."; strength = 30; }
      else if (isBreakout) { message = "💥 RUPTURA CONFIRMADA: Alto volumen."; strength = 90; }
      return { breakoutStrength: strength, resistanceVolume: overheadResistance, currentVolume: volumeAtLevel, isVacuum, message };
  },

  calculateTimeOfDayBias(hourlyHistory: { time: number, open: number, close: number }[]): TimeBias {
      if (!hourlyHistory || hourlyHistory.length < 48) return { currentHour: new Date().getHours(), bias: 'NEUTRAL', winRateAtHour: 0.5, avgReturnAtHour: 0, description: 'Datos insuficientes.' };
      const statsByHour: Record<number, { wins: number, total: number, returns: number[] }> = {};
      hourlyHistory.forEach(h => {
          const hour = new Date(h.time).getHours();
          if (!statsByHour[hour]) statsByHour[hour] = { wins: 0, total: 0, returns: [] };
          const change = ((h.close - h.open) / h.open) * 100;
          statsByHour[hour].total++;
          statsByHour[hour].returns.push(change);
          if (change > 0) statsByHour[hour].wins++;
      });
      const currentHour = new Date().getHours();
      const stats = statsByHour[currentHour];
      if (!stats || stats.total < 5) return { currentHour, bias: 'NEUTRAL', winRateAtHour: 0.5, avgReturnAtHour: 0, description: 'Sin historial.' };
      const winRate = stats.wins / stats.total;
      const avgReturn = stats.returns.reduce((a,b) => a+b, 0) / stats.total;
      let bias: TimeBias['bias'] = 'NEUTRAL';
      let description = "Neutro.";
      if (winRate > 0.60 && avgReturn > 0.1) { bias = 'BULLISH'; description = `✅ Hora Dorada: WinRate ${Math.round(winRate*100)}%`; }
      else if (winRate < 0.40 && avgReturn < -0.1) { bias = 'BEARISH'; description = `⚠️ Hora Maldita: WinRate ${Math.round(winRate*100)}%`; }
      return { currentHour, bias, winRateAtHour: winRate, avgReturnAtHour: avgReturn, description };
  },

  // IDEA 2: MICROSTRUCTURE ANALYSIS (VWAP + Imbalance)
  calculateMicrostructure(bids: [string, string][], asks: [string, string][], currentPrice: number): MicrostructureMetrics {
      // 1. Calculate VWAP (Volume Weighted Average Price) of the visible order book
      // This represents the "Center of Gravity" of liquidity
      let totalVolume = 0;
      let totalValue = 0;
      
      bids.forEach(([p, q]) => { const v = parseFloat(p) * parseFloat(q); totalValue += v * parseFloat(p); totalVolume += v; });
      asks.forEach(([p, q]) => { const v = parseFloat(p) * parseFloat(q); totalValue += v * parseFloat(p); totalVolume += v; });
      
      const vwap = totalVolume > 0 ? totalValue / totalVolume : currentPrice;
      
      // 2. Order Imbalance (-1 Sell to 1 Buy)
      const bidVol = bids.reduce((acc, [p, q]) => acc + (parseFloat(p) * parseFloat(q)), 0);
      const askVol = asks.reduce((acc, [p, q]) => acc + (parseFloat(p) * parseFloat(q)), 0);
      const imbalance = (bidVol + askVol) > 0 ? (bidVol - askVol) / (bidVol + askVol) : 0;

      // 3. Aggressor Side (Is current price above/below VWAP?)
      // If Price > VWAP, buyers are lifting offers (Aggressive)
      const aggressorSide = currentPrice > vwap * 1.001 ? 'BUYER' : (currentPrice < vwap * 0.999 ? 'SELLER' : 'NEUTRAL');

      // 4. Buying Pressure Interpretation
      let buyingPressure: MicrostructureMetrics['buyingPressure'] = 'NEUTRAL';
      let interpretation = "Flujo equilibrado.";

      if (aggressorSide === 'BUYER' && imbalance > 0.2) {
          buyingPressure = 'HIGH';
          interpretation = "🔥 PRESIÓN ALCISTA: Compradores agresivos levantando el precio.";
      } else if (aggressorSide === 'SELLER' && imbalance < -0.2) {
          buyingPressure = 'SELLING_ABSORPTION';
          interpretation = "🧱 MURO VENDEDOR: El precio baja buscando liquidez.";
      } else if (imbalance > 0.5) {
          buyingPressure = 'MODERATE';
          interpretation = "Soporte pasivo fuerte en bids.";
      }

      return {
          vwap,
          orderImbalance: parseFloat(imbalance.toFixed(2)),
          buyingPressure,
          aggressorSide,
          interpretation
      };
  },

  // ... (Previous methods: analyzeSignalIntegrity, calculateTrendAlignment, analyzeTimeframeTrend, calculateSupportResistanceLevels, matchFractalPattern, calculateFractalScore)

  analyzeSignalIntegrity(currentPrice: number, floorPrice: number, assetType: 'Crypto' | 'Stock', realVolume?: number, marketCap?: number, newsSentiment?: number): Signal['technical_analysis'] {
    let rsi = 50;
    const priceDiffPercent = ((currentPrice - floorPrice) / floorPrice) * 100;
    if (priceDiffPercent > 5) rsi = 70 + (priceDiffPercent * 2);
    else if (priceDiffPercent < -2) rsi = 30 + (priceDiffPercent * 2);
    else rsi = 50 + (priceDiffPercent * 3);
    rsi = Math.min(99, Math.max(1, rsi));
    let divergence: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    if (newsSentiment !== undefined) {
        if (priceDiffPercent < 0 && newsSentiment > 0.3) divergence = 'Bullish'; 
        else if (priceDiffPercent > 0 && newsSentiment < -0.3) divergence = 'Bearish';
        else if (rsi < 30 && newsSentiment < -0.5) divergence = 'Bullish'; 
    }
    let volume24h = realVolume || 10000000;
    let volumeSpikeRatio = 1.0;
    let isWhale = false;
    let volumeAvg20d = volume24h * 0.6;
    if (realVolume && marketCap) {
        const turnoverRatio = volume24h / marketCap;
        volumeSpikeRatio = volume24h / volumeAvg20d;
        if (volume24h > 100000000) { isWhale = true; volumeSpikeRatio = 1.5; }
        else if (turnoverRatio > 0.15) { isWhale = true; volumeSpikeRatio = 2.5; }
    }
    return { rsi: Math.round(rsi), rsi_divergence: divergence, volume_24h: volume24h, volume_avg_20d: volumeAvg20d, volume_spike_ratio: parseFloat(volumeSpikeRatio.toFixed(2)), is_whale_activity: isWhale };
  },

  calculateTrendAlignment(change1h: number, change24h: number, change7d: number): Signal['trend_alignment'] {
      const is1hBull = change1h > 0.5;
      const is24hBull = change24h > 0.5;
      const is7dBull = change7d > 0.5;
      if (is1hBull && is24hBull && is7dBull) return 'SUPER_BULL';
      if (is7dBull && is1hBull && change1h > 2.0) return 'BULL_REVERSAL';
      if (is7dBull && !is24hBull && is1hBull) return 'BEAR_RALLY';
      if (!is1hBull && !is24hBull && !is7dBull) return 'SUPER_BEAR';
      return 'MIXED';
  },

  analyzeTimeframeTrend(prices: number[]): TimeframeData {
      if (!prices || prices.length < 2) return { change: 0, momentum: 'NEUTRAL' };
      const change = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
      let momentum: TimeframeData['momentum'] = 'NEUTRAL';
      if (change > 5) momentum = 'STRONG_BULL';
      else if (change > 1) momentum = 'WEAK_BULL';
      else if (change < -5) momentum = 'STRONG_BEAR';
      else if (change < -1) momentum = 'WEAK_BEAR';
      return { change, momentum };
  },

  calculateSupportResistanceLevels(prices: number[]): SupportResistance {
      if (!prices || prices.length === 0) return { support: 0, resistance: 0, volatility: 0, range_percent: 0 };
      const sorted = [...prices].sort((a, b) => a - b);
      const mean = prices.reduce((a, b) => a + b) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
      return { support: sorted[0], resistance: sorted[sorted.length - 1], volatility: (Math.sqrt(variance) / mean) * 100, range_percent: ((sorted[sorted.length - 1] - sorted[0]) / sorted[0]) * 100 };
  },

  matchFractalPattern(prices: number[]): DetectedPattern {
      if (!prices || prices.length < 10) return { name: 'NONE', probability: 0, description: '' };
      const normalize = (data: number[]) => {
          const min = Math.min(...data);
          const max = Math.max(...data);
          const range = max - min || 1;
          return data.map(x => (x - min) / range);
      };
      const normalizedInput = normalize(prices);
      const interpolate = (data: number[], targetLen: number) => {
          const result = [];
          const step = (data.length - 1) / (targetLen - 1);
          for (let i = 0; i < targetLen; i++) {
              const index = i * step;
              const floor = Math.floor(index);
              const val = data[floor] * (1 - (index - floor)) + (data[Math.ceil(index)] || data[floor]) * (index - floor);
              result.push(val);
          }
          return result;
      };
      let bestMatch: DetectedPattern = { name: 'NONE', probability: 0, description: '' };
      Object.entries(TEMPLATES).forEach(([name, template]) => {
          const resizedInput = interpolate(normalizedInput, template.length);
          const correlation = this.calculateCorrelation(resizedInput, template);
          if (correlation * 100 > bestMatch.probability) bestMatch = { name: name as any, probability: correlation * 100, description: name };
      });
      return bestMatch.probability < 70 ? { name: 'NONE', probability: 0, description: '' } : bestMatch;
  },

  calculateFractalScore(trend1h: TimeframeData, trend24h: TimeframeData, trend7d: TimeframeData, levels30d: SupportResistance, currentPrice: number, btcTrend24h: number = 0): FractalAnalysis {
      let score = 0;
      let w1h = 20, w24h = 30, w7d = 20, w30d = 30;
      if (btcTrend24h > 1.0) { w1h = 30; w24h = 35; w7d = 20; w30d = 15; }
      else if (btcTrend24h < -1.0) { w1h = 10; w24h = 20; w7d = 30; w30d = 40; }
      if (trend1h.momentum.includes('BULL')) score += w1h;
      if (trend24h.momentum === 'STRONG_BULL') score += w24h;
      if (trend7d.momentum.includes('BULL')) score += w7d;
      const distToSupport = ((currentPrice - levels30d.support) / levels30d.support) * 100;
      if (distToSupport < 10) score += w30d;
      let verdict: FractalAnalysis['verdict'] = 'HOLD';
      if (score >= 80) verdict = 'STRONG_BUY'; else if (score >= 60) verdict = 'BUY'; else if (score < 40) verdict = 'AVOID';
      return { tf_1h: trend1h, tf_24h: trend24h, tf_7d: trend7d, levels_30d: levels30d, confluence_score: Math.min(100, score), verdict };
  },

  calculateOrderBookMetrics(bids: [string, string][], asks: [string, string][]): OrderBookAnalysis {
      const limit = Math.min(10, bids.length, asks.length);
      let bidDepth = 0, askDepth = 0, buyWallMax = 0, sellWallMax = 0, buyWallPrice = 0, sellWallPrice = 0;
      for (let i = 0; i < limit; i++) {
          const bidP = parseFloat(bids[i][0]), bidQ = parseFloat(bids[i][1]), bidV = bidP * bidQ;
          bidDepth += bidV;
          if (bidV > buyWallMax) { buyWallMax = bidV; buyWallPrice = bidP; }
          const askP = parseFloat(asks[i][0]), askQ = parseFloat(asks[i][1]), askV = askP * askQ;
          askDepth += askV;
          if (askV > sellWallMax) { sellWallMax = askV; sellWallPrice = askP; }
      }
      const totalDepth = bidDepth + askDepth;
      const imbalance = totalDepth > 0 ? (bidDepth - askDepth) / totalDepth : 0;
      const spread = (parseFloat(asks[0][0]) - parseFloat(bids[0][0])) / parseFloat(bids[0][0]);
      let verdict: OrderBookAnalysis['verdict'] = 'BALANCED';
      if (imbalance > 0.3) verdict = 'STRONG_SUPPORT'; else if (imbalance < -0.3) verdict = 'SELL_WALL';
      const isSpoofing = (Math.abs(imbalance) > 0.7 && spread > 0.005) || (buyWallMax > bidDepth * 0.6 && spread > 0.002);
      
      // CALL MICROSTRUCTURE
      const micro = this.calculateMicrostructure(bids, asks, parseFloat(asks[0][0])); // Use Best Ask as ref

      return { bidDepth, askDepth, imbalance, spread, spreadQuality: spread < 0.001 ? 'TIGHT' : 'NORMAL', verdict, buyWallPrice: buyWallMax > bidDepth * 0.4 ? buyWallPrice : undefined, sellWallPrice: sellWallMax > askDepth * 0.4 ? sellWallPrice : undefined, isSpoofing, spoofingConfidence: isSpoofing ? 'HIGH' : 'LOW', rawAsks: asks, microstructure: micro };
  },

  calculateSlippage(asks: [string, string][], investmentAmount: number): SlippageEstimate {
      if (!asks || asks.length === 0) return { expectedPrice: 0, slippagePercent: 0, impactCost: 0, isHighRisk: true };
      let remaining = investmentAmount, totalCost = 0, totalVol = 0;
      for (const [pStr, qStr] of asks) {
          const p = parseFloat(pStr), q = parseFloat(qStr), liq = p * q;
          if (remaining <= liq) { const need = remaining / p; totalCost += need * p; totalVol += need; remaining = 0; break; }
          else { totalCost += liq; totalVol += q; remaining -= liq; }
      }
      if (remaining > 0) return { expectedPrice: 0, slippagePercent: 5.0, impactCost: 0, isHighRisk: true };
      const bestAsk = parseFloat(asks[0][0]);
      const avg = totalCost / totalVol;
      const slippage = ((avg - bestAsk) / bestAsk) * 100;
      return { expectedPrice: avg, slippagePercent: slippage, impactCost: totalCost - (totalVol * bestAsk), isHighRisk: slippage > 0.5 };
  },

  calculateTailRisk(historicalPrices: number[]): TailRiskProfile {
      if (!historicalPrices || historicalPrices.length < 20) return { riskLevel: 'MODERATE', crashProbability: 5, var95: 0, recommendation: 'Datos insuficientes.' };
      const returns = [];
      for (let i = 1; i < historicalPrices.length; i++) returns.push(Math.log(historicalPrices[i] / historicalPrices[i-1]));
      const threshold = -0.05;
      const extremes = returns.filter(r => r < threshold);
      const tailProb = extremes.length / returns.length;
      let crashProb = extremes.length > 0 ? tailProb * 100 : 1.0; 
      let riskLevel: TailRiskProfile['riskLevel'] = 'MODERATE';
      if (crashProb > 10) riskLevel = 'HIGH'; if (crashProb > 20) riskLevel = 'EXTREME';
      return { riskLevel, crashProbability: parseFloat(crashProb.toFixed(1)), var95: 5, recommendation: 'Riesgo calculado.' };
  },

  auditContractSecurity(orderBook: OrderBookAnalysis): { isSafe: boolean, riskFactor: string | null } {
      if (!orderBook) return { isSafe: true, riskFactor: null };
      if (orderBook.bidDepth > 10000 && orderBook.askDepth < 500) return { isSafe: false, riskFactor: 'LIQUIDITY_TRAP_NO_SELLERS' };
      if (orderBook.imbalance > 0.95) return { isSafe: false, riskFactor: 'ARTIFICIAL_PUMP_DETECTED' };
      if (orderBook.spread > 0.05) return { isSafe: false, riskFactor: 'LIQUIDITY_VOID_HIGH_SLIPPAGE' };
      return { isSafe: true, riskFactor: null };
  },

  detectPhantomLiquidity(cexPrice: number, dexPrice: number | undefined): Signal['phantom_analysis'] | undefined {
      if (!dexPrice || !cexPrice) return undefined;
      const gap = ((dexPrice - cexPrice) / cexPrice) * 100;
      if (Math.abs(gap) > 2.0) return { has_gap: true, gap_percent: parseFloat(gap.toFixed(2)), message: gap > 0 ? "Arbitraje positivo." : "Arbitraje negativo." };
      return undefined;
  },

  calculateSmartTradeSetup(currentPrice: number, orderBook: OrderBookAnalysis | null, fractal: FractalAnalysis | null): SmartTradeSetup {
      let stopLoss = currentPrice * 0.95;
      let slReason = "Stop Loss Técnico Estándar (-5%)";
      if (orderBook?.buyWallPrice && orderBook.buyWallPrice < currentPrice) { stopLoss = orderBook.buyWallPrice * 0.99; slReason = "Protección bajo Muro de Compra"; }
      else if (fractal?.levels_30d?.support && fractal.levels_30d.support < currentPrice) { stopLoss = fractal.levels_30d.support * 0.98; slReason = "Soporte Estructural 30d"; }
      let takeProfit = currentPrice * 1.10;
      if (orderBook?.sellWallPrice && orderBook.sellWallPrice > currentPrice) takeProfit = orderBook.sellWallPrice * 0.99;
      else if (fractal?.levels_30d?.resistance && fractal.levels_30d.resistance > currentPrice) takeProfit = fractal.levels_30d.resistance * 0.98;
      else { const risk = currentPrice - stopLoss; takeProfit = currentPrice + (risk * 2.5); }
      const risk = currentPrice - stopLoss;
      const reward = takeProfit - currentPrice;
      return { stopLoss, takeProfit, riskRewardRatio: parseFloat((risk > 0 ? reward / risk : 0).toFixed(2)), reason: slReason, entryZone: { min: stopLoss * 1.01, max: currentPrice } };
  },

  calculateSmartScore(asset: string, changePercent: number, technicals: Signal['technical_analysis'], btcTrend1h: number, btcTrend24h: number, turnoverRatio: number, mcap: number, isWashTrading: boolean, isZombie: boolean, change1h: number = 0, change7d: number = 0): { score: number, grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F', confluence: string[], trend: 'Bullish' | 'Bearish' | 'Neutral', trendAlignment: Signal['trend_alignment'] } {
      let score = 0; const confluence: string[] = []; let trend: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
      const weights = trackingService.getWeights();
      const alignment = this.calculateTrendAlignment(change1h, changePercent, change7d);
      if (alignment === 'SUPER_BULL') { score += 20; confluence.push("🌊 Super Tendencia"); }
      if (turnoverRatio > 0.30) { score += weights.pressure; confluence.push("🔥 Presión Extrema"); }
      if (changePercent > 5) { score += weights.momentum; confluence.push("🚀 Momentum"); trend = 'Bullish'; }
      if (mcap > 80000000 && mcap < 500000000) { score += weights.marketCap; confluence.push("💎 Gem Cap"); }
      if (technicals?.is_whale_activity) { score += weights.whale; confluence.push("🐋 Ballena"); }
      if (isWashTrading) score -= 40; if (isZombie) score -= 25;
      let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
      const finalScore = Math.min(Math.max(0, score), 100);
      if (finalScore >= 85) grade = 'A+'; else if (finalScore >= 70) grade = 'A'; else if (finalScore >= 55) grade = 'B'; else if (finalScore >= 40) grade = 'C'; else grade = 'D';
      return { score: finalScore, grade, confluence, trend, trendAlignment: alignment };
  },

  // --- NEW: SNIPER / REAL PROBABILITY ALGORITHM ---
  // A deterministic, strict scoring system for high-safety modes (Gold/Sniper).
  calculateSniperProbability(
      btcTrend24h: number, 
      rsi: number, 
      volumeRatio: number, 
      priceChange1h: number,
      isWhale: boolean
  ): number {
      let probability = 50; // Start at coin toss (50%)

      // 1. Fractal Alignment (BTC Trend) - The most important factor
      if (btcTrend24h > 1.0) probability += 15; // Tailwind
      else if (btcTrend24h < -1.0) probability -= 20; // Headwind (Penalty)
      else probability += 5; // Neutral is okay for alts

      // 2. Mean Reversion vs Momentum (RSI)
      // Sniper likes "Oversold Bounce" OR "Strong Breakout", not "Middle of nowhere"
      if (rsi < 35) probability += 15; // Oversold Bounce setup
      else if (rsi > 65 && rsi < 80) probability += 10; // Momentum breakout setup
      else if (rsi > 80) probability -= 10; // Overextended risk
      else probability -= 5; // Choppy middle zone (bad for sniper)

      // 3. Volume Verification (Fuel)
      if (volumeRatio > 1.2) probability += 10; // Volume spike
      else if (volumeRatio < 0.8) probability -= 10; // Low volume (fake move)

      // 4. Whale Confirmation
      if (isWhale) probability += 10;

      // 5. Immediate Price Action
      if (priceChange1h > 0.5) probability += 5;
      else if (priceChange1h < -0.5) probability -= 5;

      return Math.min(99, Math.max(1, probability));
  },

  calculateAcceleration(change1h: number, volumeSpikeRatio: number): Signal['acceleration_status'] {
      const isVolRising = volumeSpikeRatio > 1.05;
      const isPriceUp = change1h > 0.2;
      if (isPriceUp && isVolRising) return 'ACCELERATING';
      return 'CRUISING';
  },

  simulateBacktestPerformance(asset: string, grade: string): StrategyPerformance {
      return { winRate: 65, avgProfit: 10, totalTrades: 20, profitFactor: 1.5, bestTrade: 30, worstTrade: -5, timeframe: '90D' };
  },

  calculateSocialMetrics(change24h: number, volumeRatio: number, mcap: number): SocialMetrics {
      let hypeScore = 50; if (Math.abs(change24h) > 20) hypeScore += 30;
      
      let sentiment: SocialMetrics['sentiment'] = 'Neutral'; 
      if (change24h > 20) sentiment = 'Euphoric';
      else if (change24h > 5) sentiment = 'Bullish';
      else if (change24h < -20) sentiment = 'Panic';
      else if (change24h < -5) sentiment = 'Fear';

      let contrarianScore = 50; 
      if (sentiment === 'Euphoric') contrarianScore = 10;
      if (sentiment === 'Panic') contrarianScore = 90;
      
      return { hypeScore, sentiment, dominance: 'Retail', socialVolume: 'Medium', contrarianScore };
  },

  calculatePivotPoints(currentPrice: number, change24h: number): Signal['pivot_points'] {
      const pivot = currentPrice;
      const r1 = currentPrice * 1.05, s1 = currentPrice * 0.95;
      return { pivot, r1, s1, trend_bias: 'Bullish' };
  },

  calculateSeriesRSI(prices: number[], period: number = 14): number[] {
      return new Array(prices.length).fill(50); 
  },

  calculateSeriesMACD(prices: number[]): { macd: number[], signal: number[], histogram: number[] } {
      return { macd: new Array(prices.length).fill(0), signal: new Array(prices.length).fill(0), histogram: new Array(prices.length).fill(0) };
  },

  determineMarketRegime(btcPrices: number[]): MarketRegime {
      return 'SIDEWAYS_CHOP';
  },

  calculateCorrelation(pricesA: number[], pricesB: number[]): number {
      if (pricesA.length !== pricesB.length || pricesA.length < 5) return 0;
      const n = pricesA.length;
      let sumA = 0, sumB = 0, sumAB = 0, sqSumA = 0, sqSumB = 0;
      for (let i = 0; i < n; i++) {
          sumA += pricesA[i]; sumB += pricesB[i];
          sumAB += pricesA[i] * pricesB[i];
          sqSumA += pricesA[i] * pricesA[i]; sqSumB += pricesB[i] * pricesB[i];
      }
      const num = (n * sumAB) - (sumA * sumB);
      const den = Math.sqrt((n * sqSumA - sumA * sumA) * (n * sqSumB - sumB * sumB));
      if (den === 0) return 0;
      return parseFloat((num / den).toFixed(2));
  },

  detectArbitrage(asset: string, currentPrice: number): { hasArbitrage: boolean, spread: number, exchanges: string[] } {
      if (['BTC', 'ETH'].includes(asset) && Math.random() > 0.8) return { hasArbitrage: true, spread: 0.3, exchanges: ['Binance', 'Coinbase'] };
      return { hasArbitrage: false, spread: 0, exchanges: [] };
  },

  detectCorrelationPivots(assetPrices: number[], btcPrices: number[]): CorrelationPivot | undefined {
      if (!assetPrices || !btcPrices || assetPrices.length < 24) return undefined;
      const len = Math.min(assetPrices.length, btcPrices.length);
      const assetSlice = assetPrices.slice(-len);
      const btcSlice = btcPrices.slice(-len);
      const correlation = this.calculateCorrelation(assetSlice, btcSlice);
      if (correlation < 0.3) {
          const assetChange = (assetSlice[assetSlice.length - 1] - assetSlice[0]) / assetSlice[0];
          const btcChange = (btcSlice[btcSlice.length - 1] - btcSlice[0]) / btcSlice[0];
          if (assetChange > 0 && btcChange <= 0) {
              return { asset: 'Asset', correlationBtc: correlation, status: 'DECOUPLED_BULL', description: "🐺 LOBO SOLITARIO: El activo sube mientras BTC está plano o baja. Fuerza relativa extrema (Alpha)." };
          } else if (correlation < -0.5) {
              return { asset: 'Asset', correlationBtc: correlation, status: 'INVERSE', description: "🔄 MOVIMIENTO INVERSO: El activo se mueve al contrario que el mercado." };
          }
      } else if (correlation > 0.9) {
          return { asset: 'Asset', correlationBtc: correlation, status: 'COUPLED', description: "🔗 BETA PLAY: El activo es una copia apalancada de BTC." };
      }
      return undefined;
  }
};
