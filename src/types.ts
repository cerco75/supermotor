
export interface StrategyPerformance {
  winRate: number;
  avgProfit: number;
  totalTrades: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  timeframe: string;
}

export interface SocialMetrics {
  hypeScore: number;
  sentiment: 'Neutral' | 'Bullish' | 'Euphoric' | 'Fear' | 'Panic';
  dominance: 'Retail' | 'Institutional';
  socialVolume: 'Low' | 'Medium' | 'High' | 'Viral';
  galaxyScore?: number;
  altRank?: number;
  isRealData?: boolean;
  source?: string;
  contrarianScore?: number;
  euphoriaType?: 'NONE' | 'EARLY_EUPHORIA' | 'LATE_EUPHORIA' | 'NORMAL';
  // Hunter specific
  twitterMentions24h?: number;
  twitterGrowthRate?: number;
  telegramMembers?: number;
  telegramActiveRate?: number;
}

export interface TimeframeData {
  change: number;
  momentum: 'STRONG_BULL' | 'WEAK_BULL' | 'NEUTRAL' | 'WEAK_BEAR' | 'STRONG_BEAR' | 'NEUTRAL';
}

export interface SupportResistance {
  support: number;
  resistance: number;
  volatility: number;
  range_percent: number;
}

export interface DetectedPattern {
  name: 'BULL_FLAG' | 'DOUBLE_BOTTOM' | 'CUP_HANDLE' | 'V_SHAPE' | 'NONE';
  probability: number; // 0-100 correlation
  description: string;
}

export interface FractalAnalysis {
  tf_1h?: TimeframeData;
  tf_24h?: TimeframeData;
  tf_7d?: TimeframeData;
  levels_30d?: SupportResistance;
  confluence_score: number;
  verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' | 'STRONG_SELL';
  detected_pattern?: DetectedPattern;
}

export interface MicrostructureMetrics {
  vwap: number;
  orderImbalance: number;
  buyingPressure: 'HIGH' | 'MODERATE' | 'NEUTRAL' | 'SELLING_ABSORPTION';
  aggressorSide: 'BUYER' | 'SELLER' | 'NEUTRAL';
  interpretation: string;
}

export interface OrderBookAnalysis {
  bidDepth: number;
  askDepth: number;
  imbalance: number;
  spread: number;
  spreadQuality: 'TIGHT' | 'NORMAL' | 'WIDE';
  verdict: 'BALANCED' | 'STRONG_SUPPORT' | 'SELL_WALL' | 'WEAK_SUPPORT';
  buyWallPrice?: number;
  sellWallPrice?: number;
  isSpoofing: boolean;
  spoofingConfidence: 'HIGH' | 'LOW';
  rawAsks?: [string, string][];
  microstructure?: MicrostructureMetrics;
}

export interface VolumeAnalysis {
  pattern: 'ACCELERATION' | 'DECELERATION' | 'SPIKE_ISOLATED' | 'FLAT';
  obvDivergence: 'PRICE_UP_OBV_DOWN' | 'PRICE_DOWN_OBV_UP' | 'ALIGNED';
  concentrationTop: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL' | 'DANGER';
}

export interface MevAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  sandwichProbability: number;
  message: string;
  slippageWarning: boolean;
}

export interface BearishThesis {
  thesis: string;
  keyRisks: string[];
  invalidationLevel: number;
}

export interface InfluencerAlert {
  person: 'Elon Musk' | 'CZ (Binance)' | 'Vitalik Buterin' | 'Justin Sun' | 'Michael Saylor';
  platform: 'X (Twitter)';
  type: 'HYPE' | 'FUD' | 'NEWS';
  text: string;
  impact_score: number;
  timestamp: number;
}

export interface SmartTradeSetup {
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  reason: string;
  entryZone?: { min: number; max: number };
}

export interface SlippageEstimate {
  expectedPrice: number;
  slippagePercent: number;
  impactCost: number;
  isHighRisk: boolean;
}

export interface TailRiskProfile {
  riskLevel: 'NEGLIGIBLE' | 'MODERATE' | 'HIGH' | 'EXTREME';
  crashProbability: number;
  var95: number;
  recommendation: string;
}

export interface DerivativesData {
  fundingRate: number;
  annualizedRate: number;
  openInterest?: number;
  signal: 'SHORT_SQUEEZE_RISK' | 'LONG_SQUEEZE_RISK' | 'NEUTRAL' | 'ARBITRAGE_OP';
  interpretation: string;
}

