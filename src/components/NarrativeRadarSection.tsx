import React, { useState } from 'react';
import './NarrativeRadarSection.css';

interface Agent {
    rank: number;
    name: string;
    description: string;
    mcap: string;
    score: number;
    change24h: number;
}

interface Opportunity {
    name: string;
    tag: string;
    mcap: string;
    score: number;
    change24h: number;
}

export const NarrativeRadarSection: React.FC = () => {
    // Mock data matching the screenshot style
    const agents: Agent[] = [
        { rank: 1, name: 'PIPPIN', description: 'Agent', mcap: '$244M', score: 49, change24h: 81.96 },
        { rank: 2, name: 'MAGIC', description: 'Texture', mcap: '$38.9M', score: 49, change24h: 14.23 },
        { rank: 3, name: 'PIEVERSE', description: 'Finance', mcap: '$10.4M', score: 47, change24h: 22.79 },
        { rank: 4, name: 'SENTIS', description: 'SentioAI', mcap: '$29.4M', score: 46, change24h: 20.88 },
        { rank: 5, name: 'AIOT', description: 'AIOT', mcap: '$19.4M', score: 45, change24h: 12.14 },
    ];

    const opportunities: Opportunity[] = [
        { name: 'BEAT', tag: 'GAMING', mcap: '$44.4M', score: 54, change24h: 4.4 },
        { name: 'MAGIC', tag: 'ARTIFICIAL', mcap: '$38.8M', score: 49, change24h: 14.2 },
        { name: 'PIEVERSE', tag: 'ARTIFICIAL', mcap: '$10.4M', score: 47, change24h: 22.8 },
        { name: 'PIPPIN', tag: 'ARTIFICIAL', mcap: '$244M', score: 49, change24h: 81.3 },
        { name: 'SUPER', tag: 'GAMING', mcap: '$1.4B', score: 48, change24h: 11.2 },
    ];

    return (
        <section className="narrative-radar-section">
            {/* AI AGENTS NARRATIVE HEADER */}
            <div className="narrative-header">
                <span className="icon">🤖</span>
                AI AGENTS NARRATIVE
            </div>

            {/* STATS GRID */}
            <div className="narrative-stats-grid">
                <div className="narrative-stat-card">
                    <span className="n-stat-label">Mindshare Index</span>
                    <span className="n-stat-value highlight">41.7</span>
                </div>
                <div className="narrative-stat-card">
                    <span className="n-stat-label">Market Cap</span>
                    <span className="n-stat-value">$27.37B</span>
                </div>
                <div className="narrative-stat-card">
                    <span className="n-stat-label">24h Volume</span>
                    <span className="n-stat-value">$2.79B</span>
                </div>
                <div className="narrative-stat-card">
                    <span className="n-stat-label">Avg Change</span>
                    <span className="n-stat-value positive">+2.14%</span>
                </div>
            </div>

            {/* TOP 5 AGENTS */}
            <div className="section-sub-title">
                ⚡ TOP 5 AGENTS
            </div>
            <div className="agents-list">
                {agents.map((agent) => (
                    <div className="agent-item" key={agent.rank}>
                        <span className="rank-badge">#{agent.rank}</span>
                        <div className="agent-info">
                            <span className="agent-name">{agent.name} <small>{agent.description}</small></span>
                            <span className="agent-mcap">Mcap: {agent.mcap}</span>
                        </div>
                        <span className="agent-score">{agent.score}</span>
                        <span className={`agent-change ${agent.change24h >= 0 ? 'positive' : 'negative'}`}>
                            +{agent.change24h}%
                        </span>
                    </div>
                ))}
            </div>

            {/* BEST OPPORTUNITIES */}
            <div className="section-sub-title" style={{ marginTop: '30px' }}>
                ✨ BEST OPPORTUNITIES (All Narratives)
            </div>
            <div className="opportunities-list">
                {opportunities.map((opp, idx) => (
                    <div className="opportunity-item" key={idx}>
                        <div className="opp-info">
                            <span className="opp-name">
                                {opp.name}
                                <span className="tag-badge">{opp.tag}</span>
                            </span>
                            <span className="agent-mcap">{opp.mcap} +{opp.change24h}%</span>
                        </div>
                        <span className="opp-score">{opp.score}</span>
                    </div>
                ))}
            </div>
        </section>
    );
};
