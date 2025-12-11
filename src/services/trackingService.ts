
// Minimal mock/stub for trackingService
// Used by technicalService to get weighting configuration
export const trackingService = {
    getTrackedTokens: () => [],
    addToken: (token: any) => console.log('Added token to tracking (mock)', token),
    removeToken: (symbol: string) => console.log('Removed token (mock)', symbol),
    getWeights: () => ({
        pressure: 20,
        momentum: 20,
        marketCap: 15,
        whale: 25,
        volume: 20
    })
};
