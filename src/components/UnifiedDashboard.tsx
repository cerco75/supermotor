import React, { useState, useEffect } from 'react';

import { MotorRadarSection } from './MotorRadarSection';
import { SolanaRadarSection } from './SolanaRadarSection';
import { momentumRadarService } from '../services/momentumRadarService';
import { SystemLogsBoard } from './SystemLogsBoard';
import { NarrativeRadarSection } from './NarrativeRadarSection';
import { AiAnalystPage } from '../pages/AiAnalystPage';
import { TurboHunterPage } from '../pages/TurboHunterPage'; // 🚀 CEX Turbo
import { MomentumHunterPage } from '../pages/MomentumHunterPage';
import './UnifiedDashboard.css';

export const UnifiedDashboard: React.FC = () => {
    const [alertCount] = useState(2);
    const [isServiceRunning, setIsServiceRunning] = useState(false);
    const [isAutoSearchEnabled, setIsAutoSearchEnabled] = useState(false);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching-motor' | 'searching-solana' | 'searching-both'>('idle');
    const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null);
    const [currentPage, setCurrentPage] = useState<'dashboard' | 'ai-analyst' | 'hunter' | 'turbo'>('dashboard');

    useEffect(() => {
        // Initialize and start momentumRadarService on mount
        const initializeServices = async () => {
            try {
                console.log('🚀 Initializing Momentum Radar Service...');
                await momentumRadarService.start();
                setIsServiceRunning(true);
                console.log('✅ Momentum Radar Service started successfully');
            } catch (error) {
                console.error('❌ Failed to start Momentum Radar Service:', error);
            }
        };

        initializeServices();

        // Cleanup on unmount
        // Note: We don't stop service as it might be needed by background tasks
        return () => {
            // momentumRadarService.stop(); 
        };
    }, []);

    // ... (rest of search logic same) ...
    // Auto-search effect (every 2 minutes)
    useEffect(() => {
        if (!isAutoSearchEnabled) return;

        const autoSearchInterval = setInterval(() => {
            handleSearchBoth();
        }, 2 * 60 * 1000); // 2 minutes

        return () => clearInterval(autoSearchInterval);
    }, [isAutoSearchEnabled]);

    const handleSearchMotor = async () => {
        setSearchStatus('searching-motor');
        try {
            console.log('🔍 Searching Motor Radar...');
            await momentumRadarService.runCycle();
            setLastSearchTime(new Date());
            console.log('✅ Motor Radar search complete');
        } catch (error) {
            console.error('❌ Motor Radar search failed:', error);
        } finally {
            setSearchStatus('idle');
        }
    };

    const handleSearchSolana = async () => {
        setSearchStatus('searching-solana');
        try {
            console.log('🔍 Searching Global Radar (All Chains)...');
            // Use global filter to search all tokens
            momentumRadarService.setChainFilter(null);
            await momentumRadarService.runCycle();
            setLastSearchTime(new Date());
            console.log('✅ Global Radar search complete');
        } catch (error) {
            console.error('❌ Global Radar search failed:', error);
        } finally {
            setSearchStatus('idle');
        }
    };

    const handleSearchBoth = async () => {
        setSearchStatus('searching-both');
        try {
            console.log('🔍 Searching Global Radar (All Chains)...');
            // Always use global filter to get all tokens
            momentumRadarService.setChainFilter(null);
            await momentumRadarService.runCycle();

            setLastSearchTime(new Date());
            console.log('✅ Global Radar search complete');
        } catch (error) {
            console.error('❌ Search failed:', error);
        } finally {
            setSearchStatus('idle');
        }
    };

    const handleRefresh = async () => {
        console.log('🔄 Manual refresh triggered');
        await handleSearchBoth();
    };

    const toggleAutoSearch = () => {
        setIsAutoSearchEnabled(!isAutoSearchEnabled);
        if (!isAutoSearchEnabled) {
            // Start immediately when enabled
            handleSearchBoth();
        }
    };

    return (
        <div className="unified-dashboard">
            {/* Search Control Panel - now serves as the main nav */}
            <div className="search-control-panel">
                <button
                    className={`search-btn ${isAutoSearchEnabled ? 'active' : ''}`}
                    onClick={toggleAutoSearch}
                >
                    {isAutoSearchEnabled ? '⏹️' : '▶️'} Auto (2m)
                </button>

                <button
                    className={`search-btn ${currentPage === 'ai-analyst' ? 'active-page' : ''}`}
                    onClick={() => setCurrentPage('ai-analyst')}
                >
                    🧠 AI Analyst
                </button>

                <button
                    className={`search-btn ${currentPage === 'dashboard' ? 'active-page' : ''}`}
                    onClick={() => setCurrentPage('dashboard')}
                >
                    📊 Radar
                </button>

                <button
                    className={`search-btn ${currentPage === 'hunter' ? 'active-page' : ''}`}
                    onClick={() => setCurrentPage('hunter')}
                    style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
                >
                    🦁 Hunter
                </button>

                <button
                    className={`search-btn ${currentPage === 'turbo' ? 'active-page' : ''}`}
                    onClick={() => setCurrentPage('turbo')}
                    style={{ color: '#0ecb81', borderColor: '#0ecb81' }}
                >
                    🚀 CEX Turbo
                </button>
            </div>

            <main className="dashboard-content">
                {currentPage === 'ai-analyst' && <AiAnalystPage />}

                {currentPage === 'hunter' && <MomentumHunterPage />}

                {currentPage === 'turbo' && <TurboHunterPage />}

                {currentPage === 'dashboard' && (
                    isServiceRunning ? (
                        <>
                            <MotorRadarSection onRefresh={handleRefresh} />
                            <SolanaRadarSection onRefresh={handleRefresh} />
                            <NarrativeRadarSection />
                        </>
                    ) : (
                        <div className="initializing-state">
                            <div className="spinner"></div>
                            <p>Initializing services...</p>
                        </div>
                    )
                )}

                {/* 📊 SYSTEM LOGS */}
                {currentPage === 'dashboard' && <SystemLogsBoard />}
            </main>
        </div>
    );
};
