
// Minimal mock/stub for trackingService if it's used for complex portfolio tracking
// The technicalService might import it.
export const trackingService = {
    getTrackedTokens: () => [],
    addToken: (token: any) => console.log('Added token to tracking (mock)', token),
    removeToken: (symbol: string) => console.log('Removed token (mock)', symbol)
};
