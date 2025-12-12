import React, { useEffect, useState, useRef } from 'react';
import './TurboHunterPage.css';
import { binanceStreamService } from '../services/binanceStreamService';

// No hardcoded pairs anymore
// Service handles dynamic top gainers

interface TokenState {
    symbol: string;
    price: number;
    rsi: number;
    macdLine: number;
    macdSignal: 'BULLISH' | 'BEARISH';
    timestamp: number;
}

export const TurboHunterPage: React.FC = () => {
    const [tokens, setTokens] = useState<TokenState[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const updateIntervalRef = useRef<any>(null);

    useEffect(() => {
        // 1. Initialize Service (Auto-scans top gainers)
        binanceStreamService.start();
        setIsConnected(true);

        // 2. Start Polling Loop for UI (Real-time update 1000ms)
        updateIntervalRef.current = setInterval(() => {
            const updates: TokenState[] = [];

            // Get dynamically whatever the service is tracking
            const activePairs = binanceStreamService.getActiveSymbols();

            for (const pair of activePairs) {
                const data = binanceStreamService.getRealTimeTechnicals(pair);
                if (data) {
                    updates.push(data as TokenState);
                }
            }

            // Only update if we have data to avoid jitter
            if (updates.length > 0) {
                setTokens(prev => {
                    return updates.sort((a, b) => {
                        // Sort by "Actionable" urgency (Extreme RSI first)
                        const aDist = Math.abs(a.rsi - 50);
                        const bDist = Math.abs(b.rsi - 50);
                        return bDist - aDist;
                    });
                });
            }
        }, 1000);

        return () => {
            if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
            // We usually don't disconnect the service as it might be global, but for this page it's fine
        };
    }, []);

    const getRsiColor = (rsi: number) => {
        if (rsi <= 30) return 'text-green'; // Oversold -> Buy
        if (rsi >= 70) return 'text-red';   // Overbought -> Sell
        return 'text-neutral';
    };

    const getSignal = (t: TokenState) => {
        if (t.rsi <= 30 && t.macdSignal === 'BULLISH') return { label: 'STRONG BUY', class: 'badge-buy' };
        if (t.rsi <= 35) return { label: 'OVERSOLD', class: 'badge-buy' };
        if (t.rsi >= 70 && t.macdSignal === 'BEARISH') return { label: 'STRONG SELL', class: 'badge-sell' };
        if (t.rsi >= 65) return { label: 'OVERBOUGHT', class: 'badge-sell' };
        return null;
    };

    return (
        <div className="turbo-hunter-page">
            <header className="turbo-header">
                <div className="turbo-title">🚀 Binance Turbo Hunter</div>
                <div className="turbo-status">
                    <div className="status-dot"></div>
                    {isConnected ? 'LIVE WEBSOCKET FEED (1m Candles)' : 'CONNECTING...'}
                </div>
            </header>

            {tokens.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.5 }}>
                    <h3>Initializing Data Streams...</h3>
                    <p>Collecting initial 30m candle history from Binance...</p>
                </div>
            ) : (
                <div className="turbo-grid">
                    {tokens.map(token => {
                        const signal = getSignal(token);
                        const isBullish = token.macdSignal === 'BULLISH';

                        return (
                            <div key={token.symbol} className={`turbo-card ${signal ? (signal.label.includes('BUY') ? 'signal-bullish' : 'signal-bearish') : ''}`}>
                                {signal && <div className={`signal-badge ${signal.class}`}>{signal.label}</div>}

                                <div className="card-header">
                                    <div className="token-pair">{token.symbol.replace('USDT', '')}/USDT</div>
                                    <div className="token-price">${token.price < 1 ? token.price.toFixed(6) : token.price.toFixed(2)}</div>
                                </div>

                                <div className="tech-grid">
                                    <div className="tech-item">
                                        <div className="tech-label">RSI (14)</div>
                                        <div className={`tech-value ${getRsiColor(token.rsi)}`}>
                                            {token.rsi.toFixed(1)}
                                        </div>
                                    </div>
                                    <div className="tech-item">
                                        <div className="tech-label">MACD (12,26)</div>
                                        <div className={`tech-value ${isBullish ? 'text-green' : 'text-red'}`}>
                                            {token.macdSignal}
                                        </div>
                                    </div>
                                    <div className="tech-item">
                                        <div className="tech-label">MACD VAL</div>
                                        <div className="tech-value text-neutral">
                                            {token.macdLine.toFixed(6)}
                                        </div>
                                    </div>
                                    <div className="tech-item">
                                        <div className="tech-label">TIMESTAMP</div>
                                        <div className="tech-value text-neutral" style={{ fontSize: '10px' }}>
                                            {new Date(token.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
