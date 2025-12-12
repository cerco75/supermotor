import React, { useState } from 'react';
import './MomentumHunterPage.css';
import { marketScanner } from '../services/marketScanner';
import { quantitativeEngine } from '../services/quantitativeEngine';
import { cognitiveAnalysisService, CognitiveResult } from '../services/cognitiveAnalysisService';

export const MomentumHunterPage: React.FC = () => {
    const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0); // 0: Idle, 1: Scan, 2: Quant, 3: Cognitive/Done
    const [logs, setLogs] = useState<{ msg: string, type: string }[]>([]);
    const [finalResult, setFinalResult] = useState<CognitiveResult | null>(null);
    const [topCandidate, setTopCandidate] = useState<any>(null);

    const addLog = (msg: string, type: 'phase1' | 'phase2' | 'phase3' | 'success' | 'info' = 'info') => {
        setLogs(prev => [...prev, { msg, type }]);
    };

    const runHunterSystem = async () => {
        setPhase(1);
        setLogs([]);
        setFinalResult(null);
        setTopCandidate(null);

        try {
            // PHASE 1: MARKET SCAN
            addLog("🦁🏹 [PHASE 1] Initializing Market Scanner...", "phase1");
            const candidates = await marketScanner.scanMarket();
            addLog(`✅ Phase 1 Complete. Found ${candidates.length} candidates passing Hard Filters.`, "phase1");

            if (candidates.length === 0) {
                addLog("❌ No candidates passed Phase 1 filters. Aborting.", "phase1");
                setPhase(0);
                return;
            }

            // PHASE 2: QUANTITATIVE ANALYSIS
            setPhase(2);
            addLog("🦁🧮 [PHASE 2] Starting Quantitative Engine...", "phase2");

            // Artificial delay for UX
            await new Promise(r => setTimeout(r, 1000));

            const quantResults = await quantitativeEngine.analyzeTokens(candidates);
            const winner = quantResults[0]; // Top score 
            setTopCandidate(winner);

            addLog(`✅ Phase 2 Complete. Measured ${quantResults.length} candidates.`, "phase2");
            addLog(`🏆 TOP PICK: ${winner.token.symbol} (Momentum Score: ${winner.score}/10)`, "success");
            addLog(`   Indicators: RSI ${winner.indicators.rsi14}, MACD ${winner.indicators.macdSignal}`, "phase2");

            // PHASE 3: COGNITIVE ANALYSIS
            setPhase(3);
            addLog("🦁🧠 [PHASE 3] Engaging Cognitive Analysis (Gemini 2.0)...", "phase3");

            const cognitiveVerdict = await cognitiveAnalysisService.analyzeCandidate(winner);
            setFinalResult(cognitiveVerdict);

            addLog(`✅ Phase 3 Complete. Verdict Received.`, "phase3");
            addLog(`🦁 VERDICT: ${cognitiveVerdict.verdict}`, `verdict-${cognitiveVerdict.verdict}` as any);

        } catch (error) {
            console.error(error);
            addLog(`❌ CRITICAL ERROR: ${(error as any).message}`, "info");
            setPhase(0);
        }
    };

    return (
        <div className="momentum-hunter-page">
            <header className="hunter-header">
                <div className="hunter-title">🦁 Momentum Hunter <span style={{ fontSize: '16px', opacity: 0.6 }}>v1.0</span></div>
                <div className="hunter-subtitle">Autonomous 3-Stage Alpha Detection System</div>
            </header>

            <div className="phase-tracker">
                <div className="phase-line"></div>

                <div className={`phase-node ${phase >= 1 ? 'active' : ''} ${phase > 1 ? 'completed' : ''}`}>
                    1 <div className="phase-label">Scan</div>
                </div>
                <div className={`phase-node ${phase >= 2 ? 'active' : ''} ${phase > 2 ? 'completed' : ''}`}>
                    2 <div className="phase-label">Quant</div>
                </div>
                <div className={`phase-node ${phase >= 3 ? 'active' : ''} ${phase === 3 && finalResult ? 'completed' : ''}`}>
                    3 <div className="phase-label">Cognitive</div>
                </div>
            </div>

            <div className="hunter-action-area">
                <button
                    className="scan-btn"
                    onClick={runHunterSystem}
                    disabled={phase !== 0 && phase !== 3}
                >
                    {phase === 0 || phase === 3 ? 'INITIATE HUNT' : 'HUNTING...'}
                </button>
            </div>

            <div className="hunter-console">
                {logs.length === 0 && <div style={{ opacity: 0.3, textAlign: 'center', marginTop: '40px' }}>Awaiting command link...</div>}
                {logs.map((log, i) => (
                    <div key={i} className={`console-line ${log.type}`}>
                        {log.type === 'phase1' && '🏹 '}
                        {log.type === 'phase2' && '🧮 '}
                        {log.type === 'phase3' && '🧠 '}
                        {log.msg}
                    </div>
                ))}
            </div>

            {finalResult && topCandidate && (
                <div className="result-card">
                    <div className="result-header">
                        <div className="result-symbol">{topCandidate.token.symbol} <span style={{ fontSize: '12px', color: '#94a3b8' }}>${topCandidate.token.priceUsd.toFixed(6)}</span></div>
                        <div className="result-score">Momentum Score: {topCandidate.score}</div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <div className="plan-label">OPPORTUNITY ANALYSIS</div>
                        <p style={{ fontSize: '14px', lineHeight: '1.5' }}>{finalResult.analysisOpportunity}</p>
                    </div>

                    {finalResult.verdict === 'COMPRAR' && finalResult.riskPlan && (
                        <div className="plan-grid">
                            <div className="plan-item" style={{ borderLeft: '2px solid #ef4444' }}>
                                <div className="plan-label">STOP LOSS</div>
                                <div className="plan-value text-red-400">{finalResult.riskPlan.stopLoss}</div>
                            </div>
                            <div className="plan-item" style={{ borderLeft: '2px solid #22c55e' }}>
                                <div className="plan-label">TAKE PROFIT 1</div>
                                <div className="plan-value text-green-400">{finalResult.riskPlan.takeProfit1}</div>
                            </div>
                            <div className="plan-item" style={{ borderLeft: '2px solid #22c55e' }}>
                                <div className="plan-label">TAKE PROFIT 2</div>
                                <div className="plan-value text-green-400">{finalResult.riskPlan.takeProfit2}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
