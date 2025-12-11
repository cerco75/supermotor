import React from 'react';

export type SortOption = 'volume' | 'marketcap' | 'volume_mcap_ratio' | 'default';

interface SortFilterProps {
    currentSort: SortOption;
    onSortChange: (sort: SortOption) => void;
    style?: React.CSSProperties;
}

/**
 * Componente de filtro universal para clasificar tarjetas
 * Soporta: Volumen, Market Cap, Ratio Vol/MCap
 */
export const SortFilter: React.FC<SortFilterProps> = ({ currentSort, onSortChange, style }) => {
    const sortOptions: { value: SortOption; label: string; icon: string }[] = [
        { value: 'default', label: 'Por Defecto', icon: '🎯' },
        { value: 'volume', label: 'Mayor Volumen', icon: '💰' },
        { value: 'marketcap', label: 'Mayor Market Cap', icon: '📊' },
        { value: 'volume_mcap_ratio', label: 'Mayor Vol/MCap', icon: '⚡' }
    ];

    return (
        <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            ...style
        }}>
            <span style={{
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: '600',
                marginRight: '8px'
            }}>
                🔍 Ordenar por:
            </span>

            {sortOptions.map(option => (
                <button
                    key={option.value}
                    onClick={() => onSortChange(option.value)}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: currentSort === option.value
                            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                            : 'rgba(51, 65, 85, 0.5)',
                        color: currentSort === option.value ? '#fff' : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: currentSort === option.value ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: currentSort === option.value
                            ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                            : 'none'
                    }}
                    onMouseEnter={(e) => {
                        if (currentSort !== option.value) {
                            e.currentTarget.style.background = 'rgba(71, 85, 105, 0.7)';
                            e.currentTarget.style.color = '#fff';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (currentSort !== option.value) {
                            e.currentTarget.style.background = 'rgba(51, 65, 85, 0.5)';
                            e.currentTarget.style.color = '#94a3b8';
                        }
                    }}
                >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    );
};

/**
 * Función helper para aplicar el ordenamiento a un array de tokens
 */
export function applySorting<T extends {
    total_volume?: number;
    market_cap?: number;
    volume24h?: number;
    marketCap?: number;
    lastSeenVolume?: number;
    lastSeenMarketCap?: number;
}>(tokens: T[], sortOption: SortOption): T[] {
    if (sortOption === 'default') return tokens;

    return [...tokens].sort((a, b) => {
        switch (sortOption) {
            case 'volume': {
                const volA = a.total_volume || a.volume24h || a.lastSeenVolume || 0;
                const volB = b.total_volume || b.volume24h || b.lastSeenVolume || 0;
                return volB - volA;
            }
            case 'marketcap': {
                const mcapA = a.market_cap || a.marketCap || a.lastSeenMarketCap || 0;
                const mcapB = b.market_cap || b.marketCap || b.lastSeenMarketCap || 0;
                return mcapB - mcapA;
            }
            case 'volume_mcap_ratio': {
                const volA = a.total_volume || a.volume24h || a.lastSeenVolume || 0;
                const mcapA = a.market_cap || a.marketCap || a.lastSeenMarketCap || 1;
                const ratioA = mcapA > 0 ? volA / mcapA : 0;

                const volB = b.total_volume || b.volume24h || b.lastSeenVolume || 0;
                const mcapB = b.market_cap || b.marketCap || b.lastSeenMarketCap || 1;
                const ratioB = mcapB > 0 ? volB / mcapB : 0;

                return ratioB - ratioA;
            }
            default:
                return 0;
        }
    });
}