export interface TimeBias {
  currentHour: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  winRateAtHour: number;
  avgReturnAtHour: number;
  description: string;
}

export interface VolatilityForecast {
  currentVolatility: number;
  predictedVolatility: number;
  volatilityChange: number;
  regime: 'STABLE' | 'RISING_RISK' | 'EXPLOSIVE_RISK' | 'COOLING_DOWN';
  message: string;
}

export interface VolumeProfileBreakout {
  breakoutStrength: number;
  resistanceVolume: number;
  currentVolume: number;
  isVacuum: boolean;
  message: string;
}

export interface CorrelationPivot {
  asset: string;
  correlationBtc: number;
  status: 'COUPLED' | 'DECOUPLED_BULL' | 'DECOUPLED_BEAR' | 'INVERSE';
  description: string;
}

export interface OnChainSignal {
  id: string;
  symbol: string;
  chain: 'ETH' | 'SOL' | 'BSC' | 'BTC';
  amountUsd: number;
  type: 'INFLOW' | 'OUTFLOW' | 'TRANSFER';
  fromAddress: string;
  toAddress: string;
  timestamp: number;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
  label: string;
}

export type FactorKey =
  | 'ALIGNED_WITH_BTC'
  | 'REGIME_BULL'
  | 'REGIME_BEAR'
  | 'OVERSOLD_ENTRY'
  | 'OVERBOUGHT_ENTRY'
  | 'HIGH_VOLUME'
  | 'MEME_NARRATIVE'
  | 'HIGH_RR_SETUP';

export interface FactorStats {
  key: FactorKey;
  description: string;
  withFactor: { count: number; wins: number; avgProfit: number };
  withoutFactor: { count: number; wins: number; avgProfit: number };
  edgeDelta: number;
}

export interface SignalSnapshot {
  pressure?: number;
  momentum?: number;
  marketCap?: number;
  whale?: boolean;
  btcAligned: boolean;
  extremeZone: boolean;
  volumeSpike: boolean;
  highRR: boolean;
  titanVerified: boolean;
  trendFollower: boolean;
  rsiAtEntry?: number;
  assetTrendAtEntry?: 'BULL' | 'BEAR' | 'SIDEWAYS';
  btcTrendAtEntry?: 'BULL' | 'BEAR' | 'SIDEWAYS';
  regimeAtEntry?: string;
  distanceToSupportPct?: number;
  distanceToResistancePct?: number;
  volumeMultiple24h?: number;
  isMemeNarrative?: boolean;
}

export interface ProbabilityWeights {
  baseWinRate: number;
  factors: {
    btcAligned: number;
    extremeZone: number;
    volumeSpike: number;
    highRR: number;
    titanVerified: number;
    trendFollower: number;
  };
  lastCalibrated: number;
}

export interface GenesisStrategy {
  id: string;
  name: string;
  logic_code: string;
  birth_timestamp: number;
  origin_context: string;
  status: 'INCUBATING' | 'ACTIVE' | 'DEAD' | 'LEGEND';
  stats: {
    trades: number;
    wins: number;
    losses: number;
    pnl_virtual: number;
    win_rate: number;
  };
}

// --- HUNTER ENGINE V3 TYPES ---
export type MemecoinPhase = 'STEALTH' | 'ACCUMULATION' | 'PRE_BREAKOUT' | 'BREAKOUT' | 'MOMENTUM';

export interface OnChainMetrics {
  holderCount: number;
  whaleConcentration: number; // % in top 10 (0-1)
  liquidityUSD: number;
  volume24h: number;
  volumeToMcapRatio: number;
  newHolders24h: number;
  holderGrowthRate: number; // % growth
  smartMoneyFlow: number; // USD
  dexPairs: number;
  contractAgeHours: number;
  isHoneypot?: boolean;
  liquidityLocked?: boolean;
}

export interface PositionRecommendation {
  allocationPct: number;
  positionValueUSD: number;
  tokensToBuy: number;
  maxLossUSD: number;
  targetProfitUSD: number;
}

export interface MemecoinSignal {
  symbol: string;
  confidence: number;
  potentialMultiplier: number;
  riskScore: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  catalysts: string[];
  timeframe: MemecoinPhase;
  timestamp: number;
  recommendation?: PositionRecommendation;
}

