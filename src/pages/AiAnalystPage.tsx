import React, { useState, useEffect } from 'react';
import { momentumRadarService } from '../services/momentumRadarService';
import { TradingStrategy } from '../services/aiAdvisorService';
import { SectionHeader } from '../components/shared/SectionHeader';
import { SystemLogsBoard } from '../components/SystemLogsBoard';
import './AiAnalystPage.css';

export const AiAnalystPage: React.FC = () => {
    const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEducation, setShowEducation] = useState(true);

    useEffect(() => {
        loadStrategies();
        const interval = setInterval(loadStrategies, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const loadStrategies = () => {
        setLoading(true);
        try {
            // Get all tracked tokens
            const tracked = momentumRadarService.getPersistenceList();

            // Filter only those with AI strategies
            const withStrategies = tracked
                .filter(t => t.aiData?.strategy)
                .map(t => t.aiData!.strategy!)
                .filter((s): s is TradingStrategy => s !== undefined)
                .sort((a, b) => b.trendScore - a.trendScore); // Sort by trend strength

            setStrategies(withStrategies);
        } catch (error) {
            console.error('Error loading strategies:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return '#22c55e';
            case 'LATE_PULLBACK_ONLY': return '#f59e0b';
            case 'RESOLVED': return '#64748b';
            default: return '#64748b';
        }
    };

    const getTrendColor = (classification: string) => {
        if (classification.includes('Strong')) return '#22c55e';
        if (classification.includes('Weak')) return '#f59e0b';
        if (classification.includes('Downtrend')) return '#ef4444';
        return '#64748b';
    };

    const formatPrice = (price: number) => {
        if (price < 1) return `$${price.toFixed(6)}`;
        return `$${price.toFixed(2)}`;
    };

    return (
        <div className="ai-analyst-page">
            <SectionHeader icon="🧠" title="AI ANALYST - SIGNAL ROOM" accentColor="#a855f7" />

            {/* Education Block */}


            {/* Strategies Grid */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Analizando oportunidades...</p>
                </div>
            ) : strategies.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>No hay estrategias disponibles</h3>
                    <p>El AI Analyst está escaneando el mercado en busca de oportunidades de alta calidad (Score ≥ 75).</p>
                    <p className="empty-hint">💡 Las señales aparecerán aquí cuando se detecten tokens con tendencias fuertes y buena relación riesgo/beneficio.</p>
                </div>
            ) : (
                <div className="strategies-grid">
                    {strategies.map((strategy, index) => (
                        <div
                            key={`${strategy.symbol}-${index}`}
                            className="strategy-card"
                            style={{ borderLeft: `4px solid ${getStatusColor(strategy.status)}` }}
                        >
                            {/* Header */}
                            <div className="strategy-header">
                                <div className="strategy-title">
                                    <h3>{strategy.symbol}/USDT</h3>
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(strategy.status) }}
                                    >
                                        {strategy.status === 'ACTIVE' ? '🟢 ACTIVE' :
                                            strategy.status === 'LATE_PULLBACK_ONLY' ? '🟡 LATE - PULLBACK ONLY' :
                                                '⚪ RESOLVED'}
                                    </span>
                                </div>
                                <div className="strategy-meta">
                                    <span className="horizon-badge">{strategy.horizon}</span>
                                    <span className="direction-badge">{strategy.direction}</span>
                                </div>
                            </div>

                            {/* MTF Trend Indicator */}
                            <div className="trend-indicator" style={{ borderLeftColor: getTrendColor(strategy.trendClassification) }}>
                                <div className="trend-label">Tendencia Principal:</div>
                                <div className="trend-value" style={{ color: getTrendColor(strategy.trendClassification) }}>
                                    {strategy.trendClassification} ({strategy.trendTimeframe})
                                </div>
                                <div className="trend-score">Score: {strategy.trendScore}</div>
                            </div>

                            {/* Cause */}
                            <div className="strategy-cause">
                                <strong>📋 Causa:</strong> {strategy.cause}
                            </div>

                            {/* Entry Zones */}
                            <div className="entry-zones">
                                <h4>🎯 Zonas de Entrada</h4>
                                <div className="zone-list">
                                    <div className="zone-item">
                                        <span className="zone-label">Ideal:</span>
                                        <span className="zone-value">{formatPrice(strategy.entryIdeal)}</span>
                                    </div>
                                    <div className="zone-item">
                                        <span className="zone-label">Safe Zone:</span>
                                        <span className="zone-value">
                                            {formatPrice(strategy.safeZone.min)} - {formatPrice(strategy.safeZone.max)}
                                        </span>
                                    </div>
                                    <div
                                        className="zone-item pullback-zone"
                                        style={{
                                            backgroundColor: strategy.status === 'LATE_PULLBACK_ONLY' ? '#fef3c7' : 'transparent',
                                            fontWeight: strategy.status === 'LATE_PULLBACK_ONLY' ? 'bold' : 'normal'
                                        }}
                                    >
                                        <span className="zone-label">🎯 Pullback:</span>
                                        <span className="zone-value">{formatPrice(strategy.pullbackPrice)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Risk Management */}
                            <div className="risk-management">
                                <h4>⚖️ Risk Management</h4>
                                <div className="risk-grid">
                                    <div className="risk-item">
                                        <span className="risk-label">Stop Loss:</span>
                                        <span className="risk-value sl">{formatPrice(strategy.stopLoss)}</span>
                                    </div>
                                    <div className="risk-item">
                                        <span className="risk-label">TP1:</span>
                                        <span className="risk-value tp">{formatPrice(strategy.takeProfit1)}</span>
                                    </div>
                                    <div className="risk-item">
                                        <span className="risk-label">TP2:</span>
                                        <span className="risk-value tp">{formatPrice(strategy.takeProfit2)}</span>
                                    </div>
                                    <div className="risk-item">
                                        <span className="risk-label">R/R Ratio:</span>
                                        <span className="risk-value rr">1:{strategy.riskRewardRatio.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Execution Note */}
                            <div
                                className="execution-note"
                                style={{
                                    backgroundColor: strategy.status === 'LATE_PULLBACK_ONLY' ? '#fef3c7' : '#f3f4f6',
                                    borderLeft: strategy.status === 'LATE_PULLBACK_ONLY' ? '3px solid #f59e0b' : 'none'
                                }}
                            >
                                <strong>📌 Plan de Ejecución:</strong>
                                <p>{strategy.executionNote}</p>
                            </div>

                            {/* Latency Warning */}
                            <div className="latency-warning">
                                <small>ℹ️ {strategy.latencyNote}</small>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* AI Decision Logs */}
            <div className="ai-logs-section">
                <h3>🦁 AI Live Decision Logs</h3>
                <SystemLogsBoard filter="ai-only" />
            </div>
        </div>
    );
};
