import React, { useState, useEffect } from 'react';
import { SectionHeader } from './shared/SectionHeader';
import { momentumRadarService } from '../services/momentumRadarService';
import { CompactTokenCard } from './CompactTokenCard';
import './MotorRadarSection.css';
import './MotorSquareHeader.css';
import './TokenDetailCard.css';

interface Token {
    rank: number;
    symbol: string;
    name: string;
    logo?: string;
    price: number;
    change1h: number;
    consecutiveHours?: number;
    marketCap?: number;
    volume24h?: number;
    entryTimestamp?: number;
    score?: number;
    creationDate?: number;
    tradeUrl?: string;
    aiData?: {
        score: number;
        isMatch: boolean;
        reason: string;
    };
    change24h: number; // Add this
}

interface MotorRadarSectionProps {
    onRefresh?: () => void;
}

export const MotorRadarSection: React.FC<MotorRadarSectionProps> = ({ onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'standard' | 'standard_radar' | 'pre_ignition' | 'accumulation'>('standard_radar');
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedToken, setExpandedToken] = useState<string | null>(null);

    const fetchTokens = async () => {
        try {
            setLoading(true);

            // Map tab to strategy ID
            const strategyMap: Record<string, 'standard' | 'micro_velocity' | 'pre_ignition' | 'accumulation'> = {
                'standard': 'standard',
                'standard_radar': 'micro_velocity',
                'pre_ignition': 'pre_ignition',
                'accumulation': 'accumulation'
            };

            const strategy = strategyMap[activeTab];
            const persistenceList = momentumRadarService.getPersistenceList(strategy);

            // Convert to Token format
            const tokenData: Token[] = persistenceList.slice(0, 5).map((track, index) => ({
                rank: index + 1,
                symbol: track.symbol,
                name: track.name,
                logo: track.logo,
                price: track.lastSeenPrice,
                change1h: track.lastSeenChange1h,
                change24h: track.lastSeenChange24h,
                consecutiveHours: track.consecutiveHours,
                marketCap: track.lastSeenMarketCap,
                volume24h: track.lastSeenVolume,
                entryTimestamp: track.entryTimestamp,
                score: track.score || track.preIgnitionScore || 0,
                creationDate: track.creationDate,
                tradeUrl: track.tradeUrl,
                aiData: track.aiData
            }));

            setTokens(tokenData);
        } catch (error) {
            console.error('Error fetching tokens:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTokens();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchTokens, 30000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const handleRefresh = () => {
        fetchTokens();
        onRefresh?.();
    };

    const handleAskAI = (symbol: string) => {
        const strategy = {
            'standard': 'standard',
            'standard_radar': 'micro_velocity',
            'pre_ignition': 'pre_ignition',
            'accumulation': 'accumulation'
        }[activeTab] as 'standard' | 'micro_velocity' | 'pre_ignition' | 'accumulation';

        const persistenceList = momentumRadarService.getPersistenceList(strategy);
        const track = persistenceList.find(t => t.symbol === symbol);

        if (track) {
            const analysis = momentumRadarService.getTechnicalAnalysis(track);
            alert(analysis);
        } else {
            alert(`No tracking data available for ${symbol}`);
        }
    };

    const formatPrice = (price: number) => {
        if (price < 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(2)}`;
    };

    const formatChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    };

    const formatVolume = (vol?: number) => {
        if (!vol) return '-';
        if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
        if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
        if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
        return `$${vol.toFixed(0)}`;
    };

    const formatDuration = (startTs?: number) => {
        if (!startTs) return '-';
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
        <section className="motor-radar-section">
            <div className="motor-custom-header">
                <div className="square-logo-container">
                    {/* Tech Frame SVG - Recreated from reference image */}
                    <svg className="square-frame-svg" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Outer thin pink/purple line with dots */}
                        <path d="M20 20 H120 M180 20 H280 V120 M280 180 V280 H180 M120 280 H20 V180 M20 120 V20" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                        <circle cx="20" cy="20" r="3" fill="#c084fc" />
                        <circle cx="280" cy="20" r="3" fill="#c084fc" />
                        <circle cx="280" cy="280" r="3" fill="#c084fc" />
                        <circle cx="20" cy="280" r="3" fill="#c084fc" />

                        {/* Inner Cyan Tech Shape */}
                        <path d="M50 80 L80 50 H220 L250 80 V220 L220 250 H80 L50 220 V80 Z" stroke="#22d3ee" strokeWidth="2.5" className="path-anim" />

                        {/* Additional decorative lines */}
                        <path d="M40 100 V200" stroke="#f472b6" strokeWidth="1.5" />
                        <path d="M260 100 V200" stroke="#f472b6" strokeWidth="1.5" />
                        <path d="M100 40 H200" stroke="#f472b6" strokeWidth="1.5" />
                        <path d="M100 260 H200" stroke="#f472b6" strokeWidth="1.5" />

                        {/* Connecting dots */}
                        <circle cx="40" cy="150" r="2" fill="#22d3ee" />
                        <circle cx="260" cy="150" r="2" fill="#22d3ee" />
                    </svg>

                    <div className="motor-title-content">
                        <h1 className="motor-radar-title">Motor<br />Radar</h1>
                    </div>
                </div>

                <div className="motor-status">
                    <span className="status-icon-shield">🛡️</span>
                    <span className="status-label">STATUS: OPTIMAL</span>
                </div>
            </div>

            <div className="radar-tabs">
                <button
                    className={`tab ${activeTab === 'standard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('standard')}
                >
                    Standard
                </button>
                <button
                    className={`tab ${activeTab === 'standard_radar' ? 'active' : ''}`}
                    onClick={() => setActiveTab('standard_radar')}
                >
                    Micro Velocity
                </button>
                <button
                    className={`tab ${activeTab === 'pre_ignition' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pre_ignition')}
                >
                    Pre-Ignition
                </button>
                <button
                    className={`tab ${activeTab === 'accumulation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accumulation')}
                >
                    🧲 Accumulation
                </button>
            </div>

            <div className="token-table-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Scanning market...</p>
                    </div>
                ) : tokens.length === 0 ? (
                    <div className="empty-state">
                        <p>No tokens found for {activeTab.replace('_', ' ')}.</p>
                        <p className="empty-hint">Engine is scanning...</p>
                    </div>
                ) : (
                    <div className="token-cards-grid">
                        {tokens.map((token) => (
                            <CompactTokenCard
                                key={token.symbol}
                                token={{
                                    symbol: token.symbol,
                                    name: token.name,
                                    price: token.price,
                                    change1h: token.change1h,
                                    change24h: token.change24h,
                                    logo: token.logo,
                                    entryTimestamp: token.entryTimestamp, // Pass entryTimestamp
                                    marketCap: token.marketCap,
                                    volume24h: token.volume24h,
                                    score: token.score,
                                    strategyId: activeTab === 'standard_radar' ? 'micro_velocity' : activeTab,
                                    tradeUrl: token.tradeUrl
                                }}
                                onAskAI={handleAskAI}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="price-grid">
                <div className="price-column">
                    <h3 className="price-column-title">Precio 21 1h</h3>
                    {tokens.slice(0, 4).map((token, index) => (
                        <div key={`21-${index}`} className="price-item">
                            <span className="price-icon">S</span>
                            <span className="price-token">{token.symbol}</span>
                            <span className="price-value">{formatPrice(token.price)}</span>
                        </div>
                    ))}
                </div>

                <div className="price-column">
                    <h3 className="price-column-title">Precio 24 1h</h3>
                    {tokens.slice(0, 4).map((token, index) => (
                        <div key={`24-${index}`} className="price-item">
                            <span className="price-icon">S</span>
                            <span className="price-token">{token.symbol}</span>
                            <span className="price-value">{formatPrice(token.price)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