// Legacy compatibility + New
export interface Signal {
  id: string;
  medio: string;
  titulo: string;
  frase_clave: string;
  activo: string;
  token_name?: string;  // NEW: Full token name (e.g., "Pepe the Frog" instead of "PEPE")
  chain_id?: string;    // NEW: Blockchain chain ID (e.g., "solana", "base", "ethereum")
  fecha_articulo: string;
  precio_suelo: number;
  precio_24h: number | null;
  precio_72h: number | null;
  precio_7d: number | null;
  precio_30d: number | null;
  rebote_24h: number | null;
  rebote_72h: number | null;
  rebote_7d: number | null;
  rebote_30d: number | null;
  clasificacion: 'Confirmado' | 'Dudoso' | 'Falso' | 'Pendiente';
  created_at: string;
  article_url?: string;
  current_price?: number;
  is_live_data?: boolean;
  is_test?: boolean;
  exact_quote?: string;
  confidence_score?: number;
  sniper_score?: number;
  neural_confidence?: number;
  snapshot?: SignalSnapshot;
  confidence_reason?: string;
  markov_probability?: number;
  is_24h_gainer?: boolean;
  is_early_opportunity?: boolean;
  is_lifting_off?: boolean;
  is_new_discovery?: boolean;
  is_domino_effect?: boolean;
  is_wick_hunter?: boolean;
  is_squeeze?: boolean;
  is_vampire?: boolean;
  is_binance_next?: boolean;
  is_silent_spiral?: boolean;
  is_silent_accumulation?: boolean;
  is_active_momentum?: boolean;
  volume_turnover_ratio?: number;
  is_overheated?: boolean;
  is_wash_trading?: boolean;
  is_lone_wolf?: boolean;
  is_low_liquidity?: boolean;
  is_zombie?: boolean;
  price_change_7d?: number;
  price_change_1h?: number;
  quality_grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  acceleration_status?: 'ACCELERATING' | 'CRUISING' | 'DECELERATING' | 'STALLING' | 'DUMPING';
  volume_trend_score?: number;
  trend_alignment?: 'SUPER_BULL' | 'BULL_REVERSAL' | 'BEAR_RALLY' | 'SUPER_BEAR' | 'MIXED';
  strategy_performance?: StrategyPerformance;
  social_metrics?: SocialMetrics;
  pivot_points?: {
    s1: number;
    r1: number;
    pivot: number;
    trend_bias: 'Bullish' | 'Bearish';
  };
  fractal_analysis?: FractalAnalysis;
  order_book_analysis?: OrderBookAnalysis;
  confluence_factors?: string[];
  trend_health?: 'Bullish' | 'Bearish' | 'Neutral';
  news_sentiment?: number;
  news_catalyst_type?: 'Regulatory' | 'Technical' | 'Partnership' | 'Macro' | 'Hype' | 'Noise';
  technical_analysis?: {
    rsi: number;
    rsi_divergence: 'Bullish' | 'Bearish' | 'Neutral';
    volume_24h: number;
    volume_avg_20d: number;
    volume_spike_ratio: number;
    is_whale_activity: boolean;
  };
  logo_url?: string;
  chain?: string;
  is_hot_pick?: boolean;
  contract_address?: string;
  liquidity_usd?: number;
  fdv?: number;
  market_cap?: number;
  dex_url?: string;
  trade_plan?: {
    entry: number;
    stop_loss: number;
    take_profit: number;
    risk_reward_ratio?: number;
  };
  velocity_score?: number;
  volume_velocity?: number;
  volume_efficiency?: number;
  is_breakout?: boolean;
  is_crypto_com_listed?: boolean;
  influencer_alert?: InfluencerAlert;
  signal_age_days?: number;
  pressure_zone?: 'Red' | 'Orange' | 'Green';
  cap_range_label?: string;
  micro_description?: string;
  exchange_icon?: 'Binance' | 'CDC' | 'Tier2';
  quant_analysis?: {
    momentum_status: 'CLEAN_ENTRY' | 'CONTINUATION' | 'NO_ENTRY' | 'DANGER';
    pattern_detected: 'V_SHAPE' | 'BREAKOUT' | 'CONSOLIDATION' | 'DOWNTREND' | 'NONE';
    overheat_score: number;
    historical_sim?: string;
    time_radar?: string;
    move_magnitude?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EPIC';
    regime_change?: { changed: boolean; confidence: number; action: string };
  };
  phantom_analysis?: {
    has_gap: boolean;
    gap_percent: number;
    message: string;
  };
  volume_analysis?: VolumeAnalysis;
  titan_analysis?: {
    winRate: number;
    avgReturn: number;
    signalCount: number;
    badge?: string;
  };
  tail_risk?: TailRiskProfile;
  derivatives_data?: DerivativesData;
  time_bias?: TimeBias;
  volatility_forecast?: VolatilityForecast;
  volume_profile_breakout?: VolumeProfileBreakout;
  correlation_pivot?: CorrelationPivot;
  on_chain_signal?: OnChainSignal;

