/**
 * CDC Background Runner Service
 * 
 * Este servicio permite controlar la ejecución en segundo plano del Motor Alerta CDC
 * usando @capacitor/background-runner para Android.
 * 
 * El background runner se configura en capacitor.config.json y ejecuta
 * el script en public/runners/cdcRadar.js
 */

import { BackgroundRunner, DispatchEventOptions } from '@capacitor/background-runner';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { App, AppState } from '@capacitor/app';

interface CDCBackgroundState {
    isEnabled: boolean;
    lastRunTimestamp: number;
    lastCheckTimestamp: number;
}

const CDC_BG_STATE_KEY = 'wg_cdc_bg_state';
const CDC_TRACKING_KEY = 'wg_cdc_momentum_radar_v3';

/**
 * Servicio para manejar la ejecución en segundo plano del motor CDC
 */
export const cdcBackgroundRunner = {
    /**
     * Inicializa el background runner y configura listeners
     */
    async initialize(): Promise<void> {
        try {
            console.log('🦁🔧 Initializing CDC Background Runner...');

            // Solicitar permisos de notificaciones
            const notifPermissions = await LocalNotifications.requestPermissions();
            console.log('🦁 Notification permissions:', notifPermissions.display);

            // Listener para cuando la app va a background/foreground
            App.addListener('appStateChange', async (state: AppState) => {
                if (!state.isActive) {
                    // App going to background - dispatch tracking data
                    await this.syncTrackingDataToRunner();
                    console.log('🦁 App went to background - CDC Radar continues in background');
                } else {
                    // App came to foreground
                    console.log('🦁 App came to foreground');
                }
            });

            // Listener para notificaciones del background runner
            BackgroundRunner.addListener('backgroundRunnerNotificationReceived', (notification) => {
                console.log('🦁 Background notification received:', notification);
            });

            console.log('🦁✅ CDC Background Runner initialized');
        } catch (error) {
            console.error('🦁❌ Failed to initialize background runner:', error);
        }
    },

    /**
     * Sincroniza los datos de tracking al runner de background
     * Esto permite que el runner tenga acceso a los tokens en seguimiento
     */
    async syncTrackingDataToRunner(): Promise<void> {
        try {
            // Obtener datos de tracking desde localStorage
            const trackingDataRaw = localStorage.getItem(CDC_TRACKING_KEY);
            if (!trackingDataRaw) {
                console.log('🦁 No tracking data to sync');
                return;
            }

            const trackingData = JSON.parse(trackingDataRaw);

            // También guardar en Preferences para que sea accesible en background
            await Preferences.set({
                key: CDC_TRACKING_KEY,
                value: trackingDataRaw
            });

            console.log(`🦁 Synced ${Object.keys(trackingData.tracking || {}).length} tokens to background storage`);
        } catch (error) {
            console.error('🦁 Error syncing tracking data:', error);
        }
    },

    /**
     * Dispara un evento personalizado en el background runner
     */
    async dispatchEvent(event: string, data?: any): Promise<any> {
        try {
            const options: DispatchEventOptions = {
                label: 'com.wealthguardian.cdc.radar',
                event: event,
                details: data || {}
            };

            const result = await BackgroundRunner.dispatchEvent(options);
            console.log(`🦁 Dispatched event '${event}':`, result);
            return result;
        } catch (error) {
            console.error(`🦁 Error dispatching event '${event}':`, error);
            throw error;
        }
    },

    /**
     * Dispara una verificación de alertas en el background
     */
    async triggerCheck(): Promise<any> {
        // Obtener datos de tracking
        const trackingDataRaw = localStorage.getItem(CDC_TRACKING_KEY);
        const trackingData = trackingDataRaw ? JSON.parse(trackingDataRaw) : {};

        return await this.dispatchEvent('cdcRadarCheck', {
            trackingData
        });
    },

    /**
     * Dispara un escaneo completo en el background
     */
    async triggerScan(): Promise<any> {
        return await this.dispatchEvent('cdcRadarScan', {});
    },

    /**
     * Habilita o deshabilita el escaneo en segundo plano
     */
    async setEnabled(enabled: boolean): Promise<void> {
        try {
            const state = await this.getState();
            state.isEnabled = enabled;
            await this.saveState(state);

            if (enabled) {
                await this.syncTrackingDataToRunner();
                console.log('🦁✅ Background scanning ENABLED');
            } else {
                console.log('🦁⏸️ Background scanning DISABLED');
            }
        } catch (error) {
            console.error('Error setting background state:', error);
        }
    },

    /**
     * Obtiene el estado actual del background runner
     */
    async getState(): Promise<CDCBackgroundState> {
        try {
            const { value } = await Preferences.get({ key: CDC_BG_STATE_KEY });
            if (value) {
                return JSON.parse(value);
            }
        } catch (e) {
            console.warn('Could not load CDC background state');
        }
        return {
            isEnabled: true, // Enabled by default
            lastRunTimestamp: 0,
            lastCheckTimestamp: 0
        };
    },

    /**
     * Guarda el estado del background runner
     */
    async saveState(state: CDCBackgroundState): Promise<void> {
        try {
            await Preferences.set({
                key: CDC_BG_STATE_KEY,
                value: JSON.stringify(state)
            });
        } catch (e) {
            console.error('Failed to save CDC background state:', e);
        }
    },

    /**
     * Verifica si el background runner está activo
     */
    async isEnabled(): Promise<boolean> {
        const state = await this.getState();
        return state.isEnabled;
    },

    /**
     * Obtiene el tiempo desde la última ejecución
     */
    async getLastRunInfo(): Promise<{ timestamp: number; minutesAgo: number }> {
        const state = await this.getState();
        const minutesAgo = state.lastRunTimestamp > 0
            ? Math.floor((Date.now() - state.lastRunTimestamp) / 60000)
            : -1;
        return {
            timestamp: state.lastRunTimestamp,
            minutesAgo
        };
    },

    /**
     * Actualiza el timestamp de última ejecución
     */
    async updateLastRun(): Promise<void> {
        const state = await this.getState();
        state.lastRunTimestamp = Date.now();
        await this.saveState(state);
    },

    /**
     * Verificar permisos del background runner
     */
    async checkPermissions(): Promise<any> {
        try {
            return await BackgroundRunner.checkPermissions();
        } catch (error) {
            console.error('🦁 Error checking permissions:', error);
            return { geolocation: 'denied', notifications: 'denied' };
        }
    },

    /**
     * Solicitar permisos del background runner
     */
    async requestPermissions(): Promise<any> {
        try {
            return await BackgroundRunner.requestPermissions({
                apis: ['notifications']
            });
        } catch (error) {
            console.error('🦁 Error requesting permissions:', error);
            return { geolocation: 'denied', notifications: 'denied' };
        }
    }
};
