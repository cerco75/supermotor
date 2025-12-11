
// Minimal mock for apiService to avoid dragging in the whole Axios/Auth/User stack
export const apiService = {
    post: async (url: string, data: any) => {
        // For Telegram, we might just log it or use window.fetch if needed directly
        // But the original code likely used this for backend proxy. 
        // Since we are "Lite" and maybe want direct execution or keep it compatible:
        console.log(`[MockAPI] POST ${url}`, data);
        return { data: { success: true } };
    },
    get: async (url: string) => {
        console.log(`[MockAPI] GET ${url}`);
        return { data: {} };
    }
};