  // HUNTER V3 PRO INTEGRATION
  hunter_signal?: MemecoinSignal;
  on_chain_metrics?: OnChainMetrics; // Raw metrics

  contract_security?: {
    is_honeypot: boolean;
    buy_tax: number;
    sell_tax: number;
    can_mint: boolean;
    ownership_renounced: boolean;
  };

  result?: {
    pnl: number;
    outcome: 'WIN' | 'LOSS';
  };
}

export interface Stats {
  acierto_por_pais: Record<string, number>;
  acierto_por_activo: Record<string, number>;
  rebotes_mas_fuertes: Signal[];
}

export interface AlertPreferences {
  userId: string;
  strongReboundsOnly: boolean;
  allSignals: boolean;
}

export interface TaxConfig {
  mode: 'FLAT_RATE' | 'SPAIN_PROGRESSIVE' | 'Generic';
  flatRate: number;
  region: string;
}

export type TradingMode = 'STANDARD' | 'PRO' | 'GOLD' | 'AGGRESSIVE' | 'NO_FILTER';

export interface UserProfile {
  userId: string;
  preferredCurrencies: string[];
  followedAssets: string[];
  language: string;
  timezone: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  openAiApiKey?: string;
  lunarCrushApiKey?: string;
  cryptoCompareApiKey?: string;
  geminiApiKey?: string;
  isProMode?: boolean;
  tradingMode?: TradingMode;
  telegramConfig?: {
    highConfidenceOnly: boolean;
    followedAssetsOnly: boolean;
    confirmedOnly: boolean;
  };
  taxConfig?: TaxConfig;
  financialGoal?: {
    name: string;
    targetAmount: number;
  };
}

export interface BacktestConfig {
  initialCapital: number;
  periodYears: number;
  selectedAssets: string[];
}

export interface BacktestResult {
  equityCurve: { date: string; strategy: number; benchmark: number }[];
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  trades: {
    id: string;
    asset: string;
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    profitPercent: number;
    profitAmount: number;
  }[];
}

export interface PortfolioPosition {
  id: string;
  asset: string;
  entryPrice: number;
  amount: number;
  quantity: number;
  entryDate: string;
  isOpen: boolean;
  signalId?: string;
  aiStopLoss?: number;
  aiTakeProfit?: number;
  logo_url?: string;
  isTrailing: boolean;
  trailingPercent?: number;
  highestPriceReached?: number;
  currentPrice?: number;
  currentVal?: number;
  exitPrice?: number;
  exitDate?: string;
  autoClosedReason?: 'TP_HIT' | 'SL_HIT' | 'MANUAL';
  feesPaid?: number;
  slippagePercent?: number;
  realEntryPrice?: number;
  // NEW: LEARNING LOOP DATA
  entryIndicators?: { [key: string]: number };
}

export interface PortfolioStats {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  winRate: number;
  bestTrade: { symbol: string; pnl: number };
  worstTrade: { symbol: string; pnl: number };
  openPositionsCount: number;
}

export interface MarketCycle {
  season: 'Winter' | 'Spring' | 'Summer' | 'Autumn';
  stage: 'Accumulation' | 'Recovery' | 'Euphoria' | 'Correction';
  clock_position: number;
  action: 'COMPRA (DCA)' | 'MANTENER' | 'TOMAR GANANCIAS' | 'ESPERAR' | 'BUSCAR ALTS';
  description: string;
}

export interface HistoricalEvent {
  date: string;
  event: string;
  sentiment: string;
  price: number;
}

export interface GenerateInsightResponse {
  recommendation: string;
  stopLoss: string;
  riskEstimated: string;
  sentiment: string;
  summary: string;
}

export interface DailyBriefingResponse {
  greeting: string;
  marketStatus: string;
  portfolioInsight: string;
  actionTip: string;
}

