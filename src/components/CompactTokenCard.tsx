
import React, { useState, useEffect } from 'react';
import './CompactTokenCard.css';
import techIcon from '../assets/cyberpunk_chip_icon.png';
import { momentumRadarService } from '../services/momentumRadarService';

interface CompactTokenCardProps {
    token: {
        symbol: string;
        name: string;
        logo?: string;
        entryTimestamp?: number;
        creationDate?: number;
        price: number;
        change1h: number;
        change24h?: number;
        marketCap?: number;
        volume24h?: number;
        score?: number;
        strategyId: string;
        tradeUrl?: string;
    };
    onAskAI?: (symbol: string) => void;
    aiAnalysis?: string;
}

export const CompactTokenCard: React.FC<CompactTokenCardProps> = ({ token, onAskAI, aiAnalysis }) => {
    const [showAiView, setShowAiView] = useState(false);
    const formatPrice = (price: number) => {
        if (!price) return '$0.00';
        if (price < 0.0001) return `$${price.toExponential(4)} `;
        if (price < 1) return `$${price.toFixed(5)} `;
        return `$${price.toFixed(2)} `;
    };

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    };

    const formatCompact = (val?: number) => {
        if (!val) return '-';
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)} B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(2)} M`;
        if (val >= 1e3) return `$${(val / 1e3).toFixed(1)} K`;
        return `$${val.toFixed(0)} `;
    };

    const strategyColors: Record<string, string> = {
        standard: '#64748b',
        micro_velocity: '#00d4aa',
        pre_ignition: '#ff9f0a',
        accumulation: '#bf5af2',
        early_riser: '#32ade6'
    };

    const strategyLabels: Record<string, string> = {
        standard: 'STANDARD',
        micro_velocity: 'MICRO VELOCITY',
        pre_ignition: 'PRE-IGNITION',
        accumulation: 'ACCUMULATION',
        early_riser: 'EARLY RISER'
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return '#30d158'; // Green
        if (score >= 50) return '#ff9f0a'; // Orange
        return '#ff453a'; // Red
    };

    const displayScore = token.score || 0;

    const getTimeSinceDiscovery = (timestamp?: number) => {
        if (!timestamp) return 'Recién';
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Hace instantes';
        if (minutes < 60) return `${minutes} m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins} m`;
    };

    const [timeSince, setTimeSince] = useState<string>(getTimeSinceDiscovery(token.entryTimestamp));

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeSince(getTimeSinceDiscovery(token.entryTimestamp));
        }, 60000); // Update every minute to save resources, or 1000 for seconds if needed

        return () => clearInterval(interval);
    }, [token.entryTimestamp]);

    useEffect(() => {
        if (token.score !== undefined && token.score > 0) {
            // Maybe do something with score
        }
    }, [token.score]);

    const handleAiClick = () => {
        if (onAskAI) {
            onAskAI(token.symbol);
            setShowAiView(true);
        }
    };

    if (showAiView) {
        const geminiAnalysis = token.aiData?.geminiAnalysis;

        return (
            <div className="compact-token-card ai-active">
                <div className="ai-analysis-view">
                    <div className="ai-header">
                        <div className="ai-brain-icon">🧠</div>
                        <h3>REPORTE DE ANÁLISIS IA</h3>
                        <button className="close-ai-btn" onClick={() => setShowAiView(false)}>✖</button>
                    </div>

                    <div className="ai-content-scroll">
                        {aiAnalysis ? (
                            <>
                                <div className="ai-text-block">
                                    {aiAnalysis.split('\n').map((line, i) => (
                                        <p key={i} className="ai-line">{line}</p>
                                    ))}
                                </div>

                                {/* 🤖 GEMINI AI ANALYSIS (if available) */}
                                {geminiAnalysis && (
                                    <div className="gemini-analysis-block">
                                        <h4 className="gemini-header">🤖 Análisis Gemini AI</h4>
                                        <div className="gemini-recommendation">
                                            <strong>Recomendación:</strong> {geminiAnalysis.recommendation}
                                            <span className="confidence"> ({geminiAnalysis.confidence}% confianza)</span>
                                        </div>
                                        <div className="gemini-timing">
                                            <strong>Timing:</strong> {geminiAnalysis.entryTiming} |
                                            <strong> Riesgo:</strong> {geminiAnalysis.priceAnalysis.riskLevel}
                                        </div>
                                        <div className="gemini-reasoning">
                                            <strong>Análisis:</strong> {geminiAnalysis.reasoning}
                                        </div>
                                        <div className="gemini-trend">
                                            <strong>Tendencia:</strong> {geminiAnalysis.priceAnalysis.timeInUptrend}
                                        </div>
                                        {geminiAnalysis.keyPoints && geminiAnalysis.keyPoints.length > 0 && (
                                            <div className="gemini-points">
                                                <strong>Puntos Clave:</strong>
                                                <ul>
                                                    {geminiAnalysis.keyPoints.map((point, i) => (
                                                        <li key={i}>{point}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="ai-loading">
                                <div className="spinner-small"></div>
                                <span>Analizando datos de {token.symbol}...</span>
                            </div>
                        )}
                    </div>

                    <div className="ai-footer-actions">
                        <button className="back-to-token-btn" onClick={() => setShowAiView(false)}>
                            ← VOLVER AL TOKEN
                        </button>
                        <div className="ai-status">Analista: CYBER-ORACLE v3.0</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="compact-token-card">
            <div className="card-main-content">
                {/* Left Section: Identity & QR */}
                <div className="card-left-section">
                    <div className="identity-group">
                        <h2 className="token-symbol-large">{token.symbol}</h2>
                        <div className="token-name-sub">({token.name})</div>
                        <div className="official-tag">TOKEN OFICIAL</div>
                    </div>

                    <div className="qr-box">
                        <img src={techIcon} alt="Tech" className="tech-icon" />
                    </div>
                </div>

                {/* Center Section: Glowing Icon */}
                <div className="card-center-section">
                    <div className="glowing-icon-wrapper">
                        {token.logo ? (
                            <img src={token.logo} alt={token.symbol} className="center-token-logo" />
                        ) : (
                            <div className="center-token-fallback">{token.symbol.charAt(0)}</div>
                        )}
                        <div className="glow-effect"></div>
                    </div>
                </div>

                {/* Right Section: Stats & Data */}
                <div className="card-right-section">
                    <div className="price-header-ticket">
                        <span className="ticket-price">{formatPrice(token.price)}</span>
                        <span className={`ticket - change ${token.change24h && token.change24h >= 0 ? 'pos' : 'neg'} `}>
                            {token.change24h && token.change24h >= 0 ? '+' : ''}
                            {token.change24h ? token.change24h.toFixed(2) : '0.00'}% {token.change24h && token.change24h >= 0 ? '↑' : '↓'}
                        </span>
                    </div>

                    <div className="ticket-stats-grid">
                        <div className="ticket-stat-row">
                            <span className="t-label">Market Cap:</span>
                            <span className="t-value">{formatCompact(token.marketCap)}</span>
                        </div>
                        <div className="ticket-stat-row">
                            <span className="t-label">Volume:</span>
                            <span className="t-value">{formatCompact(token.volume24h)}</span>
                        </div>
                        <div className="ticket-stat-row">
                            <span className="t-label">Score:</span>
                            <span className="t-value">{displayScore}/100</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Strip */}
            <div className="card-footer-strip">
                <div className="footer-item">Puntaje: {displayScore}</div>
                <div className="footer-item launch-time">
                    <div className={`status - dot ${token.strategyId} `}></div>
                    Strategy: {strategyLabels[token.strategyId] || token.strategyId}
                </div>
                <div className="footer-item capture-time">Activo: {timeSince}</div>
            </div>

            {/* 🤖 GEMINI AI ANALYSIS - Always Visible */}
            {token.aiData?.geminiAnalysis && (
                <div className="gemini-card-analysis">
                    <div className="gemini-card-header">
                        <span className="gemini-icon">🤖</span>
                        <span className="gemini-title">Análisis Gemini AI</span>
                    </div>

                    <div className="gemini-card-content">
                        <div className="gemini-main-rec">
                            <span className={`rec-badge ${token.aiData.geminiAnalysis.recommendation.toLowerCase()}`}>
                                {token.aiData.geminiAnalysis.recommendation}
                            </span>
                            <span className="rec-confidence">
                                {token.aiData.geminiAnalysis.confidence}% confianza
                            </span>
                        </div>

                        <div className="gemini-quick-stats">
                            <div className="quick-stat">
                                <span className="stat-label">Timing:</span>
                                <span className="stat-value">{token.aiData.geminiAnalysis.entryTiming}</span>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Riesgo:</span>
                                <span className={`stat-value risk-${token.aiData.geminiAnalysis.priceAnalysis.riskLevel.toLowerCase()}`}>
                                    {token.aiData.geminiAnalysis.priceAnalysis.riskLevel}
                                </span>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Tendencia:</span>
                                <span className="stat-value">{token.aiData.geminiAnalysis.priceAnalysis.timeInUptrend}</span>
                            </div>
                        </div>

                        <div className="gemini-reasoning-compact">
                            {token.aiData.geminiAnalysis.reasoning}
                        </div>

                        {token.aiData.geminiAnalysis.keyPoints && token.aiData.geminiAnalysis.keyPoints.length > 0 && (
                            <div className="gemini-key-points-compact">
                                {token.aiData.geminiAnalysis.keyPoints.map((point: string, i: number) => (
                                    <div key={i} className="key-point-item">▸ {point}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Overlay (Optional - visible on hover or click in original, but keeping actions accessible) */}
            <button className="card-action-overlay" onClick={handleAiClick} aria-label="Analyze">
                <span className="overlay-icon">🤖</span>
            </button>
        </div>
    );
};
