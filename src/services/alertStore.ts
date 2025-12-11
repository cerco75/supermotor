export type AlertSeverity = 'info' | 'warning' | 'error';

export interface DashboardAlert {
    id: string;
    title: string;
    message: string;
    severity: AlertSeverity;
    timestamp: number;
    type?: string;       // Optional: alert type
    symbol?: string;     // Optional: crypto symbol
}

const alerts: DashboardAlert[] = [];

export const addDashboardAlert = (alert: Omit<DashboardAlert, 'id'>) => {
    const id = `${alert.title}-${Date.now()}`;
    alerts.unshift({ ...alert, id });
    // Dispatch event for UI reactivity
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wg_new_alert'));
    }
};

export const getDashboardAlerts = (): DashboardAlert[] => [...alerts];

export const clearDashboardAlerts = () => {
    alerts.length = 0;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wg_new_alert'));
    }
};
