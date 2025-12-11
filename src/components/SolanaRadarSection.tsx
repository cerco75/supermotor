import React, { useState, useEffect } from 'react';
import { SectionHeader } from './shared/SectionHeader';
import { Badge } from './shared/Badge';
import { momentumRadarService } from '../services/momentumRadarService';
import { CompactTokenCard } from './CompactTokenCard';
import './SolanaRadarSection.css';
import './SolanaHexHeader.css';
import './TokenDetailCard.css';

interface SolanaToken {
    rank: number;
    symbol: string;
    name: string;
    logo?: string;
    price: number;
    change1h: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    consecutiveHours: number;
    entryTimestamp: number;
    strategyId?: 'standard' | 'micro_velocity' | 'pre_ignition' | 'accumulation';
    preIgnitionScore?: number;
    score?: number;
    creationDate?: number;
    tradeUrl?: string;
    contractAddress?: string;
}

interface SolanaRadarSectionProps {
    onRefresh?: () => void;
}

export const SolanaRadarSection: React.FC<SolanaRadarSectionProps> = ({ onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'standard' | 'micro_velocity' | 'pre_ignition' | 'accumulation'>('standard');
    const [tokens, setTokens] = useState<SolanaToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
    const [expandedToken, setExpandedToken] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<Record<string, string>>({});

    const fetchSolanaTokens = async () => {
        try {
            setLoading(true);

            // Use global filter (no chain-specific filtering)
            // momentumRadarService.setChainFilter(null); // Already set globally

            // Get tokens for current strategy
            const persistenceList = momentumRadarService.getPersistenceList(activeTab);

            // Convert to SolanaToken format
            const tokenData: SolanaToken[] = persistenceList.slice(0, 10).map((track, index) => ({
                rank: index + 1,
                symbol: track.symbol,
                name: track.name,
                logo: track.logo,
                price: track.lastSeenPrice,
                change1h: track.lastSeenChange1h,
                change24h: track.lastSeenChange24h,
                volume24h: track.lastSeenVolume,
                marketCap: track.lastSeenMarketCap,
                consecutiveHours: track.consecutiveHours,
                entryTimestamp: track.entryTimestamp,
                strategyId: track.strategyId,
                preIgnitionScore: track.preIgnitionScore,
                score: track.score || track.preIgnitionScore || 0,
                creationDate: track.creationDate,
                tradeUrl: track.tradeUrl,
                contractAddress: track.contractAddress
            }));

            setTokens(tokenData);
            setLastScanTime(new Date());
        } catch (error) {
            console.error('Error fetching Solana tokens:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSolanaTokens();

        // Auto-refresh every 15 seconds
        const interval = setInterval(fetchSolanaTokens, 15000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const handleRefresh = () => {
        fetchSolanaTokens();
        onRefresh?.();
    };

    const formatPrice = (price: number) => {
        if (price < 0.0001) return `$${price.toFixed(8)}`;
        if (price < 1) return `$${price.toFixed(6)}`;
        return `$${price.toFixed(4)}`;
    };

    const formatChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    };

    const formatVolume = (vol: number) => {
        if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
        if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
        if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
        return `$${vol.toFixed(0)}`;
    };

    const getHoursColor = (hours: number) => {
        if (hours >= 6) return '#ef4444';
        if (hours >= 3) return '#f59e0b';
        if (hours >= 2) return '#22c55e';
        return '#3b82f6';
    };

    const formatDuration = (startTs: number) => {
        const diffMs = Date.now() - startTs;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours === 0) return `${mins}M`;
        return `${hours}H ${mins}M`;
    };

    const formatDate = (ts?: number) => {
        if (!ts) return 'N/A';
        return new Date(ts).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    return (
        <section className="solana-radar-section">
            <div className="solana-custom-header">
                <div className="hex-logo-container">
                    <div className="hex-outer-ring"></div>
                    <div className="hex-inner-ring">
                        <div className="hex-content">
                            <h1 className="solana-lite-title">Solana<br /><span className="lite-text">Lite</span></h1>
                        </div>
                    </div>
                    {/* Tech decors */}
                    <div className="tech-decor top-left"></div>
                    <div className="tech-decor bottom-right"></div>
                </div>

                <div className="solana-chain-status">
                    <span className="status-icon">⚡</span>
                    <span className="status-label">CHAIN: ACTIVE</span>
                </div>
            </div>

            {/* Strategy Tabs */}
            <div className="radar-tabs">
                <button
                    className={`tab ${activeTab === 'standard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('standard')}
                >
                    🦁 Standard
                </button>
                <button
                    className={`tab ${activeTab === 'micro_velocity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('micro_velocity')}
                >
                    ⚡ Micro Velocity
                </button>
                <button
                    className={`tab ${activeTab === 'pre_ignition' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pre_ignition')}
                >
                    🍲 Pre-Ignition
                </button>
                <button
                    className={`tab ${activeTab === 'accumulation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accumulation')}
                >
                    🧲 Accumulation
                </button>
            </div>

            {/* Scan Info */}
            {lastScanTime && (
                <div className="scan-info">
                    <span className="scan-time">Último scan: {lastScanTime.toLocaleTimeString()}</span>
                    <span className="scan-count">{tokens.length} tokens encontrados</span>
                </div>
            )}

            {/* Token Table */}
            {/* Token Cards Grid (Mobile First + Neumorphic) */}
            <div className="solana-token-table-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Scanning Solana network...</p>
                    </div>
                ) : tokens.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📡</div>
                        <p>Radar esperando señal...</p>
                        <p className="empty-hint">El motor está escaneando la red Solana</p>
                    </div>
                ) : (
                    <div className="token-cards-grid">
                        {tokens.map((token) => (
                            <CompactTokenCard
                                key={token.symbol}
                                token={{
                                    symbol: token.symbol,
                                    name: token.name,
                                    logo: token.logo,
                                    entryTimestamp: token.entryTimestamp,
                                    price: token.price,
                                    change1h: token.change1h,
                                    change24h: token.change24h,
                                    marketCap: token.marketCap,
                                    volume24h: token.volume24h,
                                    score: token.score,
                                    strategyId: token.strategyId || 'standard',
                                    tradeUrl: token.tradeUrl || (token.contractAddress ? `https://dexscreener.com/solana/${token.contractAddress}` : undefined)
                                }}
                                aiAnalysis={analysisResult[token.symbol]}
                                onAskAI={() => {
                                    // Helper to map UI token to Track interface
                                    const mockTrack: any = {
                                        symbol: token.symbol,
                                        lastSeenPrice: token.price,
                                        lastSeenChange1h: token.change1h,
                                        lastSeenChange24h: token.change24h
                                    };
                                    const advice = momentumRadarService.getTechnicalAnalysis(mockTrack);
                                    setAnalysisResult(prev => ({ ...prev, [token.symbol]: advice }));
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            {tokens.length > 0 && (
                <div className="solana-stats">
                    <div className="stat-card">
                        <div className="stat-label">Total Gems</div>
                        <div className="stat-value">{tokens.length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Alertas Activas</div>
                        <div className="stat-value">{tokens.filter(t => t.consecutiveHours >= 3).length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg Change 1h</div>
                        <div className="stat-value positive">
                            +{(tokens.reduce((sum, t) => sum + t.change1h, 0) / tokens.length).toFixed(2)}%
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
