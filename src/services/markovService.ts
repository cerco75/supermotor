import { standardDeviation, mean } from 'simple-statistics';

// State definitions for the Markov Chain
export enum MarketState {
  ACCUMULATION = 'ACCUMULATION',        // Low vol, sideways
  BULLISH_TREND = 'BULLISH_TREND',      // Steady uptrend
  BEARISH_TREND = 'BEARISH_TREND',      // Steady downtrend
  EUPHORIA = 'EUPHORIA',                // Parabolic pump (High Vol + High Uptrend)
  PANIC = 'PANIC',                      // Crash (High Vol + High Downtrend)
  UNCERTAIN = 'UNCERTAIN'               // No clear pattern
}

export interface MarkovPrediction {
  currentState: MarketState;
  predictedNextState: MarketState;
  transitionProbability: number;
  probabilities: Record<MarketState, number>; // Full row of probabilities
}

/**
 * Advanced Markov Chain Service for Market Regime Detection.
 * Used by MemeHunter, MomentumRadar, and CDC Engines.
 */
export const markovService = {

  /**
   * Main entry point for engines.
   * Analyzes a standardized array of price points (e.g., sparkline or history)
   * and returns the Markov prediction for the next state.
   * 
   * @param priceHistory Array of prices (numbers), sorted oldest to newest. Min length 10.
   */
  analyzeMarketState(priceHistory: number[]): MarkovPrediction {
    if (!priceHistory || priceHistory.length < 10) {
      return this.getFallbackPrediction();
    }

    // 1. Convert Price History to State History
    const states = this.convertToStates(priceHistory);

    // 2. Build Transition Matrix
    const matrix = this.buildTransitionMatrix(states);

    // 3. Get Current State (Last known state)
    const currentState = states[states.length - 1];

    // 4. Predict Next State based on Current State row in Matrix
    const probabilities = matrix[currentState] || this.getUniformProbabilities();

    // Find state with highest probability
    let bestState = MarketState.UNCERTAIN;
    let maxProb = -1;

    for (const [state, prob] of Object.entries(probabilities)) {
      const numericProb = prob as number;
      if (numericProb > maxProb) {
        maxProb = numericProb;
        bestState = state as MarketState;
      }
    }

    return {
      currentState,
      predictedNextState: bestState,
      transitionProbability: maxProb,
      probabilities: probabilities as Record<MarketState, number>
    };
  },

  /**
   * Converts raw price data into a sequence of Market States.
   * Uses volatility and trend slope to determine state.
   */
  convertToStates(prices: number[]): MarketState[] {
    const states: MarketState[] = [];
    const windowSize = 5; // Look at small windows to determine local state

    for (let i = windowSize; i < prices.length; i++) {
      const window = prices.slice(i - windowSize, i + 1);
      states.push(this.classifyWindow(window));
    }

    return states;
  },

  /**
   * Classifies a small window of prices into a single State.
   */
  classifyWindow(window: number[]): MarketState {
    const start = window[0];
    const end = window[window.length - 1];
    const changePct = ((end - start) / start) * 100;

    // Volatility Calculation (Standard Deviation normalized by mean)
    let vol = 0;
    try {
      vol = standardDeviation(window) / mean(window);
    } catch (e) {
      vol = 0; // handle simple-statistics error on flat line
    }

    const HIGH_VOL_THRESHOLD = 0.02; // 2% variability implies high action

    // Classification Logic
    if (Math.abs(changePct) < 0.5 && vol < HIGH_VOL_THRESHOLD) {
      return MarketState.ACCUMULATION;
    }

    if (changePct > 3.0 && vol > HIGH_VOL_THRESHOLD) {
      return MarketState.EUPHORIA; // Quick pump
    }

    if (changePct < -3.0 && vol > HIGH_VOL_THRESHOLD) {
      return MarketState.PANIC; // Quick dump
    }

    if (changePct > 0.5) {
      return MarketState.BULLISH_TREND;
    }

    if (changePct < -0.5) {
      return MarketState.BEARISH_TREND;
    }

    return MarketState.ACCUMULATION; // Fallback
  },

  /**
   * Builds the Transition Probability Matrix from a sequence of states.
   * Returns: { FROM_STATE: { TO_STATE_A: 0.2, TO_STATE_B: 0.8 } }
   */
  buildTransitionMatrix(states: MarketState[]): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};
    const counts: Record<string, number> = {};

    // Initialize empty matrix
    for (const s1 of Object.values(MarketState)) {
      matrix[s1] = {};
      counts[s1] = 0;
      for (const s2 of Object.values(MarketState)) {
        matrix[s1][s2] = 0;
      }
    }

    // Count transitions
    for (let i = 0; i < states.length - 1; i++) {
      const current = states[i];
      const next = states[i + 1];

      if (!matrix[current]) matrix[current] = {}; // Safety
      if (!matrix[current][next]) matrix[current][next] = 0;

      matrix[current][next]++;
      counts[current]++;
    }

    // Normalize counts to probabilities
    for (const fromState of Object.keys(matrix)) {
      const total = counts[fromState];
      if (total > 0) {
        for (const toState of Object.keys(matrix[fromState])) {
          matrix[fromState][toState] /= total;
        }
      } else {
        // If state never occurred, assume uniform or "stay same" probability
        // For simplicity, we give 100% to staying in same state to avoid noise
        matrix[fromState][fromState] = 1.0;
      }
    }

    return matrix;
  },

  getUniformProbabilities(): Record<MarketState, number> {
    return {
      [MarketState.ACCUMULATION]: 0.2,
      [MarketState.BULLISH_TREND]: 0.2,
      [MarketState.BEARISH_TREND]: 0.2,
      [MarketState.EUPHORIA]: 0.2,
      [MarketState.PANIC]: 0.2,
      [MarketState.UNCERTAIN]: 0
    };
  },

  getFallbackPrediction(): MarkovPrediction {
    return {
      currentState: MarketState.ACCUMULATION,
      predictedNextState: MarketState.ACCUMULATION,
      transitionProbability: 0.0,
      probabilities: this.getUniformProbabilities()
    };
  },

  // --- LEGACY / HELPER METHODS (Preserved for existing calls if any) ---

  // Original simulation method - kept for UI compatibility if needed
  async simulateMarkov(asset: string): Promise<number> {
    // Return a simulated high-confidence value for UI "Wow" factor
    return 85.5;
  }
};
