import React, { useEffect, useRef, useState } from 'react';
import { momentumRadarService, LogEntry } from '../services/momentumRadarService';
import './SystemLogsBoard.css';

interface SystemLogsBoardProps {
    filter?: 'all' | 'ai-only';
}

export const SystemLogsBoard: React.FC<SystemLogsBoardProps> = ({ filter = 'all' }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState({ alertsSent: 0, lastScan: '-' });
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Initial logs (mock for visual structure until real logs flow)
    useEffect(() => {
        // Subscribe to real service logs
        const unsubscribe = momentumRadarService.subscribeToLogs((log) => {
            // FILTER LOGIC
            if (filter === 'ai-only') {
                // Only show logs with Lion emoji OR explicit success/warn from AI
                const isAiLog = log.message.includes('🦁');
                if (!isAiLog) return;
            }
            setLogs(prev => [...prev.slice(-99), log]); // Keep last 100
        });

        // Also update stats periodically
        const interval = setInterval(() => {
            const lastScanDate = momentumRadarService.lastScanTime;
            setStats({
                alertsSent: momentumRadarService.alertsSentCount,
                lastScan: lastScanDate ? lastScanDate.toLocaleTimeString() : '-'
            });
        }, 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    // Auto-scroll
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleClear = () => {
        setLogs([]);
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="system-logs-board">
            {filter === 'all' && (
                <div className="logs-dashboard-stats">
                    <div className="log-stat-card">
                        <div className="log-stat-label">Alertas Enviadas</div>
                        <div className="log-stat-value highlight">{stats.alertsSent}</div>
                    </div>
                    <div className="log-stat-card">
                        <div className="log-stat-label">Último Scan</div>
                        <div className="log-stat-value success">{stats.lastScan}</div>
                    </div>
                </div>
            )}

            <div className="logs-header">
                <span className="logs-title">{filter === 'ai-only' ? '🦁 AI Decision Logs' : 'System Logs'}</span>
                <button className="logs-clear-btn" onClick={handleClear}>Clear</button>
            </div>

            <div className="logs-content">
                {logs.length === 0 && (
                    <div className="log-entry">
                        <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span>
                        <span className="log-message" style={{ opacity: 0.5 }}>Waiting for system activity...</span>
                    </div>
                )}

                {logs.map((log, index) => (
                    <div key={`${log.timestamp}-${index}`} className={`log-entry`}>
                        <span className="log-timestamp">[{formatTime(log.timestamp)}]</span>
                        <span className={`log-message log-type-${log.type}`}>
                            {getIcon(log.type)} {log.message}
                        </span>
                    </div>
                ))}
                <div ref={logsEndRef} className="scroll-anchor" />
            </div>
        </div>
    );
};

function getIcon(type: string): string {
    switch (type) {
        case 'info': return 'ℹ️';
        case 'success': return '✅';
        case 'warn': return '⚠️';
        case 'error': return '❌';
        case 'system': return '🦁';
        default: return '•';
    }
}
