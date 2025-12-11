import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.motorradar.app',
    appName: 'Motor Radar',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: "#020617",
            showSpinner: true,
            spinnerColor: "#38bdf8"
        }
    }
};

export default config;