export interface EnsembleAnalysis {
  votes: {
    smart_score: { value: 'BUY' | 'SELL' | 'NEUTRAL', confidence: number };
    neural_net: { value: 'BUY' | 'SELL' | 'NEUTRAL', confidence: number };
    fractal: { value: 'BUY' | 'SELL' | 'NEUTRAL', confidence: number };
    order_book: { value: 'BUY' | 'SELL' | 'NEUTRAL', confidence: number };
    social: { value: 'BUY' | 'SELL' | 'NEUTRAL', confidence: number };
    on_chain?: { value: 'BUY' | 'SELL' | 'NEUTRAL', confidence: number };
  };
  agreement_score: number;
  consensus_verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' | 'AVOID';
  implication: string;
  riskScore: number;
  riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
  vetoReasons: string[];
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  published_on: number;
  imageurl?: string;
  body?: string;
  tags?: string;
}

export interface CorrelationData {
  assetA: string;
  assetB: string;
  correlation: number;
}

export type MarketRegime = 'SIDEWAYS_CHOP' | 'EXTREME_VOLATILITY' | 'BULL_TREND' | 'BEAR_TREND';

export interface PerformanceMetricsData {
  grades: {
    'A+': { winRate: number; totalSignals: number; avgGain: number; wins: number };
    'A': { winRate: number; totalSignals: number; avgGain: number; wins: number };
    'B': { winRate: number; totalSignals: number; avgGain: number; wins: number };
  };
  totalTracked: number;
  globalWinRate: number;
  currentStreak: number;
  avgMaxDrawdown: number;
  avgWinDuration: number;
}

export interface TrackedSignal {
  id: string;
  asset: string;
  timestamp: number;
  entryPrice: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  outcome: 'PENDING' | 'WIN' | 'LOSS';
  profitPercent?: number;
  priceAfter72h?: number;
  maxPriceReached?: number;
  maxDrawdown?: number;
  durationHours?: number;
  snapshot?: SignalSnapshot;
}

export interface AccuracyTrendPoint {
  date: string;
  accuracy: number;
}

export interface SystemHealth {
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  totalSignals: number;
  lastCalibration: string;
  winRate: number;
  winRateAPlus: number;
  warnings: { level: 'INFO' | 'WARNING' | 'CRITICAL'; message: string }[];
}

export interface MarketTicker {
  market: {
    name: string;
    identifier: string;
    has_trading_incentive: boolean;
    logo?: string;
  };
  base: string;
  target: string;
  last: number;
  volume: number;
  trust_score: string | null;
  trade_url: string;
  is_anomaly: boolean;
}

export interface RiskState {
  mode: 'NORMAL' | 'RECOVERY' | 'DEFENSIVE';
  penaltyMultiplier: number;
  reason?: string;
  recoveryEndsAt?: number;
}

// --- NEURAL COUNCIL V2 TYPES ---
export interface NeuralMeta {
  schema_version: 'neural-2.0';
  engine_version: 'ensemble-v3.5';
  timestamp: number;
}

export interface LiveUserProfile {
  risk_tolerance: 'Conservative' | 'Normal' | 'Aggressive' | 'Hunter';
  portfolio_health: 'Healthy' | 'Caution' | 'Critical Drawdown';
  metrics: {
    total_balance: number;
    current_drawdown_pct: number;
    open_risk_usd: number;
    open_risk_pct: number;
    max_allowed_risk_pct: number;
  };
}

export interface AgentVote {
  agent_name: 'RiskAgent' | 'TrendAgent' | 'TitanAgent' | 'HunterAgent';
  verdict: 'APPROVE' | 'BLOCK' | 'CAUTION';
  reason: string;
  weight: number;
}

export interface DeepAssetAnalysis {
  ticker: string;
  price: number;
  signal_id: string;
  council_votes: AgentVote[];
  final_consensus: 'EXECUTABLE' | 'REJECTED';
  technical_details: {
    gem_score: number;
    divergences: string[];
    risk_reward: number;
  };
}

export interface NeuralContext {
  meta: NeuralMeta;
  mode: string;
  user_profile: LiveUserProfile;
  market_environment: {
    btcTrend: number;
    regime: MarketRegime;
    macro_analysis?: {
      sp500_trend: 'Bullish' | 'Bearish' | 'Neutral';
      gold_trend: 'Bullish' | 'Bearish' | 'Neutral';
      dxy_strength: 'Weak' | 'Strong' | 'Neutral';
      risk_on: boolean;
    }
  };
  analysis_focus: DeepAssetAnalysis[];
}
